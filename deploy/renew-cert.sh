#!/bin/bash
# Renews the Let's Encrypt cert for dashboard.ysnock.dev via DNS-01 and reloads Traefik.
set -e
DEPLOY=/home/ubuntu/Zero45-Dashboard/deploy
. /home/ubuntu/.cf_token
export CF_TOKEN ZONE_ID=7ab1dee12715185acf0cb2e2c31c48a7 DOMAIN=dashboard.ysnock.dev EMAIL=ysnocklol@gmail.com OUT_DIR="$DEPLOY/certs"
PATH="/home/ubuntu/.nvm/versions/node/v22.23.1/bin:$PATH"
python3 "$DEPLOY/acme_dns01.py"
if openssl x509 -in "$OUT_DIR/dashboard.crt" -checkend 2592000 >/dev/null; then
  sudo cp "$OUT_DIR/dashboard.crt" /etc/dokploy/traefik/dynamic/certificates/dashboard.ysnock.dev.crt
  sudo cp "$OUT_DIR/dashboard.key" /etc/dokploy/traefik/dynamic/certificates/dashboard.ysnock.dev.key
  sudo chmod 600 /etc/dokploy/traefik/dynamic/certificates/dashboard.ysnock.dev.key
  sudo touch /etc/dokploy/traefik/dynamic/zero45-dashboard-cert.yml
  echo "[renew] cert renewed & Traefik reloaded $(date -u)"
fi
