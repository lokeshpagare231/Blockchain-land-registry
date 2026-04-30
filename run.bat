@echo off
echo ========================================================
echo        Blockguard Land Registry - Startup Script
echo ========================================================
echo.

:: Check for node modules (basic check)
if not exist "frontend\node_modules" (
    echo [WARNING] Dependencies might be missing.
    echo If this is your first run, please run: npm run install:all
    echo and: python -m pip install -r ai-service\requirements.txt
    echo.
    pause
)

echo [1/5] Starting local blockchain node...
start "Blockchain Node" cmd /k "npm --prefix smart-contracts run node"

echo Waiting for node to initialize (5 seconds)...
timeout /t 5 /nobreak > nul

echo.
echo [2/5] Deploying smart contracts...
cmd /c "npm --prefix smart-contracts run deploy"

echo.
echo [3/5] Starting AI Verification Service...
start "AI Service" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir ai-service"

echo.
echo [4/5] Starting Backend API...
start "Backend API" cmd /k "set AI_SERVICE_URL=http://127.0.0.1:8001&& npm --prefix backend run start"

echo.
echo [5/5] Starting Frontend UI...
start "Frontend UI" cmd /k "npm --prefix frontend run dev"

echo.
echo ========================================================
echo All services have been successfully launched!
echo.
echo - Frontend UI: http://localhost:3000
echo - Backend API: http://localhost:3001
echo - AI Service:  http://localhost:8001
echo ========================================================
echo Press any key to close this launcher window (services will remain running)...
pause > nul
