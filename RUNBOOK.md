# Brandy — Disaster Recovery & Operational Runbook

> Keep this file updated alongside infrastructure changes. Last reviewed: May 2026.

---

## Table of Contents

1. [Key Contacts](#1-key-contacts)
2. [Architecture Overview](#2-architecture-overview)
3. [Incident Severity Levels](#3-incident-severity-levels)
4. [Service Status Checks](#4-service-status-checks)
5. [Database Recovery (Neon Postgres)](#5-database-recovery-neon-postgres)
6. [Application Recovery (Next.js)](#6-application-recovery-nextjs)
7. [Payment Gateway Incidents](#7-payment-gateway-incidents)
8. [Runbooks by Scenario](#8-runbooks-by-scenario)
   - 8.1 Site Down / 5xx Flood
   - 8.2 Database Connection Exhaustion
   - 8.3 Failed Migration
   - 8.4 Data Corruption
   - 8.5 Secret Rotation
   - 8.6 Redis / Cache Outage
   - 8.7 Sentry Alert Storm
9. [Backup Schedule & Restore](#9-backup-schedule--restore)
10. [Post-Incident Review Checklist](#10-post-incident-review-checklist)

---

## 1. Key Contacts

| Role              | Name           | Contact                        |
| ----------------- | -------------- | ------------------------------ |
| On-call engineer  | —              | (fill in)                      |
| Database (Neon)   | Neon Support   | https://neon.tech/support      |
| Payments (Stripe) | Stripe Support | https://support.stripe.com     |
| Payments (PaySky) | PaySky Support | (fill in from onboarding docs) |
| Payments (Paymob) | Paymob Support | support@paymob.com             |
| CDN / Hosting     | Vercel Support | https://vercel.com/support     |
| Domain Registrar  | (fill in)      | (fill in)                      |

---

## 2. Architecture Overview

```
Browser / Mobile
      │
      ▼
  Vercel Edge (CDN + middleware/proxy)
      │
      ├── Static assets (CDN-cached)
      │
      └── Next.js App Router (serverless functions)
              │
              ├── Neon Postgres (primary DB via prisma)
              ├── Redis / Upstash (guest carts, rate-limit)
              ├── Vercel Blob / Cloudinary (images)
              ├── Resend (transactional email)
              ├── Sentry (error tracking)
              └── Payment gateways (Stripe, PaySky, Paymob, Fawry)
```

**Single source-of-truth for money:** `computeSellerEarnings()` in
`src/lib/seller-earnings.ts`. Seller balances are derived on every read —
never stored as a running total.

---

## 3. Incident Severity Levels

| Sev | Criteria                              | Response Time | Example                                        |
| --- | ------------------------------------- | ------------- | ---------------------------------------------- |
| P1  | Site fully down, payments blocked     | 15 min        | 503 on all routes, DB unreachable              |
| P2  | Key feature broken, workaround exists | 1 h           | Checkout broken, admin panel down              |
| P3  | Degraded experience, not blocking     | 4 h           | Flash-sale scheduler stale, image uploads slow |
| P4  | Minor / cosmetic                      | Next sprint   | Wrong price formatting in one locale           |

---

## 4. Service Status Checks

```bash
# Application health (includes DB ping + Redis ping)
curl -f https://your-domain.com/api/health | jq

# DB migration status
npm run db:migrate:status

# Check recent errors
# → Sentry dashboard: https://sentry.io/organizations/<org>/projects/<project>/

# Vercel deployment status
vercel ls --prod

# Redis connectivity (if using Upstash)
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"
```

The `/api/health` endpoint returns:

```json
{
  "status": "ok",
  "db": "ok",
  "redis": "ok",
  "version": "0.1.0",
  "timestamp": "2026-05-22T..."
}
```

Any `"status": "degraded"` with specific component failures pinpoints the
failing subsystem.

---

## 5. Database Recovery (Neon Postgres)

### 5.1 Instant Restore (Neon Time-Travel)

Neon retains **7 days** of WAL history. You can branch to any point-in-time:

1. Open [Neon Console](https://console.neon.tech) → your project → **Branches**
2. Click **Create Branch** → select **Point in time** → pick a timestamp
3. Use the new branch connection string to verify data
4. If correct, promote it:
   - Update `DATABASE_URL` in your deployment to point to the restored branch
   - Redeploy: `vercel --prod`

### 5.2 Manual Backup Restore

```bash
# Dump (run on a healthy DB)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-acl \
  --no-owner \
  -f brandy_$(date +%Y%m%d_%H%M).dump

# Restore to a fresh Neon branch
pg_restore \
  --no-acl \
  --no-owner \
  -d "$RESTORE_DATABASE_URL" \
  brandy_YYYYMMDD_HHMM.dump
```

### 5.3 Apply Pending Migrations After Restore

```bash
DATABASE_URL="$RESTORE_DATABASE_URL" npm run db:migrate:deploy
```

### 5.4 Connection Pool Exhaustion

Neon free tier: 20 connections. Paid tier: configurable.

```bash
# Check active connections
psql "$DATABASE_URL" -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Kill idle connections older than 5 minutes
psql "$DATABASE_URL" -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
     AND query_start < now() - interval '5 minutes';"
```

If Prisma is leaking connections: restart the serverless function instances
(Vercel: redeploy with `vercel --prod --force`).

---

## 6. Application Recovery (Next.js)

### 6.1 Rollback a Bad Deployment

```bash
# List recent deployments
vercel ls

# Roll back to the previous prod deployment
vercel rollback [deployment-url]
# OR promote a specific previous deployment:
vercel promote [deployment-url] --scope <team>
```

### 6.2 Failed Build

1. Check build logs: `vercel logs [deployment-url]`
2. Common causes:
   - Missing env var → add in Vercel dashboard → redeploy
   - Type error: `npm run typecheck` locally
   - Prisma client out of sync: `npx prisma generate && npm run build`

### 6.3 Middleware / Edge Runtime Error

The `src/proxy.ts` middleware handles CSP, CSRF, and rate-limiting. If it
starts returning 500 for all requests:

```bash
# Disable middleware temporarily by commenting out the matcher in src/proxy.ts
# and redeploying, then investigate the error in Sentry.
```

---

## 7. Payment Gateway Incidents

### 7.1 Stripe Webhook Failure

Stripe retries failed webhooks for **72 hours** with exponential backoff.

```bash
# Re-deliver a specific webhook event from the Stripe dashboard:
# Dashboard → Developers → Webhooks → select endpoint → Failed deliveries

# Or replay via CLI:
stripe events resend evt_xxx --webhook-endpoint we_xxx
```

If orders are stuck in `PENDING` after payment:

```sql
-- Find stuck orders (paid in Stripe but still PENDING > 30 min)
SELECT id, idempotency_key, status, "createdAt"
FROM "Order"
WHERE status = 'PENDING'
  AND "createdAt" < now() - interval '30 minutes';
```

Then manually verify in Stripe dashboard and update if needed.

### 7.2 PaySky Callback Not Received

PaySky posts to `/api/payment/paysky/callback`. If the callback never
arrives:

1. Check PaySky merchant portal for transaction status
2. Pending key in Redis: `paysky:pending:<MerchantReference>` (1-hour TTL)
3. If confirmed paid in PaySky but order still PENDING:
   - Manually trigger `createOrder()` with the cached Redis payload, or
   - Create the order in admin → Orders with `PAID` status

---

## 8. Runbooks by Scenario

### 8.1 Site Down / 5xx Flood

```
1. Check https://your-domain.com/api/health
2. Check Vercel status: https://vercel-status.com
3. Check Neon status: https://neonstatus.com
4. If DB is the culprit → see §5
5. If app is the culprit → rollback last deployment (§6.1)
6. Open Sentry, filter by last 15 min, identify the error trace
7. Hotfix + redeploy, or rollback + schedule fix
```

### 8.2 Database Connection Exhaustion

```
1. `psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"`
2. Kill idle connections (§5.4)
3. Force-redeploy to recycle Prisma connection pools:
   vercel --prod --force
4. If recurrent: add `connection_limit=5&pool_timeout=10` to DATABASE_URL
   or switch to PgBouncer (Neon has this built-in)
```

### 8.3 Failed Migration in Production

```
1. npm run db:migrate:status   # identify which migration failed
2. Check migration SQL manually for the failing statement
3. Fix in prisma/migrations/<timestamp>/migration.sql
4. npm run db:migrate:deploy   # retry apply
5. If irreversible: create a new corrective migration
6. NEVER use db:migrate:reset in production
```

### 8.4 Data Corruption

```
1. Immediately create a Neon branch from 5 minutes before the incident
2. Run SELECT queries to confirm corruption scope
3. Export the affected rows from the healthy branch:
   pg_dump --table="Order" --data-only "$HEALTHY_DB_URL" -f orders_healthy.sql
4. Apply to production with careful WHERE clauses
5. Re-run integrity checks via /api/admin/reports (or direct SQL)
```

### 8.5 Secret Rotation

When rotating a secret (e.g., `NEXTAUTH_SECRET`, `BANK_ACCOUNT_SECRET`):

```
# NEXTAUTH_SECRET rotation (invalidates all sessions)
1. Generate new secret: openssl rand -base64 32
2. Update in Vercel env vars (do NOT commit to git)
3. Redeploy: vercel --prod
4. All users will be logged out — acceptable for security rotation

# BANK_ACCOUNT_SECRET rotation (re-encrypt all stored bank details)
1. Write a migration script that:
   a. Reads all encrypted SellerProfile.bankAccount values with old key
   b. Re-encrypts with new key
   c. Writes back in a single transaction
2. Deploy new secret + updated migration atomically
```

### 8.6 Redis / Cache Outage

If Redis is unavailable:

- Guest carts will fail to persist → buyers see empty cart on next page load
- Rate limiting falls back to in-memory (per-instance, not global)
- Stripe/PaySky pending order caches are lost → webhook cannot finalize
  → affected orders stay PENDING; manually investigate (§7.1)

```
1. Check REDIS_URL / UPSTASH status
2. Restart Redis instance or switch to backup Upstash database
3. Pending orders: check Stripe dashboard for 30-min-old PENDING orders
```

### 8.7 Sentry Alert Storm

```
1. Identify the root error in Sentry → group by fingerprint
2. If it's a known transient error (e.g. network timeout):
   Add a beforeSend filter in sentry.client.config.ts / sentry.server.config.ts
3. If it's a real regression: rollback last deployment
4. Mute the alert in Sentry while fixing if needed (set ignore until)
```

---

## 9. Backup Schedule & Restore

| What            | How                                   | Frequency         | Retention                      |
| --------------- | ------------------------------------- | ----------------- | ------------------------------ |
| Postgres        | Neon continuous WAL + snapshots       | Continuous        | 7 days (free) / 30 days (paid) |
| Postgres manual | `pg_dump` via cron to Blob storage    | Daily 03:00 Cairo | 30 days                        |
| Redis           | Upstash auto-persistence              | Per write         | 7 days                         |
| Media (images)  | Vercel Blob / Cloudinary (CDN-backed) | On upload         | Indefinite                     |
| Codebase        | Git + GitHub                          | Every push        | Indefinite                     |

**Monthly DR drill:** Once a month, test restore to a Neon branch and run
`npm run db:migrate:status` + full test suite against it.

---

## 10. Post-Incident Review Checklist

After every P1 or P2 incident, fill in and commit a `docs/incidents/YYYY-MM-DD.md`:

- [ ] Timeline (when detected, root cause confirmed, resolved)
- [ ] Root cause (one sentence)
- [ ] Impact (users affected, revenue impact, duration)
- [ ] What went well
- [ ] What went wrong / could be improved
- [ ] Action items with owner + due date
- [ ] Monitoring / alerting improvements added

---

_End of runbook. Update on every major infrastructure change._
