#!/usr/bin/env node
/**
 * telegram-bridge - the interactive gate adapter (core/GATE-ADAPTERS.md).
 *
 * Watches the queue and reports; pushes cards to the operator's chat; turns
 * their taps and replies back into file moves, instructions and agent re-runs.
 *
 * Transport: long-polling by default (no public URL needed, sub-second in
 * practice). Set TELEGRAM_WEBHOOK_URL to run webhook mode instead; behavior
 * is identical.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN   required
 *   TELEGRAM_DRY_RUN=1   log every send instead of calling the API (for tests)
 * Config (binding/TOOLS.md, "## Gate adapter" section):
 *   chat_id, on_approve (scheduled | trigger-next)
 * Guardrails (binding/GUARDRAILS.md):
 *   max_bridge_pings_per_day, quiet_hours, rework_cycles_per_item_per_day
 *
 *   node _host/telegram-bridge.mjs           run
 *   node _host/telegram-bridge.mjs --once    single scan+poll cycle (for tests)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync,
         readdirSync, renameSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execSync } from 'node:child_process';
import { atomicWrite, runActive } from '../tools/lib/safe-fs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const Q = (p) => join(ROOT, 'state', '_QUEUE', p);
const REPORTS = join(ROOT, 'state', 'reports');
const SEEN = join(ROOT, '_host', '.bridge-seen.json');
const ONCE = process.argv.includes('--once');
const DRY = process.env.TELEGRAM_DRY_RUN === '1';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API = `https://api.telegram.org/bot${TOKEN}`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function readConfig() {
  const cfg = { chat_id: '', on_approve: 'scheduled',
                max_pings: 10, quiet: null, rework_cap: 5, max_concurrent: 3 };
  try {
    const tools = readFileSync(join(ROOT, 'binding', 'TOOLS.md'), 'utf8');
    cfg.chat_id   = tools.match(/chat_id:\s*(\S+)/)?.[1] ?? '';
    cfg.on_approve = tools.match(/on_approve:\s*(\S+)/)?.[1] ?? 'scheduled';
  } catch {}
  // env beats file, so the chat id can stay out of version control entirely
  cfg.chat_id = process.env.TELEGRAM_CHAT_ID ?? cfg.chat_id;
  try {
    const g = readFileSync(join(ROOT, 'binding', 'GUARDRAILS.md'), 'utf8');
    cfg.max_pings  = Number(g.match(/max_bridge_pings_per_day:\s*(\d+)/)?.[1] ?? 10);
    cfg.rework_cap = Number(g.match(/rework_cycles_per_item_per_day:\s*(\d+)/)?.[1] ?? 5);
    cfg.max_concurrent = Number(g.match(/max_concurrent_agents:\s*(\d+)/)?.[1] ?? 3);
    const q = g.match(/quiet_hours:\s*"?(\d{2}:\d{2})-(\d{2}:\d{2})"?/);
    if (q) cfg.quiet = [q[1], q[2]];
  } catch {}
  return cfg;
}

// ---------------------------------------------------------------------------
// State: what we already sent, message->card routing, ping + rework counters
// ---------------------------------------------------------------------------

function loadSeen() {
  try { return JSON.parse(readFileSync(SEEN, 'utf8')); }
  catch { return { sent: {}, route: {}, offset: 0, pings: {}, rework: {}, digest: [] }; }
}
const state = loadSeen();
const saveSeen = () => {
  // prune before every save so the seen-file cannot grow without bound:
  // day-keyed counters older than 7 days, sent-markers whose card left
  // pending, and all but the newest 200 message routes.
  const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  for (const k of Object.keys(state.pings))  if (k < cutoff) delete state.pings[k];
  for (const k of Object.keys(state.rework)) if (k.slice(-10) < cutoff) delete state.rework[k];
  for (const k of Object.keys(state.sent))
    if (!existsSync(Q(join('pending', k))) && !existsSync(join(REPORTS, k))) delete state.sent[k];
  const routes = Object.keys(state.route);
  for (const k of routes.slice(0, Math.max(0, routes.length - 200))) delete state.route[k];
  writeFileSync(SEEN, JSON.stringify(state, null, 2));
};

const today = () => new Date().toISOString().slice(0, 10);
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16);

function inQuietHours(cfg) {
  if (!cfg.quiet) return false;
  const now = new Date().toTimeString().slice(0, 5);
  const [a, b] = cfg.quiet;
  return a < b ? (now >= a && now < b) : (now >= a || now < b);
}

// ---------------------------------------------------------------------------
// Telegram API (thin)
// ---------------------------------------------------------------------------

async function tg(method, payload, filePath) {
  if (DRY) {
    console.log(`[dry] ${method}`, JSON.stringify(payload).slice(0, 300));
    return { ok: true, result: method === 'getUpdates' ? [] : { message_id: Date.now() } };
  }
  let res;
  if (filePath) {
    const form = new FormData();
    for (const [k, v] of Object.entries(payload)) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    form.set('photo', new Blob([readFileSync(filePath)]), basename(filePath));
    res = await fetch(`${API}/${method}`, { method: 'POST', body: form });
  } else {
    res = await fetch(`${API}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  const json = await res.json();
  if (!json.ok) console.error(`[bridge] ${method} failed:`, json.description);
  return json;
}

// ---------------------------------------------------------------------------
// Outbound: cards and reports -> chat
// ---------------------------------------------------------------------------

function summaryOf(text) {
  const m = text.match(/SUMMARY:\s*\n([\s\S]*?)\nEND SUMMARY/);
  return (m ? m[1] : text.slice(0, 1500)).trim();
}

function assetsOf(text, cardDir) {
  // Image paths referenced by the card, existing on this disk.
  // Security boundary: only files under state/ ever leave this machine. A card
  // is model-written text; without this check a bad path in a card would ship
  // an arbitrary readable file to the chat.
  const STATE = resolve(ROOT, 'state');
  const out = [];
  for (const m of text.matchAll(/(?:^|\s)((?:[A-Za-z]:)?[\w./\\-]+\.(?:png|jpe?g))\b/g)) {
    const p = m[1];
    for (const candidate of [join(ROOT, p), join(cardDir, p), p]) {
      const abs = resolve(candidate);
      if (abs.startsWith(STATE + sep) && existsSync(abs)) { out.push(abs); break; }
    }
  }
  return [...new Set(out)].slice(0, 4);
}

async function pushCard(cfg, file) {
  const text = readFileSync(file, 'utf8');
  const summary = summaryOf(text);
  const key = basename(file);

  // Verification gate: a content card must carry the verifier's VERIFIED block
  // before it goes for approval, so the operator never decides on an unchecked
  // claim. Cards that are not content (manual-post steps, indexing/aeo fill-in
  // tables, re-plans, audits) are exempt by prefix. An unverified content card
  // is still shown, but bannered, so nothing silts if the verifier is off.
  const needsVerify = /^(social|blog|copyedit|faqsync|visual)-/i.test(key);
  const verified = /^VERIFIED:/m.test(text) || / VERIFIED:/m.test(text);
  const banner = (needsVerify && !verified)
    ? '⚠ UNVERIFIED (verifier has not checked this yet)\n\n' : '';

  const body = text.length > 3500 ? text.slice(0, 3500) + '\n[...full card in queue]' : text;
  const assets = assetsOf(text, dirname(file));

  const kb = { inline_keyboard: [[
    { text: 'Approve', callback_data: `ok:${key}` },
    { text: 'Reject',  callback_data: `no:${key}` },
  ]] };

  // guardrail: ping budget and quiet hours -> digest instead of ping
  const n = state.pings[today()] ?? 0;
  const silent = inQuietHours(cfg) || n >= cfg.max_pings;
  if (n === cfg.max_pings) await tg('sendMessage', { chat_id: cfg.chat_id,
    text: `Ping budget for today reached; further cards arrive silently. /digest lists them.` });

  for (const a of assets) await tg('sendPhoto', { chat_id: cfg.chat_id, disable_notification: silent }, a);
  const sent = await tg('sendMessage', {
    chat_id: cfg.chat_id, text: `${banner}${summary}\n\n${body}`.slice(0, 4000),
    reply_markup: kb, disable_notification: silent,
  });

  state.pings[today()] = n + 1;
  state.sent[key] = true;
  if (sent?.result?.message_id) state.route[sent.result.message_id] = key;
  saveSeen();
}

async function pushReport(cfg, file) {
  const key = basename(file);
  const text = readFileSync(file, 'utf8').slice(0, 3800);
  await tg('sendMessage', {
    chat_id: cfg.chat_id,
    text: `⚠ ${key}\n\n${text}\n\nReply to this message to instruct the agent.`,
    disable_notification: inQuietHours(cfg),
  });
  state.sent[key] = true; saveSeen();
}

async function scanOutbound(cfg) {
  // SEQUENTIAL on purpose. The ping budget and quiet-hours guard read and write
  // a shared per-day counter; a concurrent Promise.all lets every send read the
  // same pre-increment value and the ceiling never trips. One card at a time
  // also keeps the chat order sane and is plenty fast at real queue sizes.
  for (const f of readdirSync(Q('pending')).filter(f => f.endsWith('.md') && f !== 'README.md')) {
    if (state.sent[f]) continue;
    // settle guard: an agent may still be writing this card; a half card on a
    // phone is a decision made on missing information. Next scan gets it.
    if (Date.now() - statSync(Q(join('pending', f))).mtimeMs < 3000) continue;
    await pushCard(cfg, Q(join('pending', f)));
  }
  if (existsSync(REPORTS))
    for (const f of readdirSync(REPORTS).filter(f => /^(BLOCKED|ALERT)-.*\.md$/.test(f)))
      if (!state.sent[f]) await pushReport(cfg, join(REPORTS, f));
}

// ---------------------------------------------------------------------------
// Inbound: taps and replies -> file moves, instructions, re-runs
// ---------------------------------------------------------------------------

function agentOf(cardName, cardText) {
  // Authoritative source: an `owner:` line the agent wrote into the card
  // (contract requires it). The filename prefix table is only a fallback for
  // hand-made or legacy cards, because a slug-named file has no reliable prefix.
  const owned = cardText && cardText.match(/^owner:\s*([\w-]+)\s*$/m)?.[1];
  if (owned) return owned;
  const p = cardName.split(/[-.]/)[0].toLowerCase();
  const map = { social: 'social-drafter', visual: 'social-visual', links: 'link-applier',
                blog: 'content-drafter', copyedit: 'copy-editor', faqsync: 'faq-syncer',
                replan: 'conductor', audit: 'monthly-audit', aeo: 'aeo-trend',
                indexing: 'indexing-checker', manual: 'social-publisher',
                blocked: cardName.match(/^BLOCKED-([\w-]+)-\d{4}/i)?.[1] };
  return map[p] ?? cardName.match(/^[A-Z]+-([\w-]+)-\d{4}/)?.[1] ?? null;
}

/**
 * What fires immediately after an approval, when on_approve is trigger-next.
 * Keyed by card kind: approving copy sends the item to the visual stage,
 * approving visuals sends it to the publisher, approving a re-plan lets the
 * conductor apply it. Kinds with no downstream simply wait for the schedule.
 */
