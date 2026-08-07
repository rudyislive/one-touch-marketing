---
name: add-pack
description: Install or remove a lane. Wires a pack's agents into FLEET.md and the schedules, resolves its capability slots, and closes with one real card from the new lane. Use when someone says add social, add seo, remove a pack, or turn off a lane.
---

# Add pack

Installing a lane is wiring plus proof, not ceremony.

## Install

1. Read the pack's `pack.yaml`: agents, state files, capability slots, schedule, seeds.
2. Add its agents to `binding/FLEET.md`, enabled, with the manifest's schedule. Create its state files that do not exist yet, empty scaffolding only, never invented content.
3. Copy any seeds the manifest names (the social pack copies its five visual-system seeds into `binding/VISUAL-SYSTEMS.md` if that section is still UNKNOWN).
4. Resolve the pack's capability slots exactly as the doctor skill does: session tools first, ranked alternatives, offer bindings, write accepted ones to `binding/TOOLS.md`. Anything unresolved is named plainly with its handoff cost; nothing about an empty slot delays the install.
5. If the pack needs anything asked (the social pack asks which platforms; enable what they name in `binding/TOOLS.md`), ask now, briefly.
6. Register the schedules with the host runner if one is set up; otherwise say the one command that will do it later.
7. **Close the loop**: run the lane's first drafting agent once, now, so a real card lands in `state/_QUEUE/pending/` and the operator sees the lane alive before the conversation ends.

## Remove

Flip the pack's agents to `no` in `binding/FLEET.md` and deregister their schedules. That is the whole removal: state files and history stay (they are the operator's record), nothing is deleted, and re-adding later is flipping the rows back. Say exactly that in one line so nobody fears the off switch.
