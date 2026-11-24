@echo off

title Important Tab

start "" cmd /c "@echo off & title AI Stylization & .\ai-service\.venv-test\Scripts\python.exe -m uvicorn main:app --app-dir ai-service --host 127.0.0.1 --port 8000 & echo. & pause"
start "" cmd /c "@echo off & title Backend & npm start --prefix backend"
start "" cmd /c "@echo off & title Frontend & npm run dev --prefix frontend"

timeout /t 10 /nobreak >nul
start "" "http://127.0.0.1:5173"
