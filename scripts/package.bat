@echo off
REM CMakeMakers Packaging Script for Windows

echo Starting CMakeMakers packaging...

REM Clean previous builds
echo Cleaning previous builds...
if exist out rmdir /s /q out
if exist *.vsix del /q *.vsix

REM Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

REM Run linter
echo Running linter...
call npm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

REM Compile TypeScript
echo Compiling TypeScript...
call npm run compile
if %errorlevel% neq 0 exit /b %errorlevel%

REM Run tests
echo Running tests...
call npm run test
if %errorlevel% neq 0 (
  echo Tests failed! Fix them before packaging.
  exit /b 1
)

REM Package extension
echo Packaging extension...
call npm run package
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Packaging complete!
echo.
dir *.vsix

echo.
echo Package created successfully!
echo.
echo To install locally:
echo   code --install-extension cmakemakers-0.0.1.vsix
echo.
echo To publish:
echo   npm run publish
