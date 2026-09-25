@echo off
echo ========================================================
echo   Deploying Master Tracker to Surge (mastertracker.surge.sh)
echo ========================================================
echo.
cd /d "%~dp0"
npx -y surge deploy_mastertracker mastertracker.surge.sh
echo.
pause
