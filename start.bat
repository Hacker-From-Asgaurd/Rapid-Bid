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

:: Launch Backend in separate window
start "Rapid Bid Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait a brief moment
timeout /t 2 /nobreak >nul

:: Launch Frontend in separate window
start "Rapid Bid Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo [SUCCESS] Rapid Bid is launching!
echo.
echo   Frontend UI : http://localhost:5173
echo   Backend API : http://localhost:8000/docs
echo.
echo Press any key to open the browser...
pause >nul

start http://localhost:5173
