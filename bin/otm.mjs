#!/usr/bin/env node
/**
 * one-touch-marketing installer.
 *
 *   npx github:rudyislive/one-touch-marketing init [dir]
 *
 * Copies the framework into a working directory, installs dependencies, runs
 * the capability check, and prints exactly one next step. Nothing is asked of
 * the user here that the onboarding conversation can ask better.
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const cmd = argv[0] ?? 'init';

const C = { b: '\x1b[1m', dim: '\x1b[2m', g: '\x1b[32m', o: '\x1b[38;5;208m', off: '\x1b[0m' };
const say = (s = '') => console.log(s);
const step = (s) => say(`${C.o}▸${C.off} ${s}`);

if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  say(`
${C.b}one-touch-marketing${C.off}
  AI drafts everything. You approve once a day. Machines ship it.

  ${C.b}npx github:rudyislive/one-touch-marketing init [dir]${C.off}
      Install into [dir] (default: ./one-touch-marketing)

  ${C.b}npx github:rudyislive/one-touch-marketing update [dir]${C.off}
      Refresh framework code in an existing install. Your binding/, state/
      and .env are kept untouched. (init on an existing install does the same.)

  Already inside a copy? Just open it in Claude Code and say /onboard.
`);
  process.exit(0);
}

if (!['init', 'update'].includes(cmd)) { console.error(`unknown command: ${cmd}. Try --help.`); process.exit(1); }

const target = resolve(argv[1] ?? 'one-touch-marketing');

// ---------------------------------------------------------------------------

say(`\n${C.b}one-touch-marketing${C.off} ${C.dim}v0.1${C.off}\n`);

// 1. node version
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  console.error(`Needs Node 18 or newer; this is ${process.versions.node}.`);
  process.exit(1);
}

// 2. place the files
const hasFramework = existsSync(join(target, 'core', 'AGENT-OPERATING-CONTRACT.md'));
const updating = hasFramework;
if (existsSync(target) && readdirSync(target).length && !hasFramework) {
  console.error(`${target} exists and is not empty. Pick an empty directory.`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });
step(updating ? `Updating the framework in ${target}` : `Installing into ${target}`);

// The framework CODE is refreshed; the user's DATA is never touched.
//   never copied: node_modules, .git, build, state (their queue/ledgers/cache),
//                 .env (their secrets)
//   copy-if-missing on update: binding (their identity/voice/tools) and
//                 examples never overwrite what they have filled in, but a NEW
//                 binding file a later version ships still lands.
const SKIP = new Set(['node_modules', '.git', 'build', 'state', '.env']);
const PRESERVE = new Set(['binding']);   // dirs whose existing files survive update
for (const entry of readdirSync(SELF)) {
  if (SKIP.has(entry)) continue;
  const src = join(SELF, entry), dst = join(target, entry);
  if (updating && PRESERVE.has(entry)) { copyMissing(src, dst); continue; }
  cpSync(src, dst, { recursive: true, force: true });
}

// copy only files that do not already exist at the destination (recursive)
function copyMissing(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, name.name), d = join(dst, name.name);
    if (name.isDirectory()) copyMissing(s, d);
    else if (!existsSync(d)) cpSync(s, d);
  }
}

// state ships as empty scaffolding, never overwritten on update
const stateDirs = ['calendar', 'briefs', 'ledgers', 'reports', 'research', 'assets',
                   '_QUEUE/pending', '_QUEUE/approved/_done', '_QUEUE/rejected', '_QUEUE/instructions'];
for (const d of stateDirs) mkdirSync(join(target, 'state', d), { recursive: true });
for (const [f, body] of [
  ['state/IDEAS.md', '# Ideas inbox\n\nAnything you say, anywhere, lands here verbatim and dated. The conductor reads it every planning run.\n'],
  ['state/HOT-CACHE.md', '# Hot cache\n\n## Strategy\n\n## Active themes\n\n## Traction\n\n## Standing decisions\n\n## Open questions\n'],
]) if (!existsSync(join(target, f))) writeFileSync(join(target, f), body);

if (!existsSync(join(target, '.env')) && existsSync(join(target, '.env.example')))
  cpSync(join(target, '.env.example'), join(target, '.env'));

// 3. dependencies
step('Installing dependencies');
const npm = process.platform === 'win32'
  ? spawnSync('cmd', ['/c', 'npm', 'install', '--silent', '--no-audit', '--no-fund'],
      { cwd: target, stdio: 'inherit' })
  : spawnSync('npm', ['install', '--silent', '--no-audit', '--no-fund'],
      { cwd: target, stdio: 'inherit' });
if (npm.status !== 0) {
  say(`${C.dim}  npm install had trouble; the framework still runs, but image compositing needs it.${C.off}`);
}

// 4. capability check, informational
step('Checking what you have connected');
say('');
try {
  execSync('node tools/doctor.mjs', { cwd: target, stdio: 'inherit' });
} catch {
  say(`${C.dim}  (capability check will run again during onboarding)${C.off}`);
}

// 5. one next step, and only one
if (updating) {
  say(`
${C.g}Updated.${C.off} Framework code refreshed to this version.

${C.dim}Kept exactly as they were: your binding/ (identity, voice, tools),
your state/ (queue, ledgers, cache, ideas) and your .env. Any new binding
file this version adds was dropped in without touching your existing ones.${C.off}

  Run ${C.b}/doctor${C.off} if your connectors changed, ${C.b}/status${C.off} to see where things stand.
`);
} else {
  say(`
${C.g}Done.${C.off} Nothing else needs configuring here.

  ${C.b}1.${C.off} Open ${target} in Claude Code
  ${C.b}2.${C.off} Say ${C.b}/onboard${C.off}

Onboarding is a conversation: what you are building, what you want promoted,
how you sound, which lanes and platforms. It finds your tools itself, and
ends by putting a real draft in front of you.

${C.dim}Nothing above needs to be connected first. With zero connectors the fleet
still drafts, plans and illustrates; it just hands you the last mile.${C.off}
`);
}
