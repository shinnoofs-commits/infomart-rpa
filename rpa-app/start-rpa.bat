@echo off
setlocal
cd /d "%~dp0"
title Infomart RPA Controller

echo ========================================================
echo   Infomart RPA Controller (Port 3000)
echo ========================================================
echo.
echo Starting RPA Server...
echo URL: http://localhost:3000
echo.
call npm run dev
pause
