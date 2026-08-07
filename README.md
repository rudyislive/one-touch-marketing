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

## Status

v0.1. The reference deployment runs in production at a fintech startup in India. The contract, the queue, the compositor and the placement doctrine are battle-tested; the packaging you are looking at is new. Issues and pull requests welcome.

MIT.
