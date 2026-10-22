@echo off
title Legendario - Gerador de Legendas SRT
cd /d "%~dp0"
if not exist "index.html" (
  echo Arquivo index.html nao encontrado.
  pause
  exit /b 1
)
start "" "index.html"
exit /b 0
