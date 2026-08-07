# Claude Code (tested reference runtime)

This framework was built and QA'd in Claude Code. Everything maps natively:

- **Skills**: symlink or copy `core/skills/` into `.claude/skills/` at the repo root (or open the repo and let the project pick them up). `/onboard`, `/doctor`, `/review-queue`, `/add-pack`, `/add-template`, `/status` become slash commands.
- **Agents**: the files in `core/agents/` and `packs/*/agents/` are agent prompts. Headless runs go through `_host/run-agent.cmd|sh <name>`, which invokes `claude -p` with a thin pointer at the file; interactive runs are just "run one cycle of <agent>" in a session.
- **Scheduling**: host-placement agents register as OS tasks (`_host/register-tasks.ps1` or `register-cron.sh`). Cloud-placement agents run as cloud routines: create one routine per agent, prompt is the same one-line pointer, and attach that agent's connectors to the routine. Connectors attach per routine, not globally; a connector missing from a routine's own list is invisible to that run.
- **MCPs**: bind them in `binding/TOOLS.md`; agents discover what their session actually has and degrade per the contract when it is absent.

One honest caveat: local stdio MCP servers are typically not attachable to cloud routines. That is exactly why the placement doctrine exists; keep anything that needs one on the host schedule.

Setup from zero: `npm install`, open the repo in Claude Code, say `/onboard`.
