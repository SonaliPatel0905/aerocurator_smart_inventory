@echo off
title AeroCurator – Smart Inventory System
color 0B

echo.
echo  ============================================================
echo   AeroCurator - Smart Inventory System for Drone Components
echo  ============================================================
echo.

REM ── Check Python is available ────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found. Please install Python 3.9+ and try again.
    echo          https://www.python.org/downloads/
    pause
    exit /b 1
)

echo  [OK] Python detected.

REM ── Move into backend directory ───────────────────────────────────────────────
cd /d "%~dp0backend"

REM ── Install / upgrade dependencies ───────────────────────────────────────────
echo.
echo  Installing dependencies from requirements.txt ...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo  [WARN] pip install reported issues. Attempting to continue...
)
echo  [OK] Dependencies ready.

REM ── Launch Flask ─────────────────────────────────────────────────────────────
echo.
echo  Starting AeroCurator backend at http://localhost:5000
echo.
echo  Press Ctrl+C to stop the server.
echo  ============================================================
echo.

python app.py

pause
