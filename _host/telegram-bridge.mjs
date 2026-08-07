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
         readdirSync, renameSync, statSync, createReadStream } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

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
                max_pings: 10, quiet: null, rework_cap: 5 };
  try {
    const tools = readFileSync(join(ROOT, 'binding', 'TOOLS.md'), 'utf8');
    cfg.chat_id   = tools.match(/chat_id:\s*(\S+)/)?.[1] ?? '';
    cfg.on_approve = tools.match(/on_approve:\s*(\S+)/)?.[1] ?? 'scheduled';
  } catch {}
  try {
    const g = readFileSync(join(ROOT, 'binding', 'GUARDRAILS.md'), 'utf8');
    cfg.max_pings  = Number(g.match(/max_bridge_pings_per_day:\s*(\d+)/)?.[1] ?? 10);
    cfg.rework_cap = Number(g.match(/rework_cycles_per_item_per_day:\s*(\d+)/)?.[1] ?? 5);
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
const saveSeen = () => writeFileSync(SEEN, JSON.stringify(state, null, 2));

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
  // image paths referenced by the card, existing on this disk
  const out = [];
  for (const m of text.matchAll(/(?:^|\s)((?:[A-Za-z]:)?[\w./\\-]+\.(?:png|jpe?g))\b/g)) {
    const p = m[1];
    for (const candidate of [p, join(ROOT, p), join(cardDir, p)]) {
      if (existsSync(candidate)) { out.push(candidate); break; }
    }
  }
  return [...new Set(out)].slice(0, 4);
}

async function pushCard(cfg, file) {
  const text = readFileSync(file, 'utf8');
  const summary = summaryOf(text);
  const body = text.length > 3500 ? text.slice(0, 3500) + '\n[...full card in queue]' : text;
  const assets = assetsOf(text, dirname(file));
  const key = basename(file);

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
    chat_id: cfg.chat_id, text: `${summary}\n\n${body}`.slice(0, 4000),
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

function scanOutbound(cfg) {
  const jobs = [];
  for (const f of readdirSync(Q('pending')).filter(f => f.endsWith('.md') && f !== 'README.md'))
    if (!state.sent[f]) jobs.push(pushCard(cfg, Q(join('pending', f))));
  if (existsSync(REPORTS))
    for (const f of readdirSync(REPORTS).filter(f => /^(BLOCKED|ALERT)-.*\.md$/.test(f)))
      if (!state.sent[f]) jobs.push(pushReport(cfg, join(REPORTS, f)));
  return Promise.all(jobs);
}

// ---------------------------------------------------------------------------
// Inbound: taps and replies -> file moves, instructions, re-runs
// ---------------------------------------------------------------------------

function agentOf(cardName) {
  // cards are named <kind>-... ; kind maps to the owning agent via a prefix table
  const p = cardName.split(/[-.]/)[0].toLowerCase();
  const map = { social: 'social-drafter', links: 'link-applier', replan: 'conductor',
                blocked: cardName.match(/^BLOCKED-([\w-]+)-/i)?.[1] };
  return map[p] ?? cardName.match(/^[A-Z]+-([\w-]+)-\d{4}/)?.[1] ?? null;
}

function instruct(agent, text, re) {
  const dir = Q('instructions'); mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, `${agent}.md`),
    `\n## ${stamp()}\nINSTRUCT: ${text}\n(re: ${re})\n`);
}

function relaunch(agent, cfg) {
  const item = `${agent}:${today()}`;
  const n = state.rework[item] ?? 0;
  if (n >= cfg.rework_cap) {
    return tg('sendMessage', { chat_id: cfg.chat_id,
      text: `Rework cap (${cfg.rework_cap}/day) hit for ${agent}; item parked. Raise the cap in binding/GUARDRAILS.md or handle at the desk.` });
  }
  state.rework[item] = n + 1; saveSeen();
  if (DRY) { console.log(`[dry] relaunch ${agent}`); return; }
  const cmd = process.platform === 'win32' ? 'cmd' : 'sh';
  const args = process.platform === 'win32'
    ? ['/c', join(ROOT, '_host', 'run-agent.cmd'), agent]
    : [join(ROOT, '_host', 'run-agent.sh'), agent];
  spawn(cmd, args, { cwd: ROOT, detached: true, stdio: 'ignore' }).unref();
}

async function onCallback(cfg, cb) {
  const [verb, key] = (cb.data ?? '').split(':');
  const from = Q(join('pending', key));
  if (!existsSync(from)) {
    return tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Card already handled.' });
  }
  if (verb === 'ok') {
    renameSync(from, Q(join('approved', key)));
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Approved.' });
    if (cfg.on_approve === 'trigger-next') relaunch('social-publisher', cfg);
  } else {
    const text = readFileSync(from, 'utf8');
    writeFileSync(Q(join('rejected', key)),
      `REJECTED: no reason given, self-critique required\n${text}`);
    renameSync(from, Q(join('rejected', `.${key}.tmp`))); // ensure single file remains
    try { renameSync(Q(join('rejected', `.${key}.tmp`)), Q(join('rejected', key))); } catch {}
    await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Rejected. Reply with a line to guide the redo.' });
    const agent = agentOf(key);
    if (agent) relaunch(agent, cfg);
  }
}

async function onMessage(cfg, msg) {
  const text = (msg.text ?? '').trim();
  if (!text) return;

  // reply to a card or report we sent -> instruction for its owner (+ note/rework)
  const repliedTo = msg.reply_to_message?.message_id;
  const key = repliedTo ? state.route[repliedTo] : null;
  if (key) {
    const agent = agentOf(key) ?? 'conductor';
    const pending = Q(join('pending', key));
    if (existsSync(pending)) {
      // note on a still-pending card: treat as approve-with-note? No: only words.
      // The words become a binding instruction; buttons still decide the card.
      instruct(agent, text, key);
      return tg('sendMessage', { chat_id: cfg.chat_id, reply_to_message_id: msg.message_id,
        text: `Noted for ${agent}. Buttons on the card still decide it.` });
    }
    instruct(agent, text, key);
    relaunch(agent, cfg);
    return tg('sendMessage', { chat_id: cfg.chat_id, reply_to_message_id: msg.message_id,
      text: `Instructed ${agent}; re-running now.` });
  }

  // @agent-name direct address
  const at = text.match(/^@([\w-]+)\s+([\s\S]+)/);
  if (at) {
    instruct(at[1], at[2], 'direct message');
    relaunch(at[1], cfg);
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
do {
  await scanOutbound(cfg);
  await poll(cfg);
} while (!ONCE);