function downstreamOf(cardName) {
  const p = cardName.split(/[-.]/)[0].toLowerCase();
  return { social: 'social-visual', visual: 'social-publisher',
           replan: 'conductor', links: 'link-applier' }[p] ?? null;
}

function instruct(agent, text, re) {
  const dir = Q('instructions'); mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `${agent}.md`),
    `\n## ${stamp()}\nINSTRUCT: ${text}\n(re: ${re})\n`);
}

async function relaunch(agent, cfg, itemKey) {
  // Rework cap is PER ITEM per day (a looping card cannot exhaust the whole
  // agent's budget, and five unrelated rejections do not park a sixth).
  const item = `${itemKey ?? agent}:${today()}`;
  const n = state.rework[item] ?? 0;
  if (n >= cfg.rework_cap) {
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: `Rework cap (${cfg.rework_cap}/day) hit for this item; parked. Raise it in binding/GUARDRAILS.md or handle at the desk.` });
  }

  // Single-instance: never spawn a second run of an agent already running, and
  // never exceed a global concurrency ceiling of live model sessions.
  if (runActive(ROOT, agent)) {
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: `${agent} is already running; your instruction is queued and its next run applies it.` });
  }
  const live = countActive();
  if (live >= cfg.max_concurrent) {
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: `${live} agents already running (ceiling ${cfg.max_concurrent}); ${agent} will run on its schedule instead.` });
  }

  state.rework[item] = n + 1; saveSeen();
  if (DRY) { console.log(`[dry] relaunch ${agent} (item ${item})`); return; }

  if (!runnerExists()) {
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: `Cannot re-run ${agent}: the agent CLI is not on PATH. Set OTM_RUNNER in .env or install it, then reply again.` });
  }
  const cmd = process.platform === 'win32' ? 'cmd' : 'sh';
  const args = process.platform === 'win32'
    ? ['/c', join(ROOT, '_host', 'run-agent.cmd'), agent]
    : [join(ROOT, '_host', 'run-agent.sh'), agent];
  spawn(cmd, args, { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
}

function countActive() {
  const dir = join(ROOT, 'state', '.running');
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter(f => runActive(ROOT, f.replace(/\.pid$/, ''))).length;
}

let _runnerChecked;
function runnerExists() {
  if (_runnerChecked !== undefined) return _runnerChecked;
  const runner = process.env.OTM_RUNNER || 'claude';
  const probe = process.platform === 'win32' ? `where ${runner}` : `command -v ${runner}`;
  try { execSync(probe, { stdio: 'ignore' }); _runnerChecked = true; }
  catch { _runnerChecked = false; }
  return _runnerChecked;
}

async function onCallback(cfg, cb) {
  const [verb, key] = (cb.data ?? '').split(':');
  const from = Q(join('pending', key));
  if (!existsSync(from)) {
    return tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Card already handled.' });
  }
  const text = readFileSync(from, 'utf8');
  if (verb === 'ok') {
    const dest = Q(join('approved', key));
    if (existsSync(dest)) {   // collision guard: never silently overwrite approved work
      await tg('answerCallbackQuery', { callback_query_id: cb.id,
        text: 'A card with this name is already approved; not overwriting. Check the queue.' });
      return;
    }
    renameSync(from, dest);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Approved.' });
    if (cfg.on_approve === 'trigger-next') {
      const next = downstreamOf(key);
      if (next) await relaunch(next, cfg, key);
    }
  } else {
    atomicWrite(Q(join('rejected', key)),
      `REJECTED: no reason given, self-critique required\n${text}`);
    unlinkSync(from);
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Rejected. Reply with a line to guide the redo.' });
    const agent = agentOf(key, text);
    if (agent) await relaunch(agent, cfg, key);
  }
}

async function onMessage(cfg, msg) {
  const text = (msg.text ?? '').trim();
  if (!text) return;

  // reply to a card or report we sent -> instruction for its owner (+ note/rework)
  const repliedTo = msg.reply_to_message?.message_id;
  const key = repliedTo ? state.route[repliedTo] : null;
  if (key) {
    const pending = Q(join('pending', key));
    const cardText = existsSync(pending) ? readFileSync(pending, 'utf8')
                   : existsSync(join(REPORTS, key)) ? readFileSync(join(REPORTS, key), 'utf8') : '';
    const agent = agentOf(key, cardText) ?? 'conductor';
    if (existsSync(pending)) {
      // note on a still-pending card: the words become a binding instruction;
      // buttons still decide the card.
      instruct(agent, text, key);
      return tg('sendMessage', { chat_id: cfg.chat_id, reply_to_message_id: msg.message_id,
        text: `Noted for ${agent}. Buttons on the card still decide it.` });
    }
    instruct(agent, text, key);
    await relaunch(agent, cfg, key);
    return tg('sendMessage', { chat_id: cfg.chat_id, reply_to_message_id: msg.message_id,
      text: `Instructed ${agent}; re-running now.` });
  }

  // @agent-name direct address
  const at = text.match(/^@([\w-]+)\s+([\s\S]+)/);
  if (at) {
    instruct(at[1], at[2], 'direct message');
    await relaunch(at[1], cfg, `direct:${at[1]}`);
    return tg('sendMessage', { chat_id: cfg.chat_id, text: `Instructed ${at[1]}; re-running now.` });
  }

  if (text === '/digest') {
    const pending = readdirSync(Q('pending')).filter(f => f.endsWith('.md') && f !== 'README.md');
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: pending.length ? `Waiting on you:\n${pending.map(f => `• ${f}`).join('\n')}` : 'Queue is clear.' });
  }

  // anything else: the ideas inbox
  appendFileSync(join(ROOT, 'state', 'IDEAS.md'), `\n- [${stamp()}] ${text}\n`);
  return tg('sendMessage', { chat_id: cfg.chat_id, reply_to_message_id: msg.message_id,
    text: 'In the ideas inbox. The conductor picks it up on its next planning run.' });
}

