# Failure routing

Every agent run ends in exactly one named outcome. A run that ends in none of them is a bug, and the smoke suite asserts against it. The distinction that carries the whole design: **a missing capability changes what your output looks like; a missing input stops you.**

| Outcome | Trigger | Where it goes | Next run |
|---|---|---|---|
| `OK` | Work done, or a stated no-op | The artifact | Next item |
| `DEGRADE` | Connector/credential absent, no alternative bound | Handoff card carrying the FINISHED work plus paste-ready steps | Re-checks, stays in handoff until connected |
| `BLOCK` | Input missing, empty, malformed, ambiguous | `reports/BLOCKED-<agent>-<date>.md` | Re-reads, blocks again, never guesses |
| `FAIL` | Tool reached the service and errored | Retry once, then handoff card + log entry | Same item again |
| `HALT` | Guardrail ceiling breached | Lane stops, `reports/ALERT-*`, human unlock | Refuses the lane until cleared |
| `FLAG` | Output failed its own self-check, unfixable | Card queued, marked, defect named | Reads the flag before redrafting |
| `REJECT` | Human said no at the gate | `rejected/` with the reason line | Answers the reason explicitly, never re-proposes unchanged |

## The parts people miss

**DEGRADE is not an error.** A fresh clone with zero connectors runs the entire fleet in DEGRADE and the operator gets finished work as cards. Handoff cards must be completable by someone with no tools (contract rule 15): the full content, the exact steps, phone-readable.

**Replies re-arm agents.** Any human reply to any card or failure report becomes a dated `INSTRUCT` block in `state/_QUEUE/instructions/<agent>.md`, binding on the next run with the same force as `APPROVED WITH NOTE`. On the chat bridge, a reject-with-text re-launches the owning agent immediately: the rework loop runs until the human approves, capped per day by guardrail so it cannot burn your limits.

**Silence is the one forbidden ending.** A silent exit is indistinguishable from a crash, so the contract requires every run to finish loud (rule 10) and log itself (rule 12).
