// hardening.test.mjs - the guarantees the founder review flagged as unenforced.
// Each of these would have been a silent field failure; now a regression fails CI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, withLock, claimOnce, bumpCounter, markRunning, runActive }
  from '../tools/lib/safe-fs.mjs';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = join(ROOT, 'state', '.test-scratch');

test('claimOnce is exactly-once even under repeated calls (idempotency primitive)', () => {
  rmSync(join(ROOT, 'state', '.claims'), { recursive: true, force: true });
  const key = 'publish:card-xyz';
  assert.equal(claimOnce(ROOT, key), true,  'first claim wins');
  assert.equal(claimOnce(ROOT, key), false, 'second claim loses');
  assert.equal(claimOnce(ROOT, key), false, 'third too');
});

test('bumpCounter enforces a ceiling and never lost-updates', async () => {
  rmSync(join(ROOT, 'state', '.counters'), { recursive: true, force: true });
  const day = '2026-08-08';
  for (let i = 0; i < 3; i++) {
    const r = await bumpCounter(ROOT, 'gen-jobs', { limit: 3, day });
    assert.equal(r.allowed, true);
  }
  const over = await bumpCounter(ROOT, 'gen-jobs', { limit: 3, day });
  assert.equal(over.allowed, false, 'the 4th over a limit of 3 is refused');
  assert.equal(over.total, 3, 'and the counter is not bumped past the limit');
});

test('withLock serializes and releases', async () => {
  mkdirSync(scratch, { recursive: true });
  const f = join(scratch, 'seq.txt');
  atomicWrite(f, '');
  // interleave two lock-guarded read-modify-writes; without the lock they race
  await Promise.all([0, 1, 2, 3].map(n =>
    withLock(ROOT, 'seq-test', () => {
      const cur = readFileSync(f, 'utf8');
      atomicWrite(f, cur + n);
    })));
  assert.equal(readFileSync(f, 'utf8').length, 4, 'all four writes survived, none lost');
  rmSync(scratch, { recursive: true, force: true });
});

test('run marker reflects an active run and clears on release', () => {
  rmSync(join(ROOT, 'state', '.running'), { recursive: true, force: true });
  assert.equal(runActive(ROOT, 'demo-agent'), false);
  const release = markRunning(ROOT, 'demo-agent');
  assert.equal(runActive(ROOT, 'demo-agent'), true, 'marker seen while running');
  release();
  assert.equal(runActive(ROOT, 'demo-agent'), false, 'cleared after release');
});

test('the compositor renders visible text with NO system font (embedded Inter)', async () => {
  // Font regression guard (founder finding #14): a blank type layer must fail CI,
  // not ship. We compare ink between a headline render and an empty-headline
  // render of the same size; real text adds a large, measurable pixel delta.
  const base = { formats: ['1:1'], colours: { background: '#000000' } };
  const out = join(ROOT, 'build', 'test');
  execSync(`node tools/compose.mjs - --out ${out}`, { cwd: ROOT,
    input: JSON.stringify({ ...base, slug: 'ink-yes', headline: 'RENDER CHECK ONE TWO THREE' }) });
  execSync(`node tools/compose.mjs - --out ${out}`, { cwd: ROOT,
    input: JSON.stringify({ ...base, slug: 'ink-no' }) });
  const yes = await renderInk(join(out, 'ink-yes-1x1.png'));
  const no  = await renderInk(join(out, 'ink-no-1x1.png'));
  assert.ok(yes - no > 2000, `headline added only ${yes - no} lit pixels; font likely did not render`);
});

// count near-white pixels (headline is white on black) from raw pixel data, in-process
async function renderInk(png) {
  const data = await sharp(png).greyscale().raw().toBuffer();
  let lit = 0;
  for (let i = 0; i < data.length; i++) if (data[i] > 128) lit++;
  return lit;
}
