@echo off
title Staff Sync - Starting...
cd /d "%~dp0"

echo.
echo ========================================
echo   Staff Sync System
echo ========================================
echo.

:: --- 1. MongoDB ---
echo [1/3] Starting MongoDB...
docker compose up -d >nul 2>&1
if %errorlevel% neq 0 (
    echo   [WARN] Docker not running, please start Docker Desktop
) else (
    echo   [OK] MongoDB started
)

:: --- 2. Backend ---
echo [2/3] Starting backend :3001...
cd /d "%~dp0backend-nest"
if not exist "node_modules" (
    echo   Installing backend deps...
    call npm install
)
start "StaffSync-Backend" cmd /c "node dist\main.js"
cd /d "%~dp0"
echo   [OK] Backend started

:: --- 3. Frontend ---
echo [3/3] Starting frontend :5173...
cd /d "%~dp0frontend-vue"
if not exist "node_modules" (
    echo   Installing frontend deps...
    call npm install
)
start "StaffSync-Frontend" cmd /c "npx vite --host"
cd /d "%~dp0"
echo   [OK] Frontend started

:: --- Open browser ---
echo.
echo Starting browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   http://localhost:5173
echo ========================================
echo.

pause
