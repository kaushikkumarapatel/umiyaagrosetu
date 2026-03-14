@echo off
set BACKUP_DIR=D:\DatabaseBackup
set DATE=%date:~-4%-%date:~3,2%-%date:~0,2%
set FILENAME=agrosetu-backup-%DATE%.sql

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

pg_dump -U postgres -d commodity_db > %BACKUP_DIR%\%FILENAME%

echo Backup saved: %BACKUP_DIR%\%FILENAME%
pause