#!/usr/bin/env node
/**
 * doctor - capability preflight.
 *
 * Answers one question per capability slot: can this operator do this thing,
 * and if not with their first choice, then with what?
 *
 * Two halves, deliberately:
 *
 *   MECHANICAL   things a script can actually verify - local binaries, node
 *                modules, environment variables, reachable endpoints.
 *
 *   OBSERVABLE   things only the running agent can see, chiefly which MCP
 *                servers and connectors are attached to its session. A script
 *                cannot introspect that, so doctor emits them as `unknown` and
 *                the /doctor skill resolves them against its own tool list.
 *
 * Pretending the second half is knowable from here would be the exact kind of
 * confident-but-wrong report this framework exists to prevent.
 *
 *   node tools/doctor.mjs           human-readable
 *   node tools/doctor.mjs --json    for /onboard and /doctor to consume
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');

const C = {
  green: '\x1b[32m', amber: '\x1b[33m', red: '\x1b[31m',
  dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m',
};
const paint = (s, c) => (JSON_OUT || !process.stdout.isTTY ? s : c + s + C.off);

// ---------------------------------------------------------------------------
// Minimal YAML reader.
//
// Reads exactly the subset the pack manifests use. A real parser is a
// dependency, and doctor has to run before anything is installed.
// ---------------------------------------------------------------------------

function readManifest(text) {
  const pack = { capabilities: [], agents: [], templates: [] };
  const lines = text.split(/\r?\n/);
  let section = null;
  let cap = null;
  let altList = null;

  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();

    if (indent === 0) {
      const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
      if (m) {
        section = m[1];
        if (m[2] && m[2] !== '>' && m[2] !== '|') pack[m[1]] = m[2];
        if (cap) { pack.capabilities.push(cap); cap = null; }
        altList = null;
      }
      continue;
    }

    if (section === 'agents' && line.startsWith('- ')) {
      pack.agents.push(line.slice(2).split('#')[0].trim());
      continue;
    }

    if (section === 'capabilities') {
      if (indent === 2 && line.startsWith('- id:')) {
        if (cap) pack.capabilities.push(cap);
        cap = { id: line.slice(5).trim(), alternatives: [], required_by: [] };
        altList = null;
        continue;
      }
      if (!cap) continue;

      if (line === 'alternatives:') { altList = cap.alternatives; continue; }

      if (altList && line.startsWith('- name:')) {
        altList.push({ name: line.slice(7).trim(), auth: undefined, note: '' });
        continue;
      }
      if (altList && altList.length && line.startsWith('auth:')) {
        altList[altList.length - 1].auth = line.slice(5).trim();
        continue;
      }
      if (altList && altList.length && line.startsWith('note:')) {
        altList[altList.length - 1].note = line.slice(5).trim().replace(/^[>|]\s*/, '');
        continue;
      }

      const kv = line.match(/^(slot|on_absent|auth|manual_fallback):\s*(.*)$/);
      if (kv) { cap[kv[1]] = kv[2].replace(/^[>|]\s*/, ''); altList = null; continue; }

      if (line.startsWith('required_by:')) {
        cap.required_by = (line.match(/\[(.*)\]/)?.[1] ?? '')
          .split(',').map(s => s.trim()).filter(Boolean);
        altList = null;
      }
    }
  }
  if (cap) pack.capabilities.push(cap);
  return pack;
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

const hasBinary = (bin) => {
  try {
    execSync(process.platform === 'win32' ? `where ${bin}` : `command -v ${bin}`,
      { stdio: 'ignore' });
    return true;
  } catch { return false; }
};

const hasModule = (name) => {
  try { return existsSync(join(ROOT, 'node_modules', name)); } catch { return false; }
};

const hasEnv = (...keys) => keys.some(k => (process.env[k] ?? '').trim().length > 0);

/**
 * Mechanical probes, keyed by the alternative's name in the manifest.
 * Anything absent from this table is agent-observable, not script-observable.
 */
