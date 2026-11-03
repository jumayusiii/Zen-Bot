@echo off
setlocal EnableExtensions

rem Runs the PM2 watchdog from Task Scheduler every five minutes.
rem Scheduled as "Zen Bot Watchdog (Freebuff)"; see README helper scripts.

set "BASE=%~dp0.."
set "LOG_DIR=%BASE%\logs"
set "FAIL_LOG=%LOG_DIR%\watchdog-task.log"
if not defined TEMP set "TEMP=%LOG_DIR%"
set "LAST_RUN=%TEMP%\zen-watchdog-last-run.log"

set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node.exe"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
if errorlevel 1 exit /b 1

cd /d "%BASE%" >nul 2>&1
if errorlevel 1 exit /b 1

"%NODE_EXE%" scripts\watchdog.js --timeout 90 %* > "%LAST_RUN%" 2>&1
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  >>"%FAIL_LOG%" echo [%DATE% %TIME%] watchdog exited with code %CODE%
  >>"%FAIL_LOG%" type "%LAST_RUN%"
  >>"%FAIL_LOG%" echo.
)

del "%LAST_RUN%" >nul 2>&1
exit /b %CODE%
