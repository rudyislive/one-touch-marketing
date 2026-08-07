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

if not exist _host\logs mkdir _host\logs
set PROMPT=Run one complete run of the agent defined in %FILE%. Read that file and core/AGENT-OPERATING-CONTRACT.md first, then do exactly one run's work and exit per its completion criteria.

if defined OTM_RUNNER (
  %OTM_RUNNER% "%PROMPT%" > _host\logs\%AGENT%-last-run.log 2>&1
) else (
  claude -p "%PROMPT%" > _host\logs\%AGENT%-last-run.log 2>&1
)
endlocal