const PROBES = {
  'sharp':                    () => hasModule('sharp'),
  'ImageMagick':              () => hasBinary('magick') || hasBinary('convert'),
  'Pillow':                   () => hasBinary('python') || hasBinary('python3') || hasBinary('py'),
  'Local diffusion runtime':  () => hasEnv('LOCAL_DIFFUSION_URL'),
  'Public JSON endpoints':    () => true,   // no auth, always available
  'WebSearch and WebFetch':   () => true,   // every supported runtime has these
  'Still image with motion applied by the compositor':
                              () => hasModule('sharp') || hasBinary('magick'),
  'Manual entry':             () => true,
  'Any image-generation HTTP API':  () => hasEnv('IMAGE_API_URL', 'IMAGE_API_KEY'),
  'Any video-generation HTTP API':  () => hasEnv('VIDEO_API_URL', 'VIDEO_API_KEY'),
  'Any scheduler with a write API': () => hasEnv('SCHEDULER_API_URL', 'SCHEDULER_API_KEY'),
  'Any product-analytics API':      () => hasEnv('ANALYTICS_API_URL', 'ANALYTICS_API_KEY'),
};

const isMcp = (name) => /\bMCP\b/.test(name);

// ---------------------------------------------------------------------------

function installedPacks() {
  const dir = join(ROOT, 'packs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(dir, d.name, 'pack.yaml')))
    .map(d => ({
      name: d.name,
      ...readManifest(readFileSync(join(dir, d.name, 'pack.yaml'), 'utf8')),
    }));
}

function assess(cap) {
  const checked = cap.alternatives.map(alt => {
    const probe = PROBES[alt.name];
    const status = probe ? (probe() ? 'available' : 'absent')
                         : (isMcp(alt.name) ? 'unknown' : 'unknown');
    return { ...alt, status, observable: !probe };
  });

  const bound   = checked.find(a => a.status === 'available');
  const pending = checked.filter(a => a.status === 'unknown');

  // The primary is whatever the manifest ranked first.
  const primary = checked[0];
  const usingPrimary = bound && primary && bound.name === primary.name;

  let level;
  if (bound && usingPrimary)      level = 'green';
  else if (bound)                 level = 'amber';   // works, via a substitute
  else if (pending.length)        level = 'unknown'; // agent must resolve
  else                            level = 'red';     // handoff mode

  return { ...cap, checked, bound: bound ?? null, pending, level };
}

// ---------------------------------------------------------------------------

const packs = installedPacks();
const report = packs.map(p => ({
  pack: p.name,
  agents: p.agents,
  capabilities: p.capabilities.map(assess),
}));

if (JSON_OUT) {
  console.log(JSON.stringify({
    root: ROOT,
    packs: report,
    note: 'Capabilities at level "unknown" are MCP or connector slots a script '
        + 'cannot introspect. Resolve them against your own available tool list '
        + 'before reporting to the operator.',
  }, null, 2));
  process.exit(0);
}

if (!packs.length) {
  console.log('\nNo packs installed yet. Run /onboard to choose your lanes.\n');
  process.exit(0);
}

const GLYPH = { green: '●', amber: '●', red: '●', unknown: '○' };
const COLOUR = { green: C.green, amber: C.amber, red: C.red, unknown: C.dim };

console.log(`\n${paint('one-touch-marketing', C.bold)}  capability check\n`);

let degraded = 0, unresolved = 0;

for (const p of report) {
  console.log(paint(`  ${p.pack}`, C.bold));

  for (const cap of p.capabilities) {
    const dot = paint(GLYPH[cap.level], COLOUR[cap.level]);
    const slot = (cap.slot ?? cap.id).padEnd(30);

    let detail;
    if (cap.level === 'green')        detail = cap.bound.name;
    else if (cap.level === 'amber')   detail = `${cap.bound.name} ${paint('(substitute)', C.dim)}`;
    else if (cap.level === 'unknown') detail = paint(`check session for: ${cap.pending.map(a => a.name).join(', ')}`, C.dim);
    else                              detail = paint('handoff mode', C.dim);

    console.log(`  ${dot} ${slot} ${detail}`);

    if (cap.level === 'amber') {
      degraded++;
      const first = cap.checked[0];
      if (first?.note) console.log(`      ${paint(`first choice ${first.name}: ${first.note}`, C.dim)}`);
    }
    if (cap.level === 'unknown') unresolved++;
    if (cap.level === 'red') {
      degraded++;
      const affected = cap.required_by.join(', ');
      if (affected) console.log(`      ${paint(`${affected} will hand off instead of executing`, C.dim)}`);
      if (cap.manual_fallback) console.log(`      ${paint(cap.manual_fallback, C.dim)}`);
    }
  }
  console.log('');
}

console.log(paint('  Nothing here blocks. Every agent runs and produces its work;', C.dim));
console.log(paint('  missing capabilities change how the last mile is delivered.', C.dim));
if (unresolved) console.log(paint(`  ${unresolved} slot(s) need your session's tool list to resolve.`, C.dim));
console.log('');
