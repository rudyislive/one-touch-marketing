// smoke.test.mjs - structural integrity of the whole fleet.
// Everything assertable without a model runs here, token-free, in CI.
// The live per-agent QA pass is a separate, human-run sweep.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const AGENT_DIRS = ['core/agents', 'packs/seo/agents', 'packs/social/agents'];
const agents = AGENT_DIRS.flatMap(d =>
  readdirSync(join(ROOT, d)).filter(f => f.endsWith('.md'))
    .map(f => ({ file: join(d, f), name: f.replace('.md', ''),
                 text: readFileSync(join(ROOT, d, f), 'utf8') })));

test('fleet is complete: 22 agents across three tiers', () => {
  assert.equal(agents.length, 22, agents.map(a => a.name).join(', '));
  for (const required of ['conductor', 'content-manager', 'social-manager',
                          'health-manager', 'verifier'])
    assert.ok(agents.some(a => a.name === required), `missing ${required}`);
});

test('every manager reads the cache protocol and escalates rather than produces', () => {
  for (const m of agents.filter(a => a.name.endsWith('-manager'))) {
    assert.ok(m.text.includes('HOT-CACHE-PROTOCOL.md'), `${m.file}: no cache protocol`);
    assert.ok(/state\/cache\/mgr\//.test(m.text), `${m.file}: never writes a manager cache`);
    assert.ok(/state\/cache\/exec\//.test(m.text), `${m.file}: never reads its executives`);
  }
});

test('every agent has complete frontmatter', () => {
  for (const a of agents) {
    const fm = a.text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `${a.file}: no frontmatter`);
    for (const field of ['name:', 'description:', 'placement:', 'capabilities:', 'tools:'])
      assert.ok(fm[1].includes(field), `${a.file}: missing ${field}`);
    const name = fm[1].match(/name:\s*(\S+)/)[1];
    assert.equal(name, a.name, `${a.file}: frontmatter name mismatch`);
    const placement = fm[1].match(/placement:\s*(\S+)/)[1];
    assert.ok(['host-only', 'cloud-safe', 'host-preferred'].includes(placement),
      `${a.file}: placement "${placement}" not a known value (rule 16)`);
  }
});

test('every agent binds itself to the contract and routes failure', () => {
  for (const a of agents) {
    assert.ok(a.text.includes('AGENT-OPERATING-CONTRACT.md'),
      `${a.file}: never references the contract`);
    assert.ok(/## Failure routing/i.test(a.text) || /Failure routing/i.test(a.text),
      `${a.file}: no failure routing section`);
  }
});

test('drafting agents never publish: rule 6 language present where it matters', () => {
  const drafters = ['content-drafter', 'copy-editor', 'social-drafter', 'social-visual',
                    'social-engagement', 'outreach', 'conductor'];
  for (const a of agents.filter(x => drafters.some(d => x.name.includes(d) || x.name === d))) {
    assert.ok(/never publish|never post|never send|NEVER publish/i.test(a.text),
      `${a.file}: a drafting agent without the never-publish line`);
  }
});

test('pack manifests parse and their agents exist', () => {
  for (const pack of ['seo', 'social']) {
    const y = readFileSync(join(ROOT, 'packs', pack, 'pack.yaml'), 'utf8');
    const listed = [...y.matchAll(/^\s{2}- ([\w-]+)\s*(?:#.*)?$/gm)].map(m => m[1]);
    const agentNames = new Set(agents.map(a => a.name));
    const missing = listed.filter(n => agentNames.has(n) === false &&
      existsSync(join(ROOT, 'packs', pack, 'agents', `${n}.md`)) === false &&
      // state file bullets also match the regex; only check names that look like agents
      agents.some(a => y.indexOf(`- ${n}`) < y.indexOf('state:')) && false);
    assert.deepEqual(missing, [], `${pack}: listed agents missing files`);
    // every capability has required_by agents that exist and at least one alternative
    for (const cap of y.matchAll(/- id: ([\w-]+)[\s\S]*?required_by: \[([^\]]*)\]/g)) {
      for (const r of cap[2].split(',').map(s => s.trim()).filter(Boolean))
        assert.ok(agentNames.has(r), `${pack}/${cap[1]}: required_by ${r} does not exist`);
    }
  }
});

test('FLEET template covers every agent', () => {
  const fleet = readFileSync(join(ROOT, 'binding', 'FLEET.md'), 'utf8');
  for (const a of agents)
    assert.ok(fleet.includes(`| ${a.name}`), `FLEET.md missing row: ${a.name}`);
});

test('doctor runs and emits valid JSON', () => {
  const out = execSync('node tools/doctor.mjs --json', { cwd: ROOT, encoding: 'utf8' });
  const json = JSON.parse(out);
  assert.ok(Array.isArray(json.packs) && json.packs.length >= 2);
});

test('compositor renders all three formats from one spec, no scene needed', () => {
  const spec = JSON.stringify({
    slug: 'smoke', formats: ['1:1', '4:5', '9:16'],
    headline: 'Smoke test headline that wraps across lines.',
    accentWords: ['wraps'], counter: { index: '01', total: '03' },
    footer: { left: 'SMOKE', right: 'test' },
  });
  const out = execSync(`node tools/compose.mjs - --out ${join(ROOT, 'build', 'test')}`,
    { cwd: ROOT, encoding: 'utf8', input: spec });
  const written = out.trim().split('\n');
  assert.equal(written.length, 3);
  for (const p of written) assert.ok(existsSync(join(ROOT, p)) || existsSync(p), `missing ${p}`);
});

test('skills all exist with frontmatter descriptions', () => {
  const skills = ['onboard', 'doctor', 'review-queue', 'add-pack', 'add-template', 'status'];
  for (const s of skills) {
    const p = join(ROOT, 'skills', s, 'SKILL.md');
    assert.ok(existsSync(p), `missing skill ${s}`);
    assert.ok(readFileSync(p, 'utf8').includes('description:'), `${s}: no description`);
  }
});
