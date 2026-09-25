@echo off
set "PATH=%USERPROFILE%\AppData\Local\Programs\Git\cmd;%PATH%"
cd /d "%~dp0"
git push -u origin main > push.log 2>&1
pause
