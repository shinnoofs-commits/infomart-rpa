@echo off
chcp 65001 > nul
setlocal
cd /d "%~dp0"
title Infomart RPA Controller (Cloud Tunnel Mode)

node start-tunnel.js

pause
