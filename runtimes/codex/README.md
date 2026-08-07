# Codex (documented, not yet verified)

Honest label: the authors run this framework in Claude Code. Nothing here is Claude-specific by design, but this mapping has not been verified end to end in Codex. If you run it there, a report of what broke (or did not) is a welcome first issue.

The mapping:

- **Agents** are plain-prose prompt files with YAML frontmatter. Run one cycle by pointing your agent at the file: "Run one complete run of the agent defined in <path>. Read that file and core/AGENT-OPERATING-CONTRACT.md first." Set `OTM_RUNNER` in `.env` to your CLI's headless-prompt command and the `_host/` runners use it instead of `claude`.
- **Skills** are instruction files; load `core/skills/<name>/SKILL.md` into context and follow it. There is nothing executable inside them.
- **The contract, the queue, the state bus** are files and folders; no runtime feature is involved.
- **Tools**: `doctor`, `compose` and `install-pack` are plain Node, runtime-independent. The bridge is plain Node too.

What genuinely needs a capable runtime: WebSearch/WebFetch equivalents for the research paths (degrade cleanly if absent), and MCP or API access for whatever you bind in `binding/TOOLS.md`.
