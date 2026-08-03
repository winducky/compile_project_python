@echo off
chcp 65001 >nul
title Build Offline Python Packages

echo ==========================================
echo        BUILD OFFLINE PACKAGES
echo ==========================================
echo.

REM Kiểm tra thư mục venv
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Khong tim thay venv.
    echo Hay tao venv truoc:
    echo python -m venv venv
    pause
    exit /b 1
)

echo [1/4] Kich hoat Virtual Environment...
call venv\Scripts\activate.bat

echo.
echo [2/4] Tao requirements.txt...
python -m pip freeze > requirements.txt

if errorlevel 1 (
    echo [ERROR] Tao requirements.txt that bai.
    pause
    exit /b 1
)

echo.
echo [3/4] Tao lai thu muc wheelhouse...
if exist wheelhouse rmdir /s /q wheelhouse
mkdir wheelhouse

echo.
echo [4/4] Download package...
python -m pip download -r requirements.txt -d wheelhouse

if errorlevel 1 (
    echo [ERROR] Download package that bai.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo           HOAN THANH
echo ==========================================
echo.
echo Da tao:
echo    requirements.txt
echo    wheelhouse\
echo.
pause