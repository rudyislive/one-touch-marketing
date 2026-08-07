---
name: doctor
description: Full capability check with the half a script cannot see. Runs tools/doctor.mjs, resolves the MCP and connector slots against the live session, reports per agent, and offers to bind alternatives. Use when someone says doctor, what is connected, or a connector changed.
---

# Doctor

`node tools/doctor.mjs --json` gives you the mechanical half: binaries, modules, env keys, plus every slot it marked `unknown` because only a running agent can see which MCP servers and connectors this session actually has. You are the running agent; finish the job.

## The pass

1. Run the script, parse the JSON.
2. For each `unknown` slot, check your own available tools for the named alternatives, in the manifest's ranked order. First match wins the binding.
3. For each slot that resolves to a **substitute** or to **nothing**, check the ranked alternatives against what the operator has that they have not bound: an MCP present in the session but missing from `binding/TOOLS.md` is the classic case. Offer the binding in one line each; on a yes, write it to `binding/TOOLS.md` (rule 9 verified).
4. Report per pack, per slot: green (first choice), amber (substitute, name what the first choice would add), red (handoff mode, name which agents hand off and what the manual path costs in minutes), off (disabled in FLEET.md, by choice, not a problem).
5. Close with the one connection that would remove the most manual work, if any. One line. No lecture.

Never ask for a credential or key; name where it goes (`.env`, the tool's own connector UI) and let them put it there. Re-run yourself after any binding change so the report they end with is the report that is true.
