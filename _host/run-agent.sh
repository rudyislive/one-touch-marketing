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

# The node wrapper enforces single-instance, the monthly day-gate, and a run
# timeout, identically on every OS and every trigger.
exec node "_host/run-wrap.mjs" "$AGENT" "$FILE"
