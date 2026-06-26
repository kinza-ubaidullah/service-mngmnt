#!/bin/bash
# Run on VPS: bash deploy-vps.sh
set -e
cd /var/www/aljaroshi

echo "==> Backup local auth change (if any)"
cp -f backend/src/controllers/auth.controller.ts /root/auth.controller.ts.backup 2>/dev/null || true

echo "==> Reset blocking file and pull latest"
git checkout -- backend/src/controllers/auth.controller.ts
git pull origin main

echo "==> Frontend build"
cd frontend
npm install
npm run build

echo "==> Backend build"
cd ../backend
npm install
npx prisma generate
npm run build

echo "==> Restart API"
pm2 restart all --update-env

echo "==> Done — commit:"
git log -1 --oneline
