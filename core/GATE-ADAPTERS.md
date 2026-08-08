# The gate, and its adapters

The gate's entire contract is one sentence: **a human decision moves a file.** Everything else here is transport.

Three kinds of file flow through the gate, not one:

| Kind | Written by | Lives in | The human's move |
|---|---|---|---|
| **Approval card** | Any drafting agent | `state/_QUEUE/pending/` | Approve, reject, or approve with a note |
| **Failure card** | Any agent that hit BLOCK, FAIL or FLAG | `state/reports/` (BLOCKED-\*, FLAG noted on the card) | Read it, optionally reply with an instruction |
| **Alert** | Any agent that hit HALT | `state/reports/ALERT-\*` | Unlock the lane, or leave it halted |

A gate adapter is anything that (a) shows these files to a human wherever they are, and (b) writes their decision back as a file move or an instruction file. All adapters are optional and interchangeable; the fleet only ever sees the filesystem.

## The instruction protocol

This is what makes the gate two-way instead of a rubber stamp.

When a human replies to **any** card with free text, the adapter writes it to:

```
state/_QUEUE/instructions/<agent>.md
```

appending one dated block per reply:

```
## 2026-08-08 07:41
INSTRUCT: <exactly what the human typed>
(re: <the card or report filename this replied to>)
```

**Instructions are binding input, with the same force as `APPROVED WITH NOTE`.** Every agent reads its own instruction file at the start of every run, right after the contract's capability check:

- An instruction that addresses the failed or pending item is applied to that item, exactly, before anything else. If it conflicts with the agent file's default, the instruction wins.
- An instruction that is genuinely ambiguous is rule-2 territory: the agent writes back a card naming the ambiguity rather than guessing.
- Applied instructions are marked done in the file (the agent appends `-> applied <date>` to the block, rule 9 verified) so they never apply twice.

This is how a blocked agent gets unblocked from a phone: the failure card arrives, the human reads it standing in a queue, types one line ("use the July numbers", "skip that item", "the key is in .env now, retry"), and the next run picks it up as gospel.

## Shipped adapters

### `git` (default, zero setup)
Pending cards are files; approve by moving the file, or merge the pull request that carries it. Failure cards are visible in the repo. Instructions are written by hand into the instructions file. Works for everyone, everywhere, with nothing configured.

### `in-agent` (zero setup)
`/review-queue` in any session: shows each pending card inline in full, takes approve / reject / a note / an instruction conversationally, and does the file moves itself. The natural adapter while you are already at the desk.

### `telegram` (reference chat bridge, interactive)

A host-side bridge that makes the chat a full control surface, not a notification feed. It runs persistent on the host (long-polling by default, so messages land in under a second with no public URL; webhook mode is a config flag for operators who have an HTTPS endpoint; behavior is identical either way).

**Outbound.** Every new pending card arrives in the chat as the decision itself: the banner as a photo, the SUMMARY block and the full copy as the message body, Approve and Reject buttons under it. The human decides entirely in the chat, on a phone. Failure cards and alerts arrive as plain messages.

**Inbound routing.** Three cases, no configuration:
- A **button tap or reply to a card** routes to the agent that owns that card.
- A **standalone message** is appended verbatim to `state/IDEAS.md`, the conductor's inbox. Texting the bot an idea is the same as telling the orchestrator in a session.
- A message starting **`@agent-name`** routes to that agent's instruction file directly.

**The rework loop.** This is the part that makes the gate interactive rather than binary:

1. Reject with typed text: the bridge moves the card to `rejected/` with the reason line, writes the text as an `INSTRUCT` block, and **re-launches the owning agent headlessly on this machine, immediately**.
2. The agent reworks under the instruction (which is binding, and answered explicitly in the new card per the contract), and the v2 card lands back in the chat, usually within a few minutes.
3. The loop repeats until the human approves. Only then does the item exist in `approved/`, and only `approved/` is visible to any downstream agent, so nothing later in the pipeline can start early. The sequencing is structural, not behavioral.
4. `binding/GUARDRAILS.md` caps rework cycles per item per day (default 5), so a misfiring loop cannot burn the operator's account limits. Hitting the cap parks the item with a failure card.

**Approval can chain.** `on_approve: trigger-next` in the bridge config fires the downstream agent the moment its input is approved (visual after copy, publisher after visual), collapsing the draft-to-scheduled loop into minutes when the human is responsive. Off by default; the scheduled cadence is the fallback either way.

**One bot token serves exactly one bridge.** Telegram's `getUpdates` is a consuming, single-reader operation: if two processes poll the same token, whichever polls first eats each update and the other never sees it. So do not point this bridge at a bot token another bridge (or another copy of this one) is already polling; taps vanish silently with no error. Give this framework its own bot from BotFather. The bridge does not detect the conflict for you, because from its side the collision is indistinguishable from an empty queue.

Setup: a bot token in `.env`, the chat id in `binding/TOOLS.md`, the bridge process registered by the host runner. Host-side for the same reason the publisher is: it watches this machine's queue, and this machine is where approved work executes and where rework re-launches. The same pattern ports to Slack or Discord by swapping the send and receive calls; documented, not shipped.

## Opting agents out

Every agent is individually switchable in `binding/FLEET.md`:

```
| agent            | enabled | schedule override |
|------------------|---------|-------------------|
| social-listener  | yes     |                   |
| social-engagement| no      |                   |
| seo-audit        | yes     | monthly day 15    |
```

Disabled means: the scheduler never fires it, the conductor never plans work for it, `doctor` reports it as `off by choice` rather than degraded, and nothing downstream treats its absence as a failure. `/onboard` writes the initial table from what the operator picks; editing the table is the whole opt-out mechanism, no uninstall required.
