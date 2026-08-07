# Quickstart: fifteen minutes to your first card

## 1. Clone and install (2 min)

```
git clone <this repo>
cd one-touch-marketing
npm install
```

## 2. Open it in your agent runtime (1 min)

Claude Code is the tested reference: open the folder, that is all. Other runtimes: `runtimes/` has the mapping.

## 3. Say `/onboard` (10 min)

A conversation, not a form. It asks what you are building, what you want out in the world, how you sound, your house rules and posture, which lanes you want (SEO, social, both) and which platforms. It discovers your connected tools itself, binds substitutes where your first choice is missing, and never hands you a to-do list of connectors: **the system works with nothing connected**, it just hands you more of the last mile.

It ends by producing your first real draft into `state/_QUEUE/pending/`.

## 4. Approve it (2 min)

However you chose at onboarding:
- **git**: move the file to `state/_QUEUE/approved/`
- **in-agent**: say `/review-queue`
- **telegram**: it is already on your phone with buttons

That is the whole loop. From here the fleet runs on its schedules; you approve once a day; `/status` shows what ran and what waits.

## The commands

| Say | Get |
|---|---|
| `/onboard` | Set up, or resume setup |
| `/review-queue` | Approve and reject in conversation |
| `/status` | What ran, what waits, what broke |
| `/doctor` | What is connected, what runs anyway |
| `/add-pack` | Add or remove a lane |
| `/add-template` | New visual style from a reference or description |

## Where things live

| | |
|---|---|
| `binding/` | Yours. The only folder you edit. |
| `state/_QUEUE/` | pending → approved / rejected. The gate. |
| `state/IDEAS.md` | Drop anything here, any time; the conductor picks it up |
| `state/HOT-CACHE.md` | The fleet's working memory, capped at 90 lines |
| `state/reports/` | What the fleet found and did |
