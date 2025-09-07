@echo off
setlocal
set PY=python
if exist "C:\Python312\python.exe" set PY=C:\Python312\python.exe
if exist "C:\Python311\python.exe" set PY=C:\Python311\python.exe
"%PY%" "%~dp0collector_enhanced.py"
