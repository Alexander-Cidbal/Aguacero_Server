@echo off
REM Double-click this file to stop the Aguacero backend and Cloudflare tunnel.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1"
pause
