#!/bin/bash

SERVICE_NAME="zero45-dashboard.service"

if [ -z "${INVOCATION_ID:-}" ] && command -v systemctl >/dev/null 2>&1; then
    echo "[restart.sh] Reiniciando via systemctl (${SERVICE_NAME})..."
    exec systemctl restart "${SERVICE_NAME}"
fi

echo "[restart.sh] systemctl indisponível ou chamado dentro do serviço. Reiniciando manualmente..."

# Forçar caminho direto nos scripts filho (não delegar para systemd novamente)
INVOCATION_ID=manual ./stop.sh
INVOCATION_ID=manual ./start.sh
