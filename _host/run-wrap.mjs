#!/usr/bin/env node
/**
 * run-wrap - the one place every headless agent run is disciplined.
 *
 * Called by run-agent.cmd/.sh with <agent> <file>. It:
 *   - refuses to start if the same agent is already running (single-instance)
 *   - honors a monthly day-gate so a daily Windows trigger does not run a
 *     monthly agent 30 times (the register-tasks limitation, fixed here so the
 *     fix holds regardless of how the trigger was created)
 *   - kills a run that overruns the timeout, so a hung claude cannot wedge a
 *     slot or accrue cost forever
 *   - writes and clears the run marker safe-fs uses for concurrency accounting
 */

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markRunning, runActive } from '../tools/lib/safe-fs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [agent, file] = process.argv.slice(2);
if (!agent || !file) { console.error('usage: run-wrap <agent> <file>'); process.exit(1); }

// --- single instance
if (runActive(ROOT, agent)) {
  console.error(`${agent} is already running; skipping this trigger.`);
  process.exit(0);
}

// --- monthly day-gate
// If the agent file (or its schedule) marks it monthly, only run on day 1
// (or the configured day). Idempotency (rule 8) is the deeper guard; this
// stops the wasteful spawn before a model session is ever paid for.
try {
  const sched = existsSync(join(ROOT, '_host', 'schedules.json'))
    ? JSON.parse(readFileSync(join(ROOT, '_host', 'schedules.json'), 'utf8')) : {};
  const s = sched[agent];
  if (s && s.cadence === 'monthly') {
    const wantDay = Number(s.day ?? 1);
    const today = new Date().getDate();
    if (today !== wantDay) {
      console.error(`${agent} is monthly (day ${wantDay}); today is ${today}, skipping.`);
      process.exit(0);
    }
  }
} catch { /* no schedules file: fall through and run */ }

// --- run under a timeout, with the marker held
const release = markRunning(ROOT, agent);
const timeoutMin = Number(process.env.OTM_RUN_TIMEOUT_MIN ?? 20);
const runner = process.env.OTM_RUNNER || 'claude';
const prompt = `Run one complete run of the agent defined in ${file}. Read that file and `
  + `core/AGENT-OPERATING-CONTRACT.md first, then do exactly one run's work and exit per its `
  + `completion criteria.`;

const child = spawn(runner, ['-p', prompt], {
  cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32',
});

const killer = setTimeout(() => {
  console.error(`${agent} exceeded ${timeoutMin}m; terminating.`);
  try { child.kill('SIGTERM'); } catch {}
  setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
}, timeoutMin * 60000);

child.on('error', (e) => {
  clearTimeout(killer); release();
  console.error(`could not launch runner "${runner}": ${e.message}. Set OTM_RUNNER in .env.`);
  process.exit(127);
});
child.on('exit', (code) => { clearTimeout(killer); release(); process.exit(code ?? 0); });
