@echo off
chcp 65001 >nul
title 员工同步系统 - 启动中...

echo.
echo  ╔══════════════════════════════════╗
echo  ║   钉钉 / 企业微信 员工同步系统   ║
echo  ╚══════════════════════════════════╝
echo.

:: ── 1. MongoDB ──────────────────────────────────
echo [1/3] 启动 MongoDB...
cd /d "%~dp0"
docker compose up -d >nul 2>&1
if %errorlevel% neq 0 (
    echo   [警告] Docker 未运行，请先启动 Docker Desktop
    echo   跳过 MongoDB...
) else (
    echo   [OK] MongoDB 已启动
)

:: ── 2. 后端 ─────────────────────────────────────
echo [2/3] 启动后端服务 (端口 3001)...
cd /d "%~dp0backend-nest"
if not exist "node_modules" (
    echo   首次运行，安装后端依赖...
    call npm install >nul 2>&1
)
start "StaffSync-Backend" cmd /c "node dist\main.js 2>&1"
echo   [OK] 后端已启动

:: ── 3. 前端 ─────────────────────────────────────
echo [3/3] 启动前端界面 (端口 5173)...
cd /d "%~dp0frontend-vue"
if not exist "node_modules" (
    echo   首次运行，安装前端依赖...
    call npm install >nul 2>&1
)
start "StaffSync-Frontend" cmd /c "npx vite --host 2>&1"
echo   [OK] 前端已启动

:: ── 等待服务就绪 ───────────────────────────────
echo.
echo 等待服务就绪...
timeout /t 6 /nobreak >nul

:: ── 打开浏览器 ─────────────────────────────────
echo 正在打开浏览器...
start http://localhost:5173

echo.
echo  ╔══════════════════════════════════╗
echo  ║  系统已启动，浏览器已打开        ║
echo  ║                                  ║
echo  ║  前端: http://localhost:5173     ║
echo  ║  后端: http://localhost:3001     ║
echo  ║                                  ║
echo  ║  关闭此窗口不会停止服务          ║
echo  ╚══════════════════════════════════╝
echo.

pause
