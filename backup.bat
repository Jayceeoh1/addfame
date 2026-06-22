@echo off
setlocal

:: ============================================================
:: AddFame — Script Backup Supabase
:: Rulează: dublu click pe backup.bat
:: ============================================================

set PG_DUMP="C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
set DB_URL=postgresql://postgres:Nike09013789!@db.nanzolwcflqxnbzgqnwh.supabase.co:5432/postgres
set BACKUP_DIR=%~dp0backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATE=%%c-%%b-%%a
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a-%%b
set FILENAME=%BACKUP_DIR%\addfame_backup_%DATE%_%TIME%.sql

echo.
echo ============================================
echo   AddFame Backup Supabase
echo ============================================
echo   Data: %DATE% %TIME%
echo   Salvare in: %FILENAME%
echo.
echo Fac backup...

%PG_DUMP% "%DB_URL%" --no-owner --no-acl -F p -f "%FILENAME%"

if %errorlevel% equ 0 (
    echo.
    echo [OK] Backup salvat cu succes!
    for %%A in ("%FILENAME%") do echo Dimensiune: %%~zA bytes
    forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul
    echo Backup-urile mai vechi de 30 zile au fost sterse automat.
) else (
    echo.
    echo [EROARE] Backup-ul a esuat. Verifica parola din fisier.
)

echo.
pause