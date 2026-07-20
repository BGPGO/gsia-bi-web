#!/bin/sh
# refresh.sh — pipeline de atualizacao do GSIA BI dentro do container.
#
# 1. Baixa XLSX do Supabase Storage
# 2. Roda build-data.cjs (processa XLSX -> data.js)
# 3. Roda build-jsx.cjs (app.jsx -> app.bundle.js)
# 4. Copia pro document root do nginx
# 5. Sync pro Supabase Storage (backup)

set -e

# Carrega env exportado pelo entrypoint (cron nao herda env do PID 1).
if [ -f /etc/cron-env ]; then
  set -a
  . /etc/cron-env
  set +a
fi

cd /app
LOG=/var/log/refresh.log
TS() { date '+%Y-%m-%d %H:%M:%S'; }

# Tee pra stdout (visivel em Coolify logs) E pra arquivo (debug historico).
exec > >(tee -a "$LOG") 2>&1

echo ""
echo "===== $(TS) refresh start ($1) ====="

# --boot com workspace persistente: se abertura-vagas.xlsx e fresco, pula fetch
SKIP_FETCH=0
if [ "$1" = "--boot" ] && [ -f /app/workspace/abertura-vagas.xlsx ]; then
  age=$(( $(date +%s) - $(stat -c %Y /app/workspace/abertura-vagas.xlsx 2>/dev/null || echo 0) ))
  if [ "$age" -lt 86400 ]; then
    echo "[$(TS)] boot: dados frescos ($age s) — pulando fetch (rebuild+copy so)"
    SKIP_FETCH=1
  fi
fi

if [ "$SKIP_FETCH" = "0" ]; then
  # Baixa XLSX atualizado do Supabase Storage
  if [ -f /app/download-xlsx.sh ]; then
    /app/download-xlsx.sh || echo "[$(TS)] download-xlsx falhou (continua com dados existentes)"
  fi
fi

if [ -f /app/workspace/abertura-vagas.xlsx ]; then
  echo "[$(TS)] build-data.cjs"
  node build-data.cjs

  echo "[$(TS)] build-jsx.cjs"
  node build-jsx.cjs

  cp -f data.js app.bundle.js /usr/share/nginx/html/
  echo "[$(TS)] refresh OK — data.js atualizado em $(stat -c %y /usr/share/nginx/html/data.js)"

  # Sync pro Supabase Storage (se configurado)
  if [ -f /app/sync-supabase.sh ]; then
    /app/sync-supabase.sh || echo "[$(TS)] sync-supabase falhou (continua)"
  fi
else
  echo "[$(TS)] abertura-vagas.xlsx ausente — pulando build (servindo dados antigos)"
fi

echo "===== $(TS) refresh end ====="
