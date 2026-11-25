@echo off
title StockPilot - Inventory & Sales System
cd /d "%~dp0"
echo ========================================================
echo   Starting StockPilot (NovaMart) on http://localhost:5173
echo ========================================================
echo.
npm run dev
pause
