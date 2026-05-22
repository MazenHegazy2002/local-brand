#!/usr/bin/env bash
# scripts/setup-staging.sh
# One-time setup for a Brandy staging environment on Vercel + Neon.
# Run from repo root: bash scripts/setup-staging.sh
#
# Prerequisites:
#   - Vercel CLI installed:  npm i -g vercel
#   - Neon CLI installed:    npm i -g neonctl
#   - Logged in to both:     vercel login && neonctl auth
#
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Brandy Staging Environment Setup              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Create Neon branch ─────────────────────────────────────────────
echo "1/5  Creating Neon DB branch 'staging'…"
NEON_PROJECT_ID="${NEON_PROJECT_ID:-}"
if [ -z "$NEON_PROJECT_ID" ]; then
  echo "     ⚠  Set NEON_PROJECT_ID env var first."
  echo "        Find it at: console.neon.tech → your project → Settings"
  echo "     Skipping Neon branch creation."
else
  neonctl branches create \
    --project-id "$NEON_PROJECT_ID" \
    --name staging \
    --parent main \
    || echo "     Branch 'staging' may already exist — continuing."
  echo "     ✅ Neon branch 'staging' ready."
  echo "     Get its connection string:"
  echo "       neonctl connection-string --project-id $NEON_PROJECT_ID --branch staging"
fi

# ── Step 2: Create Vercel project ──────────────────────────────────────────
echo ""
echo "2/5  Creating Vercel project 'brandy-staging'…"
echo "     Run manually:"
echo "       vercel link --project brandy-staging"
echo "       vercel deploy --prod --config vercel.staging.json"

# ── Step 3: Copy env vars ──────────────────────────────────────────────────
echo ""
echo "3/5  Copying env vars from production to staging…"
echo "     Run manually (requires production project to be linked):"
echo "       vercel env pull .env.production --environment production"
echo "       # Then update DATABASE_URL to the staging Neon branch URL"
echo "       # Then push:"
echo "       vercel env add DATABASE_URL < /dev/stdin  # paste staging URL"
echo "       vercel env add NEXTAUTH_URL              # https://staging.lolozozo.shop"
echo "       vercel env add NEXT_PUBLIC_APP_URL       # https://staging.lolozozo.shop"

# ── Step 4: Apply migrations ───────────────────────────────────────────────
echo ""
echo "4/5  Applying DB migrations to staging branch…"
echo "     After updating DATABASE_URL in .env.local to the staging URL, run:"
echo "       npm run db:migrate:deploy"

# ── Step 5: Seed starter data ──────────────────────────────────────────────
echo ""
echo "5/5  Seeding starter accounts…"
echo "     After step 4:"
echo "       npm run db:seed"
echo "       npx tsx scripts/seed-affiliate-demo.ts"

echo ""
echo "✅  Staging setup checklist complete."
echo "    See LAUNCH_CHECKLIST.md §9 for full details."
echo ""
