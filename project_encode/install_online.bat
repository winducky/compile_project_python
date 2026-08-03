@echo off
chcp 65001 > nul
title Install Python Packages Online

echo ==========================================
echo       INSTALL PYTHON PACKAGES ONLINE
echo ==========================================
echo.

REM Kiểm tra Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay Python.
    pause
    exit /b 1
)

REM Kiểm tra requirements.txt
if not exist requirements.txt (
    echo [ERROR] Khong tim thay requirements.txt
    pause
    exit /b 1
)

REM Tạo venv nếu chưa có
if not exist "venv\Scripts\python.exe" (
    echo [1/5] Tao Virtual Environment...
    python -m venv venv

    if errorlevel 1 (
        echo [ERROR] Tao Virtual Environment that bai.
        pause
        exit /b 1
    )
) else (
    echo [1/5] Da ton tai Virtual Environment.
)

REM Kích hoạt venv
echo.
echo [2/5] Kich hoat Virtual Environment...
call venv\Scripts\activate.bat

REM Nâng cấp pip
echo.
echo [3/5] Nang cap pip...
python -m pip install --upgrade pip

REM Cài đặt package
echo.
echo [4/5] Cai dat package...
python -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ==========================================
    echo INSTALL THAT BAI
    echo ==========================================
    pause
    exit /b 1
)

REM Kiểm tra
echo.
echo [5/5] Danh sach package da cai:
python -m pip list

echo.
echo ==========================================
echo      CAI DAT THANH CONG
echo ==========================================
echo.
echo De kich hoat moi truong:
echo.
echo    call venv\Scripts\activate.bat
echo.
pause