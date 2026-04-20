@echo off
title AeroCurator – Smart Inventory System
color 0B

echo.
echo  ============================================================
echo   AeroCurator - Smart Inventory System for Drone Components
echo  ============================================================
echo.

REM ── Check Node.js is available ───────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install Node.js 18+ and try again.
    echo          https://nodejs.org/
    pause
    exit /b 1
)

echo  [OK] Node.js detected.

REM ── Move into backend directory ───────────────────────────────────────────────
cd /d "%~dp0backend"

REM ── Check for .env file ──────────────────────────────────────────────────────
if not exist .env (
    echo  [INFO] .env file not found. Creating from .env.example ...
    copy .env.example .env >nul
    if %errorlevel% neq 0 (
        echo  [WARN] Could not create .env file automatically.
    ) else (
        echo  [OK] .env file created.
    )
)

REM ── Install / upgrade dependencies ───────────────────────────────────────────
echo.
echo  Installing dependencies from package.json ...
call npm install --quiet
if %errorlevel% neq 0 (
    echo  [WARN] npm install reported issues. Attempting to continue...
)
echo  [OK] Dependencies ready.

REM ── Launch Server ────────────────────────────────────────────────────────────
echo.
echo  Starting AeroCurator backend at http://localhost:5000
echo.
echo  Press Ctrl+C to stop the server.
echo  ============================================================
echo.

call npm start

pause
