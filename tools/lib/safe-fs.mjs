/**
 * safe-fs - the coordination primitives the whole fleet leans on.
 *
 * Agents are stateless runs that meet only through files, and on a real machine
 * two of them (a scheduled run and a bridge relaunch, say) can land on the same
 * file at the same time. Prose rules cannot prevent that; these can.
 *
 *   atomicWrite   temp file + rename, so a crash mid-write never truncates state
 *   withLock      exclusive per-key lock via mkdir (atomic on every OS), with a
 *                 stale-lock breaker so a killed holder cannot wedge the fleet
 *   claimOnce     one-shot claim marker: returns true exactly once per key
 *   bumpCounter   atomic day-keyed counter under a lock, for spend/rate ceilings
 *   isRunning     single-instance check for headless agent relaunches
 */

import { writeFileSync, renameSync, mkdirSync, rmSync, existsSync,
         readFileSync, readdirSync, statSync, openSync, closeSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// atomic write
// ---------------------------------------------------------------------------

export function atomicWrite(path, data) {
  // Same-directory temp so rename stays on one volume (atomic there, not across).
  const tmp = `${path}.${process.pid}.${counterSuffix()}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);          // atomic replace on POSIX and NTFS
}

// process-local monotonic suffix, since Date.now/Math.random are avoided elsewhere
let _c = 0;
function counterSuffix() { return (_c = (_c + 1) & 0xffffff).toString(36); }

// ---------------------------------------------------------------------------
// locks (mkdir is atomic and cross-platform; O_EXCL files are not on all FS)
// ---------------------------------------------------------------------------

const LOCK_DIR = (root) => join(root, 'state', '.locks');

/**
 * Run `fn` while holding an exclusive lock named `key`. Blocks by retry, up to
 * `waitMs`. A lock older than `staleMs` is assumed abandoned by a dead process
 * and broken. Returns fn's result, or throws if the lock cannot be taken.
 */
export async function withLock(root, key, fn, { waitMs = 15000, staleMs = 120000 } = {}) {
  const dir = LOCK_DIR(root);
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, `${safe(key)}.lock`);
  const deadline = walltime() + waitMs;

  for (;;) {
    try {
      mkdirSync(lock);                                   // fails if it exists
      writeFileSync(join(lock, 'pid'), String(process.pid));
      break;
    } catch {
      // held. break it only if it is provably stale.
      try {
        if (walltime() - statSync(lock).mtimeMs > staleMs) { rmSync(lock, { recursive: true, force: true }); continue; }
      } catch { /* vanished between check and stat: retry */ }
      if (walltime() > deadline) throw new Error(`lock timeout: ${key}`);
      await sleep(120);
    }
  }
  try { return await fn(); }
  finally { rmSync(lock, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------------------
// one-shot claim: the primitive that makes "never double-act" real
// ---------------------------------------------------------------------------

/**
 * Atomically claim `key`. Returns true for the first caller ever, false after.
 * Backed by mkdir, so two racing processes cannot both win.
 */
export function claimOnce(root, key) {
  const dir = join(root, 'state', '.claims');
  mkdirSync(dir, { recursive: true });
  try { mkdirSync(join(dir, safe(key))); return true; }
  catch { return false; }
}

export function isClaimed(root, key) {
  return existsSync(join(root, 'state', '.claims', safe(key)));
}

// ---------------------------------------------------------------------------
// day-keyed counter under a lock: machine-enforced spend/rate ceilings
// ---------------------------------------------------------------------------

/**
 * Increment the counter `name` for today by `by` and return the new total, all
 * under a lock so concurrent runs cannot lost-update it. `limit` (optional)
 * makes it a ceiling: if the increment would exceed it, the counter is left
 * unchanged and { allowed:false, total } comes back.
 */
export async function bumpCounter(root, name, { by = 1, limit = null, day } = {}) {
  const today = day ?? '__nodate__';   // caller passes the date; scripts have no clock
  return withLock(root, `counter:${name}`, () => {
    const file = join(root, 'state', '.counters', `${safe(name)}.json`);
    mkdirSync(join(root, 'state', '.counters'), { recursive: true });
    let data = {};
    try { data = JSON.parse(readFileSync(file, 'utf8')); } catch {}
    const cur = data[today] ?? 0;
    if (limit != null && cur + by > limit) return { allowed: false, total: cur };
    data[today] = cur + by;
    // prune old days
    for (const k of Object.keys(data)) if (k !== today && k < today) delete data[k];
    atomicWrite(file, JSON.stringify(data));
    return { allowed: true, total: data[today] };
  });
}

// ---------------------------------------------------------------------------
// single-instance guard for relaunched agents
// ---------------------------------------------------------------------------

export function isRunning(root, agent) {
  return isClaimed(root, `run:${agent}`) === false ? false : existsSync(join(root, 'state', '.claims', safe(`run:${agent}`)));
}

/** Mark an agent run active; returns a release() to call when it exits. */
export function markRunning(root, agent) {
  const dir = join(root, 'state', '.running');
  mkdirSync(dir, { recursive: true });
  const marker = join(dir, `${safe(agent)}.pid`);
  atomicWrite(marker, String(process.pid));
  return () => { try { rmSync(marker, { force: true }); } catch {} };
}

/** True if an agent marker exists and is fresh (holder likely alive). */
export function runActive(root, agent, staleMs = 900000) {
  const marker = join(root, 'state', '.running', `${safe(agent)}.pid`);
  try { return walltime() - statSync(marker).mtimeMs < staleMs; }
  catch { return false; }
}

// ---------------------------------------------------------------------------

const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, '_');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// Plain wall clock: this is host tooling (bridge, runners), not a resumable
// workflow script, so Date.now is fine and correct here.
const walltime = () => Date.now();
