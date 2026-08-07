# Fleet

<!-- Per-agent switchboard. "no" means: the scheduler never fires it, the
     conductor plans nothing for it, doctor reports it as off by choice.
     Flipping a row is the whole opt-out; nothing needs uninstalling.
     /onboard writes the initial table from the packs you chose. -->

| agent              | enabled | schedule override |
|--------------------|---------|-------------------|
| conductor          | yes     |                   |
| content-manager    | yes     |                   |
| social-manager     | yes     |                   |
| health-manager     | yes     |                   |
| verifier           | yes     |                   |
| reconciliation     | yes     |                   |
| monthly-audit      | yes     |                   |
| content-drafter    | UNKNOWN |                   |
| copy-editor        | UNKNOWN |                   |
| faq-syncer         | UNKNOWN |                   |
| per-publish        | UNKNOWN |                   |
| link-applier       | UNKNOWN |                   |
| indexing-checker   | UNKNOWN |                   |
| seo-audit          | UNKNOWN |                   |
| geo-steward        | UNKNOWN |                   |
| aeo-trend          | UNKNOWN |                   |
| social-listener    | UNKNOWN |                   |
| social-drafter     | UNKNOWN |                   |
| social-visual      | UNKNOWN |                   |
| social-publisher   | UNKNOWN |                   |
| social-engagement  | UNKNOWN |                   |
| social-performance | UNKNOWN |                   |
