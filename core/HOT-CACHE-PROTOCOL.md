# The hot cache, three tiers

Every agent has working memory. No agent reads everyone else's. The structure is an org chart, and it exists so the top of the fleet can stay sharp while the bottom stays cheap.

```
   HEAD          conductor
                 reads: the three manager caches. Nothing below them.
                    ▲
   MANAGERS      content-manager   social-manager   health-manager
                 read: their own executives' caches
                    ▲
   EXECUTIVES    drafters, editors, visual, publisher, syncers, appliers...
                 read: only their own cache
```

## Why it is shaped like this

A single shared cache grows until it fills the context window, and a fat context does not make better decisions, it makes confused ones. Splitting by tier means each agent carries only what it needs to act, and each level up carries only what the level below could not resolve itself.

The rule that keeps it honest: **everything in the fleet serves one goal, the one the conductor set.** A cache line that does not help someone act on that goal is noise, and noise is deleted.

## Tier 1: executive caches

`state/cache/exec/<agent>.md`. Written by the agent, read only by that agent and its manager.

What belongs: what this agent tried last run, what worked, what failed and the alternative it fell back to, and the specific craft details it would otherwise rediscover (which prompt phrasing got a clean scene, which caption length landed, which CMS field name the schema actually uses).

Nobody above the manager will ever read this, so it can be as concrete as the work is.

## Tier 2: manager caches

`state/cache/mgr/<manager>.md`. Written by the manager, read by that manager and the conductor.

Three managers, each owning a lane:

| Manager | Owns |
|---|---|
| `content-manager` | content-drafter, copy-editor, faq-syncer |
| `social-manager` | social-listener, social-drafter, social-visual, social-publisher, social-engagement |
| `health-manager` | per-publish, link-applier, indexing-checker, seo-audit, geo-steward, aeo-trend, social-performance |

A manager reads its executives' caches, decides what its lane does next within the conductor's goal, and writes up only what a head would need: decisions taken, what broke and which alternative was used, and the reasoning behind both. Not the craft detail. Not the run logs.

Managers are the reason the conductor does not need to know that a drafter prefers a certain caption length.

## Tier 3: the head cache

`state/HOT-CACHE.md`. Written by the conductor, read by the conductor and by any agent that needs the operator's standing strategy.

Holds: the operator's goal in their own words, active themes, traction, standing decisions, open questions. This is the file that answers "what are we all doing and why."

## The discipline

**No hard line limit at any tier, and that is not permission to sprawl.** Every line costs context on every future run, so the test for keeping a line is: would an agent act differently tomorrow because this line exists? No means delete it. Each writer prunes its own cache at the end of every run, and the monthly audit checks all three tiers for staleness.

**Escalate reasoning, not transcripts.** Moving up a tier, a cache entry should get shorter and more decision-shaped. "Tried A, it failed because X, used B instead, B holds" is a manager line. The three paragraphs of what A's error message said stay with the executive.

**One goal, always.** Every tier states its work in terms of the conductor's current goal. When an agent cannot connect its next action to that goal, that is not a cache problem, it is a planning problem, and it goes to the conductor as a question.
