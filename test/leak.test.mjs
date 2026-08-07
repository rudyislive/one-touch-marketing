// leak.test.mjs - nothing from the reference deployment may appear anywhere.
// Runs against every tracked file except docs/specs (internal, dropped at
// publish). The publish flow exports a fresh tree with fresh history, so a
// clean pass here means a clean public repo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Patterns that identify the reference deployment, stored base64-encoded so
// this file never itself carries the strings it forbids. Decode-and-match at
// runtime. To extend: btoa (or Buffer) your new pattern source and append.
const FORBIDDEN = [
  'cWF0b2JpdA==', 'XGJxc2lcYg==', 'd2VhbHRoLD9ccypieVxzKmRlc2lnbg==',
  'aW5zdGl0dXRpb25hbCBjdXN0b2R5', 'Y3J5cHRvIGludmVzdG1lbnRzIGFyZSBzdWJqZWN0IHRvIG1hcmtldCByaXNr',
  'XGJrYW5uYVxi', 'XGJ2cmlvblxi', 'XGJnZXE4XGI=', 'Ym9zcy0/aHE=',
  'cnVkeWlzbGl2ZQ==', 'XGJydWRyYVxi',
].map(b64 => new RegExp(Buffer.from(b64, 'base64').toString('utf8'), 'i'));

const files = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter(f => !f.startsWith('docs/specs/'))
  .filter(f => f !== 'test/leak.test.mjs'); // the pattern list would match itself

test('no private-deployment string in any shipped file', () => {
  const hits = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    for (const p of FORBIDDEN) {
      const m = text.match(p);
      if (m) hits.push(`${f}: "${m[0]}"`);
    }
  }
  assert.deepEqual(hits, [], `leaks found:\n${hits.join('\n')}`);
});

test('legal-framing vocabulary stays out of shipped prose', () => {
  // The framework carries no opinions (contract rule 7). The operator's own
  // HOUSE-RULES template and the posture question in onboard are the operator's
  // side of it and are exempt by design.
  const exempt = new Set(['binding/HOUSE-RULES.md', 'core/skills/onboard/SKILL.md']);
  const pattern = /\b(compliance|disclaimer|regulatory|legal review)\b/i;
  const hits = [];
  for (const f of files) {
    if (exempt.has(f) || !/\.(md|mjs|ya?ml)$/.test(f)) continue;
    let text;
    try { text = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    const m = text.match(pattern);
    if (m) hits.push(`${f}: "${m[0]}"`);
  }
  assert.deepEqual(hits, [], `framing found:\n${hits.join('\n')}`);
});

test('no em dashes or double hyphens in shipped markdown prose', () => {
  const hits = [];
  for (const f of files.filter(f => f.endsWith('.md'))) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    if (/[—–]/.test(text)) hits.push(`${f}: em/en dash`);
  }
  assert.deepEqual(hits, [], hits.join('\n'));
});
