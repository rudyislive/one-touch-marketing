# Any other runtime

The framework's entire contract with its runtime is small, deliberately:

1. It can read and write files in this repo.
2. It can follow a prose prompt (the agent files) faithfully, one run at a time.
3. Ideally it can search and fetch the web; every path that needs this degrades if it cannot.
4. Whatever external tools you have (a CMS, a scheduler, an image model) are reachable by it somehow: MCP, API, or not at all, in which case the fleet hands you cards instead.

If your runtime can do 1 and 2, the system works: agents produce work, the queue gates it, you execute the last mile from the cards. 3 and 4 remove manual steps.

Set `OTM_RUNNER` in `.env` to your runtime's headless one-prompt command and the host runners and bridge re-launching work unchanged.
