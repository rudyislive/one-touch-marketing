# Tools

<!-- Capability slots -> what YOU actually have. doctor and /onboard fill this;
     edit it whenever your stack changes, then run /doctor. An empty slot is
     fine: the fleet degrades to handoff cards, it never stops. -->

## Bindings

| Capability slot | Bound to | How (MCP / API / none) |
|---|---|---|
| cms                | UNKNOWN | |
| seo-suite          | UNKNOWN | |
| image-gen          | UNKNOWN | |
| video-gen          | UNKNOWN | |
| compositor         | sharp (installed with the framework) | local |
| social-publish     | UNKNOWN | |
| social-listen      | public JSON endpoints + web search | none needed |
| platform-analytics | UNKNOWN | |
| product-analytics  | UNKNOWN | |

## Enabled social platforms

<!-- Profiles exist for: instagram, facebook, x, reddit, linkedin, pinterest.
     Add a platform by adding a profile file in packs/social/reference/platforms/. -->
- UNKNOWN

## Gate adapter

- adapter: git            <!-- git | in-agent | telegram -->
- on_approve: scheduled   <!-- scheduled | trigger-next -->
<!-- telegram only: chat_id here, bot token in .env as TELEGRAM_BOT_TOKEN -->
