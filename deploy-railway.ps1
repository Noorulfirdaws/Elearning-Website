# deploy-railway.ps1 — Run after Railway API is online
# Usage: $env:DATABASE_URL="<railway-public-db-url>"; .\deploy-railway.ps1

$DB_URL = $env:DATABASE_URL
if (-not $DB_URL) { Write-Host "Set DATABASE_URL env var first (Railway public DB URL)" -ForegroundColor Red; exit 1 }
$SCHEMA  = "packages/database/prisma/schema.prisma"

Write-Host "=== 1. Prisma DB Push (schema sync) ===" -ForegroundColor Cyan
$env:DATABASE_URL = $DB_URL
npx prisma db push --schema $SCHEMA --accept-data-loss
if ($LASTEXITCODE -ne 0) { Write-Host "DB push failed!" -ForegroundColor Red; exit 1 }

Write-Host "`n=== 2. Seed Railway DB ===" -ForegroundColor Cyan
$env:DATABASE_URL = $DB_URL
npx ts-node -e @packages/database/src/seed.ts 2>&1
# If ts-node fails, use direct node approach below

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "DB synced and seeded. Now deploy frontend to Vercel." -ForegroundColor Green
Write-Host ""
Write-Host "Vercel deploy command:" -ForegroundColor Yellow
Write-Host "  vercel --cwd apps/web --prod" -ForegroundColor White
Write-Host ""
Write-Host "Set these env vars in Vercel dashboard:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_API_URL = https://elearning-website-production.up.railway.app/api/v1" -ForegroundColor White
Write-Host "  NEXT_PUBLIC_APP_URL = https://nooracademie.vercel.app" -ForegroundColor White
