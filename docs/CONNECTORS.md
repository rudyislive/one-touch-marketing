# Recommended connectors

Each capability the fleet uses has a **priority pick** (what we run and recommend) and **alternatives** beneath it. You never need all of them. Connect the priority pick for a lane you care about; skip the rest and the fleet hands you the last mile as a card. `/onboard` and `node tools/doctor.mjs` walk this list for you and bind what you already have.

Priority picks are marked ★. Free / no-account options are marked ○.

---

## Website content (the `cms` slot), the one to connect first

This is where your blog posts, FAQs and pages land as drafts for review. If you run a website, connect this before anything else.

- ★ **WordPress MCP.** If your site is WordPress, this is the priority. The fleet drafts straight into WordPress as unpublished drafts; you approve, it publishes. Nothing touches your live site without the gate.
- ★ **Hostinger MCP.** If your site is hosted on Hostinger (WordPress or otherwise), this manages content and the site together from one connector. Equal priority with WordPress MCP; pick whichever matches where your site lives.
- Any other CMS with an MCP or a write API (Webflow, Ghost, Sanity, Contentful, a headless CMS): bind its endpoint in `binding/TOOLS.md`. The pipeline is identical.
- ○ **Git-based publishing.** A static site (Astro, Hugo, Next on Pages) whose content is files in a repo. The draft is a file and a pull request; merging is publishing. No account, no key.
- ○ **Markdown to queue.** Connect nothing. Finished posts arrive as cards with paste-ready front matter and body. Zero setup, one paste to publish.

## Images and video (the `image-gen` / `video-gen` slots)

- ★ **Higgsfield MCP.** Priority. Fastest, strongest for cinematic and 3D-character work, fully unattended. One call per scene. Paid.
- ○ **Browser generation via Claude in Chrome.** The free path, and a real one. Drives your own signed-in Gemini or ChatGPT tab with the same prompt, downloads the result, composites it identically. Slower and host-only; runs on your existing free allowance. Needs the Chrome extension.
- Any image-generation HTTP API, bound in `binding/TOOLS.md`.
- ○ **Local diffusion runtime.** Fully offline, uses your own compute, no account.

The framework always renders the brand layer (headline, logo, footer) locally over the generated scene, so text is never baked into the image and stays editable.

## Scheduling and publishing social (the `social-publish` slot)

- ★ **Postiz MCP.** Priority. Self-hostable, posts to every major platform from one API, reports reach and engagement back for the analytics lane. Free to self-host.
- Any scheduler with a write API (Buffer, Hypefury, a white-label scheduler).
- Platform-native APIs, bound per platform. More setup, no middleman.
- ○ **Manual.** The card carries the finished asset, the caption, the hashtags, the alt text, the platform and time. Copy, paste, post. Under a minute per item.

## SEO and AI-answer tracking (the `seo-suite` slot)

- ★ **Ubersuggest MCP.** Priority for site audits, rank tracking and AI-visibility tracking. Verified working end to end.
- **Semrush MCP.** Equivalent depth; use whichever you already pay for.
- ○ **Search Console + public crawl via WebFetch.** Thinner signal, no cost. Audits degrade to what is publicly crawlable, and the reports name exactly which checks needed a suite and did not run.

## Analytics (the `product-analytics` / `platform-analytics` slots)

- ★ **PostHog MCP.** Priority for product analytics: what visitors from a post actually did next. Generous free tier.
- Any product-analytics API.
- Platform-native insights and scheduler-reported metrics for reach and engagement (Postiz already reports these back, so connecting it covers most of this slot).

## Listening (the `social-listen` slot)

- ○ **Public JSON endpoints + web search.** The default, no account, works out of the box. Covers most of what the listener and engagement agents need.
- Browser automation for surfaces with no read API (host-only).
- A dedicated social-listening platform API, if you have one.

## The approval gate (not a capability slot, but a connector choice)

- ○ **Git.** Default, zero setup. Approve by moving a file or merging a pull request.
- ○ **In-agent.** `/review-queue`, decide in the conversation. No external service.
- **Telegram / Slack / Discord.** Approve from your phone. Needs a bot token. **Give this framework its own bot**: one bot token serves exactly one bridge (see `core/GATE-ADAPTERS.md`).

---

## The shortest path to a working system

1. Connect your **CMS** (WordPress or Hostinger MCP) if you have a site.
2. Connect **Higgsfield** for images, or use the free Chrome path.
3. Connect **Postiz** if you want social scheduled rather than pasted.
4. Everything else is optional; the fleet degrades cleanly around it.

Connect nothing and it still runs: it drafts, plans, illustrates and reasons, and hands you paste-ready cards. Every connector you add removes manual steps; none are required to start.
