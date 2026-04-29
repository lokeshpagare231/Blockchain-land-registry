@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Stopping Land Registry services...
for %%P in (3000 4000 8001 8545) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P " ^| findstr "LISTENING"') do (
    if not "%%A"=="0" taskkill /PID %%A /F >nul 2>nul
  )
)

echo Done.
exit /b 0

