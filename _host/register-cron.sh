#!/usr/bin/env bash
# register-cron.sh - print (or install) crontab lines from _host/schedules.json.
# Host-placement agents only. Prints by default; --install appends to crontab.
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "needs node"; exit 1; }

LINES=$(node -e '
const s = require("./schedules.json");
const dow = { monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, sunday:0 };
for (const [agent, e] of Object.entries(s)) {
  if (e.placement !== "host" || e.cadence === "manual") continue;
  for (const t of (e.time ?? "08:00").split(",")) {
    const [h, m] = t.split(":");
    let spec;
    if (e.cadence === "hourly")       spec = `0 * * * *`;
    else if (e.cadence === "weekly")  spec = `${m} ${h} * * ${dow[(e.day??"monday").toLowerCase()] ?? 1}`;
    else if (e.cadence === "monthly") spec = `${m} ${h} ${e.day ?? 1} * *`;
    else                              spec = `${m} ${h} * * *`;
    console.log(`${spec} cd $(pwd)/.. && _host/run-agent.sh ${agent}`);
  }
}
console.log(`@reboot cd $(pwd)/.. && node _host/telegram-bridge.mjs # gate bridge (telegram adapter only)`);
')

if [[ "${1:-}" == "--install" ]]; then
  (crontab -l 2>/dev/null | grep -v 'one-touch-marketing-otm'; echo "$LINES") | crontab -
  echo "installed."
else
  echo "$LINES"
  echo ""
  echo "(re-run with --install to write these into your crontab)"
fi
