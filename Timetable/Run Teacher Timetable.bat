@echo off
setlocal
cd /d "%~dp0"

set PORT=8022
start "" "http://127.0.0.1:%PORT%/teacher_timetable.html"

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT% --bind 127.0.0.1
  exit /b
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT% --bind 127.0.0.1
  exit /b
)

echo Python was not found. Install Python or run this app from any static web server.
pause
