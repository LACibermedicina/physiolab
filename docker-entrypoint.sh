#!/bin/sh
set -e
if [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "AVISO: sem prisma/migrations; usando db push (apenas instalacao inicial)."
  npx prisma db push --skip-generate
fi
exec npm start
