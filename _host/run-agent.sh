#!/usr/bin/env bash
# run-agent.sh <agent-name> - headless single run of one agent, unix.
# Thin pointer per the framework rule: triggers never carry prompts.
# Requires the claude CLI (or set OTM_RUNNER in .env to any equivalent).
set -euo pipefail
cd "$(dirname "$0")/.."
AGENT="${1:?usage: run-agent.sh <agent-name>}"

FILE=""
for d in core/agents packs/seo/agents packs/social/agents; do
  [[ -f "$d/$AGENT.md" ]] && FILE="$d/$AGENT.md"
done
[[ -z "$FILE" ]] && { echo "unknown agent: $AGENT"; exit 1; }

mkdir -p _host/logs
PROMPT="Run one complete run of the agent defined in $FILE. Read that file and core/AGENT-OPERATING-CONTRACT.md first, then do exactly one run's work and exit per its completion criteria."

"${OTM_RUNNER:-claude}" -p "$PROMPT" > "_host/logs/$AGENT-last-run.log" 2>&1
