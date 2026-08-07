# Browser generation: the free image path

When no image API is bound, `social-visual` does not fall back to asking the operator to draw something. It drives their own browser.

The trade, stated to the operator once and never nagged about again:

| | Paid API path | Browser path |
|---|---|---|
| Cost | credits per image | free, on an allowance they already have |
| Speed | seconds, unattended | slower, a browser session per image |
| Placement | cloud-safe | host-only, needs a real signed-in browser |
| Output | identical | identical, once composited |

Both paths are fully automated. The free one just takes longer and holds the machine while it runs.

## Preflight, in this order

1. **Is browser automation available in this session?** No: this path is unavailable, fall through to the next alternative and say so.
2. **Is the extension actually connected to a browser?** Ask for the tab context before assuming. If the extension is not installed, the card tells the operator exactly that, with the one link to install it, and offers the manual path meanwhile. Never fail silently here; a missing extension is the single most likely reason this path breaks.
3. **Which surface?** `binding/TOOLS.md` names their preference (Gemini or ChatGPT). Absent, default to Gemini: image generation is available on a free account, which is the whole point of this path.
4. **Are they signed in?** Open the surface and check. Not signed in: stop, and card them one line asking them to sign in to that surface in this Chrome profile. Never attempt a sign-in, never touch credentials.

Each of these failures is a DEGRADE with a specific, actionable card, not a BLOCK.

## The run

1. Open a new tab on the chosen surface.
2. Paste **the same scene prompt the paid path would use, unchanged**, including the no-text clause. The prompt is the template's, not the surface's; keeping it identical is what makes the two paths interchangeable.
3. Wait for the generation. Do not retry into a second generation on a slow response; that burns their allowance twice for one image.
4. Download the result to `state/assets/<slug>/`.
5. Verify what landed: right subject, no accidental text, room where the type block goes. Wrong: one corrected regeneration, then FLAG.
6. Hand off to the compositor exactly as the paid path does.

## Composition notes specific to this path

Generated images from consumer surfaces often carry a mark in a corner. The compositor's `crop` field trims a margin before the brand layer goes on, which is ordinary composition work: the brand's own footer lockup occupies that space in every template anyway.

As with every path through the compositor, the output is a new composite, so the source file's provenance metadata does not survive re-encoding. That is a property of compositing, not a feature, and it says nothing about platform-side classifiers or invisible watermarking, which are unaffected. Do not tell the operator this path makes their posts undetectable, because it does not.

## Ledger

Note in the visual agent's cache which path produced each asset and roughly how long it took. The social manager tracks that as operator-effort cost, and it is exactly the kind of thing that should surface when the operator is deciding whether to pay for an API.
