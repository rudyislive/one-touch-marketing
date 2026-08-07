# Capability matrix: what each agent needs, and what it does without it

`node tools/doctor.mjs` gives you this live for your machine; this page is the map. No agent on this table stops working when a capability is absent. The column on the right is what you get instead.

## core

| Agent | Needs | Without it |
|---|---|---|
| conductor | web-research | Plans from the hot cache, ideas inbox and saved research; says which layers went unrefreshed |
| reconciliation | nothing | Full function on files + public fetches |
| monthly-audit | nothing | Full function on files |

## seo

| Agent | Needs | Without it |
|---|---|---|
| content-drafter | cms, web-research | Complete piece arrives as a paste-ready card; citations marked needed |
| copy-editor | cms | Edited piece arrives as a card with a diff summary |
| faq-syncer | cms | FAQ entries arrive as cards with paste-ready fields |
| per-publish | cms | Verifies from the public sitemap/feed; cms-only fields marked UNAVAILABLE |
| link-applier | cms | Paste-ready edit instructions per target page |
| indexing-checker | browser | Card lists exact console URLs and a fill-in table; ten minutes monthly |
| seo-audit | seo-suite | Public-crawl checks run; suite-only checks named as not run |
| geo-steward | seo-suite (partial) | Manual page-source schema pass, noted in the report |
| aeo-trend | seo-suite | Handoff card with paste-in prompts and a fill-in table that feeds the next run |

## social

| Agent | Needs | Without it |
|---|---|---|
| social-listener | social-listen (no-auth default) | Sweeps what public endpoints and search reach; names unswept platforms |
| social-drafter | nothing | Full function; performance feedback noted absent if missing |
| social-visual | image-gen, compositor | Scene-free templates (carousel) run at full quality; scene templates ship the complete prompt for anywhere-generation |
| social-publisher | social-publish | MANUAL-POST cards: asset paths, captions, times, per-platform steps; under a minute per item |
| social-engagement | social-listen (no-auth default) | Sweeps reachable surfaces, drafts replies; human sends either way by design |
| social-performance | social-publish or platform-analytics or product-analytics | Ledger-only readout, coverage named as manual and partial |

## The floor

Nothing connected at all: every drafting agent still drafts, every card still carries finished work, the gate still gates, and the human executes last miles from paste-ready instructions. Connecting tools removes manual steps; it never gates whether the system works.
