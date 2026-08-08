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
      'hourly'  { $tr = New-ScheduledTaskTrigger -Once -At (Get-Date).Date; $tr.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1)).Repetition; $tr }
      'monthly' {
        # Real monthly trigger via schtasks (PS cmdlets lack a clean monthly
        # builder). The run-wrap day-gate is the belt to this suspenders, so a
        # daily fallback here would still be caught; but we register it monthly.
        $d = if ($s.day) { $s.day } else { '1' }
        schtasks /Create /TN $taskName /TR "`"$(Join-Path $PSScriptRoot 'run-agent.cmd')`" $agent" /SC MONTHLY /D $d /ST ($t) /F | Out-Null
        Write-Host "task     $taskName  monthly day $d $t (via schtasks)"
        $null  # skip the Register-ScheduledTask path below
      }
      default   { New-ScheduledTaskTrigger -Daily -At $t }
    }
  }
  if (-not $triggers) { continue }   # monthly already handled by schtasks
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Force | Out-Null
  Write-Host "task     $taskName  $($s.cadence) $($s.time)"
}

if (-not $Unregister) {
  Write-Host "`nBridge (if using the telegram adapter): register OTM-Bridge yourself or run:"
  Write-Host '  Register-ScheduledTask OTM-Bridge -Action (New-ScheduledTaskAction -Execute "node" -Argument "_host/telegram-bridge.mjs" -WorkingDirectory "<repo>") -Trigger (New-ScheduledTaskTrigger -AtLogOn)'
}
