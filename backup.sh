#!/usr/bin/env bash
# Backup do banco (agende no cron e copie para armazenamento externo criptografado).
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p backups
docker compose exec -T db pg_dump -U fisio fisiomotion | gzip > "backups/fisiomotion-$(date +%F-%H%M).sql.gz"
find backups -name '*.sql.gz' -mtime +30 -delete
