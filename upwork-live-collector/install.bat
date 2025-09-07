@echo off
echo.
echo ===============================================
echo  Upwork AI Assistant - Live Collector Setup
echo ===============================================
echo.

echo [1/3] Checking Chrome installation...
where chrome >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Chrome not found in PATH
    echo Please install Google Chrome first
    pause
    exit /b 1
)
echo ✅ Chrome found

echo.
echo [2/3] Opening Chrome Extensions page...
start chrome://extensions/

echo.
echo [3/3] Manual Steps Required:
echo.
echo   1. Turn ON "Developer mode" (top right toggle)
echo   2. Click "Load unpacked" button
echo   3. Select this folder: %~dp0
echo   4. You should see "Upwork AI Assistant" in the list
echo.
echo 🚀 After installation:
echo   - Open: %~dp0test.html to test the extension
echo   - Visit: https://www.upwork.com/nx/find-work/
echo   - The extension will automatically collect job data!
echo.

echo 📝 Test Files:
echo   - Test Page: %~dp0test.html  
echo   - README: %~dp0README.md
echo.
pause
