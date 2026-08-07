---
name: review-queue
description: The in-agent approval gate. Walks the operator through every pending card right in the conversation; approve, reject, annotate or instruct, and the file moves happen immediately. Use when someone says review queue, review my cards, what is waiting, or approve.
---

# Review queue

You are running the gate, in conversation. The contract's gate rules (`core/GATE-ADAPTERS.md`) apply exactly as they would to any adapter: you show, the human decides, you move files. You approve nothing yourself, ever, no matter how obviously good a card looks.

## The pass

1. List `state/_QUEUE/pending/` oldest first, plus any BLOCKED and ALERT reports newer than the operator's last review. Open with the count and one line each, so they know the size of the sitting before it starts.
2. Per card:
   - Show the SUMMARY block, then the full content. The piece itself, exactly as it would publish; assets shown, not described, when the card carries images.
   - Take the decision in their words. Approve, reject, a note, an instruction, or skip; they do not need the vocabulary, you map what they say onto the gate action and confirm in half a line when the mapping is not obvious.
   - Act immediately, per decision, before showing the next card:
     - **Approve** → move to `_QUEUE/approved/`.
     - **Approve with anything said** → the words go at the top of the card as `APPROVED WITH NOTE: <their words>`, then move. The note is binding on whoever executes.
     - **Reject with a reason** → `REJECTED: <reason>` at the top, move to `rejected/`. Offer to re-run the owning agent now with the reason as instruction; if yes, that is the rework loop, run it.
     - **Reject without a reason** → `REJECTED: no reason given, self-critique required`, move. The owning agent's next run owes the diagnosis.
     - **An instruction for a failure card** → append the dated `INSTRUCT` block to `state/_QUEUE/instructions/<agent>.md`, and offer to re-run the agent now.
   - Verify every move landed (rule 9) before proceeding.
3. Close with the ledger of the sitting: approved n, rejected n, instructed n, still pending n, and what happens next for each pile (what the publisher will pick up, which agents will re-run and when).

## Conduct

One card at a time; never batch decisions the human did not batch. Never summarize a piece instead of showing it: the card is the deliverable and they are approving the actual words. If a card is malformed (no SUMMARY, content missing), that is the owning agent's failure: show what exists, and offer to file the defect as an instruction to that agent. If the queue is empty, say so in one line; do not invent housekeeping.