async function poll(cfg) {
  const res = await tg('getUpdates', { offset: state.offset + 1, timeout: ONCE ? 0 : 25,
    allowed_updates: ['message', 'callback_query'] });
  for (const u of res.result ?? []) {
    state.offset = u.update_id; saveSeen();
    try {
      if (u.callback_query) await onCallback(cfg, u.callback_query);
      else if (u.message)   await onMessage(cfg, u.message);
    } catch (e) { console.error('[bridge] update failed:', e.message); }
  }
}

// ---------------------------------------------------------------------------

const cfg = readConfig();
if (!TOKEN && !DRY) { console.error('TELEGRAM_BOT_TOKEN missing (.env). Set TELEGRAM_DRY_RUN=1 to test without it.'); process.exit(1); }
if (!cfg.chat_id && !DRY) { console.error('chat_id missing in binding/TOOLS.md gate adapter section.'); process.exit(1); }

console.log(`[bridge] up. dry=${DRY} once=${ONCE} on_approve=${cfg.on_approve}`);
if (!DRY && !runnerExists())
  console.warn('[bridge] warning: agent runner not on PATH; rework re-runs will report that until it is installed or OTM_RUNNER is set.');

// The whole cycle is guarded: a transient network error (getUpdates rejecting
// on DNS/offline/5xx) must not kill the gate. It backs off and continues, so
// the bridge self-heals instead of silently dying until the next reboot.
let backoff = 1000;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
do {
  try {
    await scanOutbound(cfg);
    await poll(cfg);
    backoff = 1000;                        // healthy cycle resets the backoff
  } catch (e) {
    if (ONCE) throw e;                      // tests want the failure surfaced
    console.error(`[bridge] cycle error (${e.message}); retrying in ${backoff}ms`);
    await sleep(backoff);
    backoff = Math.min(backoff * 2, 60000); // cap at a minute
  }
} while (!ONCE);
