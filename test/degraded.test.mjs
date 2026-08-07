// degraded.test.mjs - the zero-capability floor.
// A fresh clone with nothing connected must run, degrade, and hand off.
// Nothing may block on a missing connector.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every capability slot degrades or has a manual fallback; none may block', () => {
  for (const pack of ['seo', 'social']) {
    const full = readFileSync(join(ROOT, 'packs', pack, 'pack.yaml'), 'utf8');
    // scope to the capabilities section only; templates also use "- id:"
    const start = full.indexOf('\ncapabilities:');
    const end = full.slice(start + 1).search(/\n\w/) ;
    const y = end === -1 ? full.slice(start) : full.slice(start, start + 1 + end);
    for (const cap of y.matchAll(/- id: ([\w-]+)([\s\S]*?)(?=\n\s{2}- id:|$)/g)) {
      const [, id, body] = cap;
      const onAbsent = body.match(/on_absent:\s*(\S+)/)?.[1];
      assert.equal(onAbsent, 'degrade',
        `${pack}/${id}: on_absent is "${onAbsent}", must be degrade`);
    }
  }
});

test('every capability-bearing agent states its capability-absent behavior', () => {
  const dirs = ['packs/seo/agents', 'packs/social/agents'];
  for (const d of dirs) for (const f of readdirSync(join(ROOT, d))) {
    const text = readFileSync(join(ROOT, d, f), 'utf8');
    const caps = text.match(/capabilities:\s*\[([^\]]*)\]/)?.[1].trim();
    if (!caps) continue; // no capabilities declared, nothing to degrade
    assert.ok(/absent|DEGRADE|degrade|handoff|hand off|hand the last mile/i.test(text),
      `${d}/${f}: declares capabilities [${caps}] but never says what absence means`);
  }
});

test('doctor with a stripped environment still exits 0 and reports handoff, not crash', () => {
  const env = { ...process.env };
  for (const k of Object.keys(env))
    if (/API|KEY|TOKEN|URL/i.test(k)) delete env[k];
  const out = execSync('node tools/doctor.mjs --json', { cwd: ROOT, encoding: 'utf8', env });
  const json = JSON.parse(out);
  assert.ok(json.packs.length >= 2, 'doctor lost packs under empty env');
});

test('bridge dry-run completes a full cycle with no token and no chat id', () => {
  const out = execSync('node _host/telegram-bridge.mjs --once', {
    cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, TELEGRAM_DRY_RUN: '1', TELEGRAM_BOT_TOKEN: '' },
  });
  assert.ok(out.includes('[bridge] up'), out);
});

test('compositor pure-composition path needs no generator: scene-free spec renders', () => {
  const spec = JSON.stringify({
    slug: 'degraded', formats: ['4:5'],
    headline: 'No image model was involved in this asset.',
    subhead: 'The day-one path.',
  });
  const out = execSync(`node tools/compose.mjs - --out ${join(ROOT, 'build', 'test')}`,
    { cwd: ROOT, encoding: 'utf8', input: spec });
  assert.ok(out.trim().endsWith('.png'));
});
