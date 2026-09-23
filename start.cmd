@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Please install Node.js 24 or newer from https://nodejs.org/ & pause & exit /b 1)
node --env-file-if-exists=.env server.mjs
pause
