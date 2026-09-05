@echo off
title Chrome Automation Launcher (Port 9222)
echo ========================================================
echo   Adobe Express Browser Automation - Chrome Launcher
echo ========================================================
echo.

set PROFILE_DIR=C:\Users\NCN0C\.chrome-automation
if not exist "%PROFILE_DIR%" (
    mkdir "%PROFILE_DIR%"
)

if exist "%PROFILE_DIR%\Default\LOCK" (
    del /f /q "%PROFILE_DIR%\Default\LOCK" 2>nul
)

echo Menjalankan Google Chrome dengan Remote Debugging Port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="%PROFILE_DIR%" "https://express.adobe.com/schedule?postId=new"

echo.
echo Chrome Automation aktif!
echo Port CDP: 9222
echo Profil  : %PROFILE_DIR%
echo.
echo Silakan login akun Adobe Express jika baru pertama kali membuka.
echo Setelah itu, jalankan: node uploader.js
echo.
pause
