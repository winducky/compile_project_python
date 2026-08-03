@echo off
chcp 65001 > nul
title Install Python Packages Offline

echo ==========================================
echo      INSTALL OFFLINE PYTHON PACKAGES
echo ==========================================
echo.

REM Kiểm tra Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Khong tim thay Python.
    echo Vui long cai dat Python truoc.
    pause
    exit /b 1
)

REM Tao venv neu chua ton tai
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

REM Kich hoat venv
echo.
echo [2/5] Kich hoat Virtual Environment...
call venv\Scripts\activate.bat

REM Nang cap pip tu package offline neu co
echo.
echo [3/5] Kiem tra requirements...

if not exist requirements.txt (
    echo [ERROR] Khong tim thay requirements.txt
    pause
    exit /b 1
)

if not exist wheelhouse (
    echo [ERROR] Khong tim thay thu muc wheelhouse
    pause
    exit /b 1
)

REM Cai package offline
echo.
echo [4/5] Cai dat package...

python -m pip install ^
    --no-index ^
    --find-links=wheelhouse ^
    -r requirements.txt

if errorlevel 1 (
    echo.
    echo ==========================================
    echo INSTALL THAT BAI
    echo ==========================================
    pause
    exit /b 1
)

echo.
echo [5/5] Kiem tra...

python -m pip list

echo.
echo ==========================================
echo      CAI DAT THANH CONG
echo ==========================================
echo.
echo Virtual Environment:
echo    venv\
echo.
echo De chay:
echo.
echo    call venv\Scripts\activate.bat
echo.
pause