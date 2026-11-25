@echo off
title Rapid Bid - Industrial Valve & Damper CPQ Launcher
color 0A

echo =====================================================================
echo                RAPID BID - ENTERPRISE CPQ SYSTEM
echo            Industrial Valve & Damper Estimation Platform
echo =====================================================================
echo [INFO] Security Notice: All data stays on your local server.
echo [INFO] Starting Backend and Frontend services...
echo.

set "PYTHON_EXE=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
)

:: Launch Backend in separate window
start "Rapid Bid Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait a brief moment
timeout /t 2 /nobreak >nul

:: Launch Frontend in separate window
start "Rapid Bid Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =====================================================================
echo [SUCCESS] Rapid Bid is launching!
echo.
echo   Frontend UI : http://localhost:5173
echo   Backend API : http://localhost:8000/docs
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
