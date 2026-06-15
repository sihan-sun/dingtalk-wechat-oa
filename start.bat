@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

title Staff Sync System - Starting
cd /d "%~dp0"

set "BACKEND_DIR=%~dp0backend-nest"
set "FRONTEND_DIR=%~dp0frontend-vue"
set "MONGO_PORT=27018"
set "BACKEND_PORT=3001"
set "FRONTEND_PORT=5173"

echo.
echo ========================================
echo   Staff Sync System
echo ========================================
echo.

:: ============================================
:: Step 1: Check prerequisites
:: ============================================
echo [1/5] Checking prerequisites...

:: --- Check Docker ---
echo   Checking Docker...
docker compose version >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] Docker Compose not found
    echo.
    echo   Please install Docker Desktop:
    echo     https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] Docker daemon is not running
    echo.
    echo   Please start Docker Desktop and wait for it to finish loading.
    echo.
    pause
    exit /b 1
)
echo   [OK] Docker available

:: --- Check / build backend ---
if not exist "%BACKEND_DIR%\dist\main.js" (
    echo   [INFO] Backend not built, building now...
    cd /d "%BACKEND_DIR%"
    call npm run build
    if !errorlevel! neq 0 (
        echo   [FAIL] Backend build failed
        echo   Check the output above for TypeScript errors.
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    echo   [OK] Backend built
) else (
    echo   [OK] Backend dist ready
)

:: --- Check backend dependencies ---
if not exist "%BACKEND_DIR%\node_modules" (
    echo   [INFO] Installing backend dependencies...
    cd /d "%BACKEND_DIR%"
    call npm install
    if !errorlevel! neq 0 (
        echo   [FAIL] Backend npm install failed
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)
echo   [OK] Backend dependencies ready

:: --- Check frontend dependencies ---
if not exist "%FRONTEND_DIR%\node_modules" (
    echo   [INFO] Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if !errorlevel! neq 0 (
        echo   [FAIL] Frontend npm install failed
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)
echo   [OK] Frontend dependencies ready

:: ============================================
:: Step 2: Start MongoDB
:: ============================================
echo [2/5] Starting MongoDB...

docker compose up -d 2>&1
if !errorlevel! neq 0 (
    echo   [FAIL] Failed to start MongoDB container
    echo.
    echo   Check docker-compose.yml and try:
    echo     docker compose logs mongodb
    echo.
    pause
    exit /b 1
)

:: --- Wait for container to be "Up" ---
set RETRY_COUNT=0
:wait_mongo_up
set /a RETRY_COUNT+=1
if !RETRY_COUNT! gtr 30 (
    echo   [FAIL] MongoDB container not running after 60s
    echo.
    echo   Run "docker compose logs mongodb" for details.
    echo.
    pause
    exit /b 1
)

docker compose ps mongodb 2>nul | findstr /C:"Up" >nul
if !errorlevel! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_mongo_up
)

:: --- Wait for MongoDB to accept connections ---
set RETRY_COUNT=0
:wait_mongo_ready
set /a RETRY_COUNT+=1
if !RETRY_COUNT! gtr 30 (
    echo   [FAIL] MongoDB port not reachable after 60s
    echo.
    echo   Run "docker compose logs mongodb" for details.
    echo.
    pause
    exit /b 1
)

powershell -Command "try {$tcp=New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1',%MONGO_PORT%); $tcp.Close(); exit 0} catch {exit 1}" >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_mongo_ready
)
echo   [OK] MongoDB ready

:: ============================================
:: Step 3: Start Backend
:: ============================================
echo [3/5] Starting backend on port %BACKEND_PORT%...

cd /d "%BACKEND_DIR%"
start "StaffSync-Backend" cmd /c "node dist\main.js ^|^| pause"
cd /d "%~dp0"

:: --- Wait for backend port ---
set RETRY_COUNT=0
:wait_backend
set /a RETRY_COUNT+=1
if !RETRY_COUNT! gtr 25 (
    echo   [FAIL] Backend not reachable after 50s
    echo.
    echo   Check the "StaffSync-Backend" window for error messages.
    echo.
    pause
    exit /b 1
)

powershell -Command "try {$tcp=New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1',%BACKEND_PORT%); $tcp.Close(); exit 0} catch {exit 1}" >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_backend
)
echo   [OK] Backend running on port %BACKEND_PORT%

:: ============================================
:: Step 4: Start Frontend
:: ============================================
echo [4/5] Starting frontend on port %FRONTEND_PORT%...

cd /d "%FRONTEND_DIR%"
start "StaffSync-Frontend" cmd /c "npm run dev -- --host ^|^| pause"
cd /d "%~dp0"

:: --- Wait for frontend port ---
set RETRY_COUNT=0
:wait_frontend
set /a RETRY_COUNT+=1
if !RETRY_COUNT! gtr 20 (
    echo   [FAIL] Frontend not reachable after 40s
    echo.
    echo   Check the "StaffSync-Frontend" window for error messages.
    echo.
    pause
    exit /b 1
)

powershell -Command "try {$tcp=New-Object System.Net.Sockets.TcpClient; $tcp.Connect('127.0.0.1',%FRONTEND_PORT%); $tcp.Close(); exit 0} catch {exit 1}" >nul 2>&1
if !errorlevel! neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_frontend
)
echo   [OK] Frontend running on port %FRONTEND_PORT%

:: ============================================
:: Step 5: Open Browser
:: ============================================
echo [5/5] All systems ready, opening browser...
timeout /t 1 /nobreak >nul
start http://localhost:%FRONTEND_PORT%

echo.
echo ========================================
echo   All systems running!
echo ========================================
echo.
echo   Backend  : http://localhost:%BACKEND_PORT%
echo   Frontend : http://localhost:%FRONTEND_PORT%
echo   MongoDB  : localhost:%MONGO_PORT%
echo.
echo   Close the "StaffSync-Backend" and
echo   "StaffSync-Frontend" windows to stop.
echo.
echo ========================================
echo.
pause
