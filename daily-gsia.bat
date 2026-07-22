@echo off
REM === Daily build GSIA Facilities BI ===
REM Roda no BGPSERVER via Task Scheduler
REM 1. Baixa Excel do Supabase Storage
REM 2. Rebuild data.js + app.bundle.js
REM 3. Git commit + push
REM 4. Deploy no Coolify

set NODE="C:\Program Files\nodejs\node.exe"
set GIT=C:\gsia-bi\git\bin\git.exe
set PROJECT=C:\gsia-bi
set LOG=%PROJECT%\daily-log.txt
set COOLIFY_TOKEN=68^|B5a4M9jHbWO0RYRBLKlMeQ1k7LH4cADJkJlo9TTu2e85395d
set COOLIFY_HOST=187.77.238.125:8000
set APP_UUID=o5xvmgsisbce0yp8n2wqxy1v
set SUPA_URL=http://supabasekong-aafkl8n56nwdseh5aobjrbzu.187.77.238.125.sslip.io
set SUPA_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3NzU2Njk2MCwiZXhwIjo0OTMzMjQwNTYwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.9AQw-t0XTToQpOH6MFLg6MV6fz89W4Sw1BzBZwOG5mw
set EXCEL_LOCAL=%PROJECT%\workspace\abertura-vagas.xlsx

echo [%date% %time%] GSIA daily build iniciado >> %LOG%

cd /d %PROJECT%

REM Download Excel from Supabase Storage
if not exist "%PROJECT%\workspace" mkdir "%PROJECT%\workspace"
curl -s -o "%EXCEL_LOCAL%" -H "Authorization: Bearer %SUPA_KEY%" -H "apikey: %SUPA_KEY%" "%SUPA_URL%/storage/v1/object/bi-excel/gsia-vagas/abertura-vagas.xlsx" >> %LOG% 2>&1
if not exist "%EXCEL_LOCAL%" (
    echo [%date% %time%] ERRO: nao conseguiu baixar Excel do Supabase >> %LOG%
    goto :end
)
echo [%date% %time%] Excel baixado do Supabase >> %LOG%

REM Build data.js (usa env var GSIA_EXCEL_PATH)
set GSIA_EXCEL_PATH=%EXCEL_LOCAL%
%NODE% build-data.cjs >> %LOG% 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERRO no build-data >> %LOG%
    goto :end
)

REM Build app.bundle.js
%NODE% build-jsx.cjs >> %LOG% 2>&1
if errorlevel 1 (
    echo [%date% %time%] ERRO no build-jsx >> %LOG%
    goto :end
)

REM Git add + commit + push
%GIT% add data.js app.bundle.js >> %LOG% 2>&1
%GIT% commit -m "daily: atualizar dados %date:~6,4%-%date:~3,2%-%date:~0,2%" >> %LOG% 2>&1
%GIT% push origin master >> %LOG% 2>&1

REM Trigger Coolify restart
curl -s -X POST "http://%COOLIFY_HOST%/api/v1/applications/%APP_UUID%/restart" -H "Authorization: Bearer %COOLIFY_TOKEN%" -H "Content-Type: application/json" >> %LOG% 2>&1

echo [%date% %time%] GSIA daily build concluido >> %LOG%

:end
