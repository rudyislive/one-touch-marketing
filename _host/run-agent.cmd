@echo off
rem run-agent.cmd <agent-name> - headless single run of one agent, Windows.
rem Thin pointer per the framework rule: triggers never carry prompts.
rem Requires the claude CLI (or set OTM_RUNNER in .env to any equivalent).
setlocal
cd /d "%~dp0.."
if "%~1"=="" ( echo usage: run-agent ^<agent-name^> & exit /b 1 )

set AGENT=%~1
set FILE=
for %%d in (core\agents packs\seo\agents packs\social\agents) do (
  if exist "%%d\%AGENT%.md" set FILE=%%d\%AGENT%.md
)
if "%FILE%"=="" ( echo unknown agent: %AGENT% & exit /b 1 )

rem Single-instance + timeout are enforced by a tiny node wrapper so the same
rem discipline holds whether the trigger is Task Scheduler, the bridge, or a
rem human. The wrapper writes a run marker, honors a monthly day-gate, and
rem kills a run that overruns OTM_RUN_TIMEOUT_MIN (default 20).
node "_host\run-wrap.mjs" "%AGENT%" "%FILE%"
exit /b %ERRORLEVEL%
