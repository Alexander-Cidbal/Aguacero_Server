@echo off
REM Double-click this file to start the Aguacero backend + Cloudflare tunnel
REM and redeploy the frontend to GitHub Pages with the new public URL.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
