# Placement doctrine: cloud or host

Every agent declares its placement (contract rule 16). Getting this wrong is the single most common way a fleet like this quietly stops working, and the rules below were learned in production, not reasoned out.

## An agent runs on the HOST when any of these is true

1. **It needs a local stdio MCP.** Cloud runners attach connectors per routine from a picker; a local stdio server is never in that picker. The run will not see the tool, period.
2. **It needs local machinery**: binaries, fonts, an interactive browser, files on this disk.
3. **Its output needs a same-day human decision.** The approval bridge watches the host's queue and pings within seconds. The same card produced in a cloud run lands in a branch or a pull request, and pull requests silt. A drafter whose cards route through cloud has, in practice, a multi-day approval latency.

The corollary that closes the biggest loop: **the visual-to-publish chain is one unbroken host-side sequence** (visual → gate → publisher). The generated asset is a file on the host's disk; the approved card is a file on the host's disk; the scheduler upload reads both. Split any link of that chain across machines and it breaks on a file one side cannot see.

## An agent runs in the CLOUD when

It is report-shaped: reads network sources, writes a git-visible report, tolerates queue latency, benefits from running even when the laptop is closed. Listeners, auditors, trend trackers, performance readers.

## Operational rules that come with this

- Connectors attach **per routine**, not per account. A connector your account has but the routine does not list is invisible to that run. When a cloud agent reports a missing capability, check the routine's connector list before anything else.
- Cloud report branches can auto-merge; drafter branches never should. Better: drafters do not run in the cloud at all (rule 3 above).
- A connector absent from a run is a DEGRADE, not a mystery. The contract makes agents say what they could not reach; believe them.
