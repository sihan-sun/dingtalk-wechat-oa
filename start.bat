@echo off
chcp 65001 >nul 2>&1
title Staff Sync - Starting...

echo.
echo ========================================
echo   DingTalk / WeCom Staff Sync System
echo ========================================
echo.

:: Get script directory (handles Chinese paths)
set "ROOT=%~dp0"

:: --- 1. MongoDB ---
echo [1/3] Starting MongoDB...
cd /d "%ROOT%"
docker compose up -d >nul 2>&1
if %errorlevel% neq 0 (
    echo   [WARN] Docker not running, please start Docker Desktop first
) else (
    echo   [OK] MongoDB started
)

:: --- 2. Backend ---
echo [2/3] Starting backend (port 3001)...
cd /d "%ROOT%backend-nest"
if not exist "node_modules" (
    echo   First run: installing backend dependencies...
    call npm install
)
start "StaffSync-Backend" cmd /c "node dist\main.js"
echo   [OK] Backend started

:: --- 3. Frontend ---
echo [3/3] Starting frontend (port 5173)...
cd /d "%ROOT%frontend-vue"
if not exist "node_modules" (
    echo   First run: installing frontend dependencies...
    call npm install
)
start "StaffSync-Frontend" cmd /c "npx vite --host"
echo   [OK] Frontend started

:: --- Wait and open browser ---
echo.
echo Waiting for services...
timeout /t 6 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   System is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo ========================================
echo.

pause
