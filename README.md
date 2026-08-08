# one-touch-marketing

**AI drafts everything. You approve once a day. Machines ship it.**

A fleet of small, scoped agents runs your search, content and social marketing. Everything they produce stops at one gate: you, phone in hand, once a day. One touch, because zero-touch gets you punished by every platform you publish into.

## Why one touch and not zero

The bottleneck on full marketing automation is not AI output quality. It is that the platforms you publish into detect and punish zero-human pipelines. Google's scaled-content enforcement cuts sites that mass-publish without review. Mailbox providers score senders. The big social platforms label, throttle and ban. The winning architecture keeps a human at exactly one choke point and automates everything on both sides of it:

```
agents draft ──► ★ you approve, once a day ──► machines execute and measure
```

Roughly 80 to 85 percent of the labour automates. What stays human is strategy, relationships and the daily gate. That gate is not a compromise; it is what keeps your rankings, deliverability and accounts alive.

## What is in the box

| | |
|---|---|
| `core/` | The operating contract every agent obeys, the conductor that plans, the approval queue |
| `packs/seo/` | Nine agents: drafting, editing, FAQ syncing, publish verification, internal links, indexing checks, technical audits, AI-answer presence |
| `packs/social/` | Six agents: listening, drafting, visuals, scheduling, engagement drafts, performance readback |
| `binding/` | The only folder you edit. Who you are, how you sound, your rules, your tools |
| `tools/` | `doctor` (what is connected, what runs anyway), `compose` (the brand layer for visuals) |

Every agent runs under a 16-rule operating contract built around the two ways autonomous agents fail: hallucinating and breaking. Facts only from files read this run. Numbers only from tools. One unit of work per run. Never publish without approval. Finish loud or write a blocker.

## It works before you connect anything

Clone it, run `/onboard`, connect nothing. The fleet still runs: it plans, drafts, illustrates and reasons, and the last mile arrives as cards with paste-ready steps. Every connector you add later removes manual steps; none of them are required to start.

`node tools/doctor.mjs` tells you at any moment what is connected, what is running on a substitute, and what is in handoff mode.

## Recommended connectors

Each lane has a best pick and free alternatives. Full list with alternatives in [docs/CONNECTORS.md](docs/CONNECTORS.md); `/onboard` binds what you already have.

| Lane | Connect first (★) | Free fallback |
|---|---|---|
| **Website content** | **WordPress MCP** or **Hostinger MCP** (manage your site's content) | Git-based publishing, or paste-ready cards |
| Images / video | Higgsfield MCP | Claude in Chrome → your Gemini/ChatGPT, or local |
| Social scheduling | Postiz MCP (self-hostable) | Manual post from the card |
| SEO / AI-answer tracking | Ubersuggest or Semrush MCP | Search Console + public crawl |
| Analytics | PostHog MCP | Platform-native + scheduler metrics |
| Listening | Public JSON + web search (no account) | already free |
| Approval gate | Telegram (own bot) for phone approval | Git, or in-agent `/review-queue` |

**If you run a website, connect your CMS first.** WordPress MCP or Hostinger MCP, whichever matches where your site lives. That is where drafts land for one-tap approval.

## Install, one line

**In Claude Code** (recommended):

```
/plugin marketplace add rudyislive/one-touch-marketing
```

then `/plugin install one-touch-marketing`, and say `/onboard`.

**Anywhere else:**

```
npx github:rudyislive/one-touch-marketing init
```

That copies the framework in, installs dependencies, prints what you have connected, and stops. Then open the folder in your agent runtime and say `/onboard`.

Onboarding is a conversation, not a config file: what you are building, what you want out in the world, how you sound, which lanes and platforms you want. It discovers your tools itself and ends by putting a real draft in front of you. Nothing needs to be connected first.

The onboarding is an interview, not a config file. It asks what you are building, what you want out in the world, how you sound and who approves; it discovers your tools itself; and it ends by producing your first real draft, so you see the whole loop close in your first session.

## Updating

Installs are snapshots; nothing auto-updates. To pull a newer version into an existing install:

```
npx github:rudyislive/one-touch-marketing update
```

It refreshes the framework code and leaves your `binding/` (identity, voice, tools), your `state/` (queue, ledgers, cache, ideas) and your `.env` untouched. Any new binding file a version adds is dropped in without overwriting yours. Installed as a Claude Code plugin? `/plugin update one-touch-marketing`. Cloned with git? `git pull` (stash your `binding/` edits first, since those files are tracked).

## Status

v0.1. The reference deployment runs in production at a fintech startup in India. The contract, the queue, the compositor and the placement doctrine are battle-tested; the packaging you are looking at is new. Issues and pull requests welcome.

MIT.
