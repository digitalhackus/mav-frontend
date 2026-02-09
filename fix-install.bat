@echo off
echo Cleaning and reinstalling dependencies...
cd /d "%~dp0"

if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo Clearing npm cache...
call npm cache clean --force

echo Installing dependencies (this may take a few minutes)...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Done. You can now run: npm run dev
) else (
    echo.
    echo Install failed. See above. Try: Add project folder to Windows Defender exclusions, then run this script again.
)
pause
