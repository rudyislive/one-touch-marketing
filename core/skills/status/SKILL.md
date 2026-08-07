---
name: status
description: One screen answering what ran, what is waiting on the human, and what is broken. Use when someone says status, what happened, what is waiting, or anything is wrong.
---

# Status

One screen, three questions, newest first, no padding. Read narrow (rule 13): the recent window of the activity log, the queue listing, the reports directory listing, `binding/FLEET.md`, and `state/HOT-CACHE.md`. Do not open every report.

## The screen

**Waiting on you** (this is the lead; their time is the scarce resource):
- Pending cards, oldest first, one line each with age. Flag anything older than the guardrail alert age.
- Failure cards and alerts awaiting an instruction or an unlock.

**Ran since you last looked:**
- From the activity log window: agent, outcome, one clause of what it did. Group no-ops into a single line. HALTed lanes named loudly.

**Health:**
- Agents enabled vs off (from FLEET.md), anything BLOCKED repeatedly this week (same blocker twice is a pattern, say so), capabilities currently degraded (run `node tools/doctor.mjs --json` and resolve the unknown slots against your own session tools; report only what changed from green).
- The hot cache's open questions, if any are stale enough to matter.

Close with the single most useful next action, one line, only if one is obvious. Otherwise close with nothing.
