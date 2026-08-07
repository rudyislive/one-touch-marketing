# register-tasks.ps1 - create Windows scheduled tasks from _host/schedules.json.
# Host-placement agents only; cloud-placement rows are listed for you to create
# as routines in your agent runtime's own scheduler. Re-run any time; existing
# tasks are replaced. Remove with -Unregister.
param([switch]$Unregister)

$root = Split-Path $PSScriptRoot -Parent
$schedules = Get-Content (Join-Path $PSScriptRoot 'schedules.json') -Raw | ConvertFrom-Json
$prefix = 'OTM-'

foreach ($agent in $schedules.PSObject.Properties.Name) {
  $s = $schedules.$agent
  $taskName = "$prefix$agent"

  if ($Unregister) {
    try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
          Write-Host "removed $taskName" } catch {}
    continue
  }
  if ($s.placement -ne 'host') { Write-Host "cloud    $agent  (create as a routine in your runtime's scheduler)"; continue }
  if ($s.cadence -eq 'manual') { Write-Host "manual   $agent  (run on demand: _host\run-agent.cmd $agent)"; continue }

  $action = New-ScheduledTaskAction -Execute (Join-Path $PSScriptRoot 'run-agent.cmd') -Argument $agent -WorkingDirectory $root
  $times = ($s.time ?? '08:00') -split ','
  $triggers = foreach ($t in $times) {
    switch ($s.cadence) {
      'daily'   { New-ScheduledTaskTrigger -Daily -At $t }
      'twice'   { New-ScheduledTaskTrigger -Daily -At $t }
      'weekly'  { New-ScheduledTaskTrigger -Weekly -DaysOfWeek ($s.day ?? 'Monday') -At $t }
      'monthly' { New-ScheduledTaskTrigger -Daily -At $t }  # gated below
      default   { New-ScheduledTaskTrigger -Daily -At $t }
    }
  }
  # monthly: schtasks monthly triggers are awkward from PS; the runner itself
  # no-ops unless it is the configured day, which the agent's own idempotency
  # (rule 8) already guarantees. Documented, not hidden.
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Force | Out-Null
  Write-Host "task     $taskName  $($s.cadence) $($s.time)"
}

if (-not $Unregister) {
  Write-Host "`nBridge (if using the telegram adapter): register OTM-Bridge yourself or run:"
  Write-Host '  Register-ScheduledTask OTM-Bridge -Action (New-ScheduledTaskAction -Execute "node" -Argument "_host/telegram-bridge.mjs" -WorkingDirectory "<repo>") -Trigger (New-ScheduledTaskTrigger -AtLogOn)'
}
