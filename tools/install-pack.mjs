#!/usr/bin/env node
/**
 * install-pack - wire a pack in, or flip it off.
 *
 *   node tools/install-pack.mjs social          install/enable
 *   node tools/install-pack.mjs social --off    disable (nothing is deleted)
 *
 * Wiring means: FLEET.md rows enabled, state files scaffolded, schedules merged
 * into _host/schedules.json (what the host runners register). Capability
 * resolution and platform choice live in /onboard and /add-pack, which call
 * this for the mechanical part.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
const OFF = process.argv.includes('--off');
if (!name) { console.error('usage: install-pack <pack> [--off]'); process.exit(1); }

const manifestPath = join(ROOT, 'packs', name, 'pack.yaml');
if (!existsSync(manifestPath)) { console.error(`no such pack: ${name}`); process.exit(1); }
const text = readFileSync(manifestPath, 'utf8');

// agents: "  - name   # comment"
const agents = [...text.matchAll(/^\s{2}- ([\w-]+)\s*(?:#.*)?$/gm)]
  .map(m => m[1])
  .filter(a => text.includes(`agents:`) && text.indexOf(`- ${a}`) > text.indexOf('agents:'))
  .filter(a => !text.slice(0, text.indexOf(`- ${a}`)).includes('\nstate:') || text.indexOf(`- ${a}`) < text.indexOf('\nstate:'));

// state files
const stateBlock = text.match(/\nstate:\n([\s\S]*?)\n\w/);
const stateFiles = stateBlock ? [...stateBlock[1].matchAll(/^\s*- (.+)$/gm)].map(m => m[1].trim()) : [];

// schedule: "  agent: { cadence: daily, time: "07:45", placement: host }"
function parseSchedule(src) {
  const out = {};
  const block = src.match(/\nschedule:\n([\s\S]*)$/);
  if (block) for (const m of block[1].matchAll(/^\s{2}([\w-]+):\s*\{([^}]*)\}/gm)) {
    const entry = {};
    for (const kv of m[2].matchAll(/(\w+):\s*(?:"([^"]*)"|([^,}]+))/g))
      entry[kv[1]] = (kv[2] ?? kv[3]).trim();
    out[m[1]] = entry;
  }
  return out;
}
const schedule = parseSchedule(text);

// 1. FLEET.md rows
const fleetPath = join(ROOT, 'binding', 'FLEET.md');
let fleet = readFileSync(fleetPath, 'utf8');
for (const a of agents) {
  const row = new RegExp(`^(\\| ${a.padEnd(18)}\\s*\\|) [^|]+(\\|.*)$`, 'm');
  const flag = OFF ? 'no ' : 'yes';
  if (row.test(fleet)) fleet = fleet.replace(row, `$1 ${flag.padEnd(7)} $2`);
  else fleet = fleet.replace(/\n$/, `\n| ${a.padEnd(18)} | ${flag.padEnd(7)} |                   |\n`);
}
writeFileSync(fleetPath, fleet);

// 2. state scaffolding
if (!OFF) for (const f of stateFiles) {
  const p = join(ROOT, 'state', f);
  mkdirSync(dirname(p), { recursive: true });
  if (!existsSync(p)) writeFileSync(p, `# ${f}\n\n<!-- scaffolded by install-pack; agents append, humans read -->\n`);
}

// 2b. template seeds -> binding/VISUAL-SYSTEMS.md, only while its Systems
// section is still UNKNOWN. Found the hard way: without this, the drafter
// works but the visual agent stalls on an empty template registry.
if (!OFF) {
  const tmplBlock = text.match(/\ntemplates:\n([\s\S]*?)(?=\n# -|\n\w|$)/);
  const vsPath = join(ROOT, 'binding', 'VISUAL-SYSTEMS.md');
  if (tmplBlock && existsSync(vsPath)) {
    const vs = readFileSync(vsPath, 'utf8');
    if (/## Systems[\s\S]*UNKNOWN/.test(vs)) {
      const seeded = vs.replace(/(## Systems[\s\S]*?)UNKNOWN/,
        `$1<!-- seeded from packs/${name}/pack.yaml by install-pack; edit freely -->\n\`\`\`yaml\n${tmplBlock[1].trim()}\n\`\`\`\n`);
      writeFileSync(vsPath, seeded);
      console.log('seeded binding/VISUAL-SYSTEMS.md with the pack templates.');
    }
  }
}

// 3. schedules.json for the host runners
const schedPath = join(ROOT, '_host', 'schedules.json');
mkdirSync(join(ROOT, '_host'), { recursive: true });
const all = existsSync(schedPath) ? JSON.parse(readFileSync(schedPath, 'utf8')) : {};
for (const [agent, entry] of Object.entries(schedule)) {
  if (OFF) delete all[agent];
  else all[agent] = { ...entry, pack: name };
}
// The core tier (verifier, conductor, managers, reconciliation, audit) belongs
// to no pack, so it is registered unconditionally on every install. Without
// this the safety and orchestration agents were never scheduled at all.
const corePath = join(ROOT, 'core', 'schedule.yaml');
if (existsSync(corePath))
  for (const [agent, entry] of Object.entries(parseSchedule(readFileSync(corePath, 'utf8'))))
    all[agent] = { ...entry, pack: 'core' };
writeFileSync(schedPath, JSON.stringify(all, null, 2));

console.log(`${OFF ? 'disabled' : 'installed'} ${name}: ${agents.length} agents, ${OFF ? 0 : stateFiles.length} state files, schedules updated.`);
console.log(OFF ? 'State and history kept; re-enable any time.' :
  `Register schedules: pwsh _host/register-tasks.ps1 (Windows) or bash _host/register-cron.sh (unix).`);
