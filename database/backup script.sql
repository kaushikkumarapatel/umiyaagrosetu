@echo on
:: AgroSetu — Daily PostgreSQL Backup
:: Place this file in: D:\umiyaagrosetu\db-backups\
:: Schedule via Windows Task Scheduler

:: ── CONFIG ──────────────────────────────────────
set DB_NAME=commodity_db
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_DIR=D:\umiyaagrosetu\db-backups
set PGPASSWORD=admin
:: ─────────────────────────────────────────────────

:: Create backup folder if not exists
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Date format: YYYY-MM-DD
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set DT=%%I
set YYYY=%DT:~0,4%
set MM=%DT:~4,2%
set DD=%DT:~6,2%
set DATE_STR=%YYYY%-%MM%-%DD%

:: Backup filename
set BACKUP_FILE=%BACKUP_DIR%\agrosetu_%DATE_STR%.sql

:: Run pg_dump
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -F p -f "%BACKUP_FILE%"

:: Check if backup succeeded
if %ERRORLEVEL% EQU 0 (
    echo [%DATE_STR%] ✅ Backup successful: %BACKUP_FILE%
    
    :: Delete backups older than 30 days
    forfiles /p "%BACKUP_DIR%" /s /m agrosetu_*.sql /d -30 /c "cmd /c del @path" 2>nul
    echo [%DATE_STR%] 🧹 Old backups cleaned
) else (
    echo [%DATE_STR%] ❌ Backup FAILED
)