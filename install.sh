#!/usr/bin/env bash
# Instalador PhysioLab (Linux/macOS/WSL). Requer Docker Compose v2 e openssl.
set -euo pipefail
cd "$(dirname "$0")"
need() { command -v "$1" >/dev/null || { echo "Instale '$1' antes de continuar."; exit 1; }; }
need docker; need openssl
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 e necessario."; exit 1; }

ADMIN_PASS=""
if [ -f .env ]; then
  echo ".env ja existe; mantendo configuracao atual."
  ADMIN_EMAIL=""
else
  read -rp "Dominio publico para HTTPS automatico (vazio = apenas localhost): " DOMAIN
  read -rp "E-mail do administrador: " ADMIN_EMAIL
  DB_PASS=$(openssl rand -hex 24)
  JWT_SECRET=$(openssl rand -hex 48)
  ADMIN_PASS=$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-16)
  if [ -n "$DOMAIN" ]; then URL="https://$DOMAIN"; SECURE=true; PROFILES=https
  else URL="http://localhost:3000"; SECURE=false; PROFILES=""; fi
  umask 077
  cat > .env <<ENVEOF
DB_PASS=$DB_PASS
DATABASE_URL=postgresql://fisio:$DB_PASS@db:5432/fisiomotion
JWT_SECRET=$JWT_SECRET
APP_URL=$URL
COOKIE_SECURE=$SECURE
DOMAIN=$DOMAIN
COMPOSE_PROFILES=$PROFILES
ENVEOF
fi

docker compose up -d --build
echo "Aguardando a aplicacao..."
for i in $(seq 1 90); do
  docker compose exec -T app wget -qO- http://localhost:3000/api/health >/dev/null 2>&1 && break
  sleep 2
done

if [ -n "$ADMIN_PASS" ]; then
  docker compose exec -T -e ADMIN_EMAIL="$ADMIN_EMAIL" -e ADMIN_PASSWORD="$ADMIN_PASS" app npx tsx prisma/seed.ts
  echo "=============================================="
  echo " Administrador: $ADMIN_EMAIL"
  echo " Senha provisoria (exibida uma unica vez): $ADMIN_PASS"
  echo " Troque a senha no primeiro acesso."
  echo "=============================================="
fi
echo "Pronto. Acesse: $(grep ^APP_URL .env | cut -d= -f2)"
