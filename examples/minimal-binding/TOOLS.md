# Tools

## Bindings

| Capability slot | Bound to | How |
|---|---|---|
| cms                | git-based publishing (site is Astro on GitHub Pages) | none |
| seo-suite          | (empty; audits run from public crawl) | |
| image-gen          | Higgsfield | MCP |
| video-gen          | (empty; stills with compositor motion) | |
| compositor         | sharp | local |
| social-publish     | Postiz, self-hosted | MCP |
| social-listen      | public JSON endpoints + web search | none |
| platform-analytics | Postiz-reported metrics | MCP |
| product-analytics  | PostHog | MCP |

## Enabled social platforms

- instagram
- x
- linkedin

## Gate adapter

- adapter: telegram
- on_approve: trigger-next
- chat_id: 123456789
