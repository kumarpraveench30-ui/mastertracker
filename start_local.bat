@echo off
setlocal enabledelayedexpansion
title ExcelVibe Analytics - Offline Local Server

echo =====================================================================
echo           ExcelVibe Analytics - Offline Local Web Application
echo =====================================================================
echo.
echo [1/5] Checking Python installation...

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=py"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else (
        echo [ERROR] Python was not found on your system!
        echo Please install Python 3.10+ and re-run this script.
        pause
        exit /b 1
    )
)

echo Found Python: %PY_CMD%
%PY_CMD% --version
echo.

echo [2/5] Setting up local Python virtual environment...
if not exist "venv" (
    echo Creating virtual environment in .\venv ...
    %PY_CMD% -m venv venv
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Failed to create virtual environment. Falling back to global Python.
        set "VENV_PY=%PY_CMD%"
    ) else (
        set "VENV_PY=venv\Scripts\python.exe"
    )
) else (
    set "VENV_PY=venv\Scripts\python.exe"
)

echo [3/5] Verifying and installing required dependencies...
"%VENV_PY%" -m pip install -q --upgrade pip
"%VENV_PY%" -m pip install -q -r backend\requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies. Check your environment.
    pause
    exit /b 1
)
echo Dependencies verified successfully.
echo.

echo [4/5] Preparing sample datasets...
"%VENV_PY%" backend\sample_data\create_samples.py
echo.

echo [5/5] Launching ExcelVibe Local Server at http://localhost:8000 ...
echo "Local processing — your uploaded data never leaves this computer."
echo.

:: Open browser after a 2-second delay in background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: Start Uvicorn backend which also serves the React frontend
"%VENV_PY%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

pause
