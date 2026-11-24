@echo off

title Model SD15

start "" cmd /c "$env:SCHP_CHECKPOINT_PATH = 'disabled-for-stylization'" 
start "" cmd /c ".\ai-service\.venv-stylization-poc\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000 --workers 1"

timeout /t 1 /nobreak >null