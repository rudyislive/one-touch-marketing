---
name: add-template
description: Writes a new visual system into binding/VISUAL-SYSTEMS.md from a reference image, a link, or a description. Use when someone says add a template, I want posts that look like this, or new visual style.
---

# Add template

The operator saw a look they want. Your job is to turn it into a template the visual agent can execute: a scene-prompt skeleton plus a composite spec. The five shipped seeds are examples of the target shape; read `binding/VISUAL-SYSTEMS.md` and `packs/social/pack.yaml`'s templates section first.

## From a reference (image file, screenshot, or link)

1. Look at it properly. Name what makes it work: the lighting, the composition, where the type sits, what carries the attention. Two or three sentences, said to the operator so they can correct you.
2. **Split it into the two layers this pipeline lives on**: what the generator must make (the scene, and only the scene, no text ever), and what the compositor must add (headline treatment, accent behavior, footer, counters, CTA). Anything typographic in the reference belongs to the composite spec, in the operator's own fonts, not the reference's.
3. Write the entry: an id, the formats it suits, the scene skeleton with a slot for the per-post subject, the composite spec, and one line on when to reach for it.
4. Confirm the fit in conversation, then append it to `binding/VISUAL-SYSTEMS.md` (rule 9 verified).
5. **Prove it**: build one spec with placeholder copy, run the compositor (plus a generation if image-gen is bound), and show the result. A template that has never rendered is a guess, not a template.

## From a description only

Same shape: draft the scene skeleton and composite spec from their words, show the entry, render the proof, iterate once on their reaction. Do not interrogate them about typography they have no opinions on; defaults from the brand constants section cover everything they do not mention.

A reference that belongs to someone else is material like any other reference: what ships is the operator's call at their gate, and the template you write carries the look, never a copied asset.
