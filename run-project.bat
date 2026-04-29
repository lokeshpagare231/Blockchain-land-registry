@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "APPDATA=%~dp0.local-appdata\Roaming"
set "LOCALAPPDATA=%~dp0.local-appdata\Local"
if not exist "%APPDATA%" mkdir "%APPDATA%" >nul 2>nul
if not exist "%LOCALAPPDATA%" mkdir "%LOCALAPPDATA%" >nul 2>nul

set "AI_ENABLED=1"
set "NEED_DEPLOY=0"
set "RESET_CHAIN=0"
if /I "%~1"=="fresh" set "RESET_CHAIN=1"
if /I "%~1"=="seed" set "NEED_SEED=1"
if /I "%~2"=="seed" set "NEED_SEED=1"

echo ===============================================
echo   Blockchain Land Registry - Fast Starter
echo ===============================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo Install Node.js and try again.
  goto :fail
)

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] python is not available in PATH.
  echo Install Python and try again.
  goto :fail
)

call :require_path "smart-contracts\node_modules" "smart-contracts dependencies"
if errorlevel 1 goto :fail
call :require_path "backend\node_modules" "backend dependencies"
if errorlevel 1 goto :fail
call :require_path "frontend\node_modules" "frontend dependencies"
if errorlevel 1 goto :fail

python -c "import fastapi, uvicorn, torch, pytesseract" >nul 2>nul
if errorlevel 1 (
  echo [WARN] AI Python dependencies are missing.
  echo [WARN] AI service will be skipped. Install once with:
  echo        python -m pip install -r ai-service\requirements.txt
  set "AI_ENABLED=0"
)

echo [1/6] Stopping old frontend/backend/AI services...
for %%P in (3000 4000 8001) do call :kill_port %%P

if "%RESET_CHAIN%"=="1" (
  echo [INFO] Fresh mode enabled - restarting blockchain node.
  call :kill_port 8545
)

call :is_port_open 8545
if not errorlevel 1 (
  echo [2/6] Using existing blockchain node on port 8545.
) else (
  echo [2/6] Starting blockchain node...
  start "Land Registry - Blockchain Node" cmd /k "cd /d ""%~dp0"" && set ""APPDATA=%APPDATA%"" && set ""LOCALAPPDATA=%LOCALAPPDATA%"" && npm --prefix smart-contracts run node"
  call :wait_port 8545 60 "Blockchain RPC"
  if errorlevel 1 goto :fail
  set "NEED_DEPLOY=1"
)

if not exist "blockchain-scripts\deployment.local.json" set "NEED_DEPLOY=1"
if "%RESET_CHAIN%"=="1" set "NEED_DEPLOY=1"

if "!NEED_DEPLOY!"=="1" (
  echo [3/6] Deploying contract...
  call npm --prefix smart-contracts run deploy
  if errorlevel 1 goto :fail
) else (
  echo [3/6] Using existing deployed contract.
)

if "!NEED_SEED!"=="1" (
  echo [3b/6] Seeding demo data...
  call npm --prefix smart-contracts run seed
  if errorlevel 1 goto :fail
)

if "!AI_ENABLED!"=="1" (
  echo [4/6] Starting AI service...
  start "Land Registry - AI Service" cmd /k "cd /d ""%~dp0"" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir ai-service"
  call :wait_port 8001 30 "AI service"
  if errorlevel 1 goto :fail
) else (
  echo [4/6] Skipping AI service ^(dependencies missing^)...
)

echo [5/6] Starting backend API...
start "Land Registry - Backend API" cmd /k "cd /d ""%~dp0"" && set ""AI_SERVICE_URL=http://127.0.0.1:8001"" && npm --prefix backend run start"
call :wait_port 4000 30 "Backend API"
if errorlevel 1 goto :fail

echo [6/6] Starting frontend dashboard...
start "Land Registry - Frontend" cmd /k "cd /d ""%~dp0"" && npm --prefix frontend run dev"
call :wait_port 3000 40 "Frontend"
if errorlevel 1 goto :fail

start "" "http://localhost:3000"

echo.
echo ===============================================
echo Project started successfully.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4000/health
if "!AI_ENABLED!"=="1" (
  echo AI:        http://localhost:8001/health
) else (
  echo AI:        skipped
)
echo ===============================================
echo Modes:
echo   run-project.bat          ^(fast start, keeps existing chain^)
echo   run-project.bat fresh    ^(restart chain + redeploy contract^)
echo   run-project.bat seed     ^(fast start + seed data^)
echo Tip: use run-project-stop.bat before restarting.
exit /b 0

:require_path
if not exist %~1 (
  echo [ERROR] Missing %~2.
  echo Run once: npm run install:all
  exit /b 1
)
exit /b 0

:kill_port
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%~1 " ^| findstr "LISTENING"') do (
  if not "%%A"=="0" taskkill /PID %%A /F >nul 2>nul
)
exit /b 0

:is_port_open
netstat -ano | findstr /R /C:":%~1 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  exit /b 0
)
exit /b 1

:wait_port
set "PORT=%~1"
set "TRIES=%~2"
set "NAME=%~3"
for /L %%I in (1,1,%TRIES%) do (
  netstat -ano | findstr /R /C:":%PORT% " | findstr "LISTENING" >nul
  if not errorlevel 1 (
    echo     - %NAME% is ready on port %PORT%
    exit /b 0
  )
  timeout /t 1 >nul
)
echo [ERROR] %NAME% did not start on port %PORT%.
exit /b 1

:fail
echo.
echo [FAILED] Startup stopped.
echo Fix the error and run run-project.bat again.
pause
exit /b 1

