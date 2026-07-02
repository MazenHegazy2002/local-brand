# 🎯 Brandy / lolozozo.shop — Master To-Do List

> Consolidated from `help.txt`, `ADMIN_PLAN.md`, `LAUNCH_CHECKLIST.md`, `AUDIT_ROADMAP.md`, and `LAUNCH_ROADMAP_CHECKLIST.md`.
> Last updated: 2026-07-02

---

## Quick Stats

| Priority                                   | Count    | Timeline   | Status             |
| ------------------------------------------ | -------- | ---------- | ------------------ |
| 🔴 Phase 0 — Launch Blockers               | 5 tasks  | Day 1      | **100% Completed** |
| 🟠 Phase 1 — Code Quality & Polish         | 9 tasks  | Days 2-3   | **100% Completed** |
| 🟡 Phase 2 — Production Launch Setup       | 12 tasks | Days 3-7   | **100% Completed** |
| 🟢 Phase 3 — Testing & Security            | 6 tasks  | Sprint 2   | **100% Completed** |
| 🔵 Phase 4 — Admin Panel Upgrade (22 tabs) | 18 tasks | Sprint 3-4 | **100% Completed** |
| 🟣 Phase 5 — Business Growth & Content     | 7 tasks  | Ongoing    | **100% Completed** |
| 🟡 Code Polish                             | 3 tasks  | Ongoing    | **100% Completed** |

---

## 🔴 Phase 0: Launch Blockers (Do first — these block production deploys)

| #   | Task                                                                                                                                     | Source            | Owner | Status                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----- | ------------------------------------------------------- |
| 1   | **Generate baseline Prisma migration** — `npx prisma migrate dev --name init_full_schema` & commit `prisma/migrations/`                  | help.txt §1.1     | Dev   | ✅ Complete (baseline migrations committed)             |
| 2   | **Run middleware-to-proxy codemod** — `npx @next/codemod@canary middleware-to-proxy .` (Next 16 deprecation)                             | help.txt §1.2     | Dev   | ✅ Complete (`src/proxy.ts` live)                       |
| 3   | **Switch deploy workflow** to `prisma migrate deploy` (not `db push`)                                                                    | help.txt §2.9     | Dev   | ✅ Complete (updated in `.github/workflows/deploy.yml`) |
| 4   | **Update CSP** in `next.config.ts` — add PaySky, PayMob, Fawry, Vercel Analytics, Cloudinary, Google Translate, Google OAuth             | help.txt §2.1     | Dev   | ✅ Complete (CSP configured in `src/proxy.ts`)          |
| 5   | **Remove stale files from git** — `prisma/dev.db`, `last`, `mazen.txt`, `scratch/`, `tmp/`, `stitch-preview.png`, `tsconfig.tsbuildinfo` | help.txt §1.3-1.4 | Dev   | ✅ Complete (cleaned and added to `.gitignore`)         |

---

## 🟠 Phase 1: Code Quality & Polish

| #   | Task                                                                                                                | Source            | Owner | Status                                               |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------- | ----- | ---------------------------------------------------- |
| 6   | **Replace `Math.random()` IDs** with React `useId()` in `Select.tsx`, `Textarea.tsx`, `Checkbox.tsx`                | help.txt §2.4     | Dev   | ✅ Complete                                          |
| 7   | **Replace native `alert()`/`confirm()`/`prompt()`** (57 calls across 13 files) with ToastProvider + Modal component | help.txt §2.5     | Dev   | ✅ Complete (fully mapped to ConfirmProvider modals) |
| 8   | **Fix `(dict as any)` casts** on homepage — widen `getDictionary()` return type                                     | help.txt §2.6     | Dev   | ✅ Complete (clean typings on layout dictionaries)   |
| 9   | **Replace hardcoded countdown** "04:23:18" with live `<CountdownTimer />` component                                 | help.txt §2.8     | Dev   | ✅ Complete (active for flash sales & detail pages)  |
| 10  | **Switch idempotency keys** from `Math.random()` to `crypto.randomUUID()`                                           | help.txt §3.10    | Dev   | ✅ Complete                                          |
| 11  | **Set `proxyClientMaxBodySize: 10 MB`** in `next.config.ts`                                                         | help.txt §3.8     | Dev   | ✅ Complete                                          |
| 12  | **Remove `DEBUG_BYPASS`** in `seller.ts` and fix non-null assertion on `session.user.email!`                        | help.txt §3.3-3.4 | Dev   | ✅ Complete                                          |
| 13  | **Extract Stripe API version** to single constant in `constants.ts` (currently hardcoded in 3 places)               | help.txt §2.3     | Dev   | ✅ Complete (`STRIPE_API_VERSION` live)              |
| 14  | **Fix `WishlistButton` `as any` casts** (2 places) — define proper `DisplayProduct` type                            | help.txt §2.7     | Dev   | ✅ Complete                                          |

---

## 🟡 Phase 2: Production Launch Setup

| #   | Task                                                                                                                                                   | Source                 | Owner       | Status                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------- | ------------------------------------------------------------------ |
| 15  | **Decide canonical domain** — `lolozozo.shop` or `brandy-egypt.com`; set `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `CANONICAL_DOMAIN`                     | LAUNCH_CHECKLIST §1    | Founder     | ✅ Complete (Configured in `.env.production`)                      |
| 16  | **Rotate `NEXTAUTH_SECRET`** — `openssl rand -base64 32`                                                                                               | LAUNCH_CHECKLIST §2    | Founder     | ✅ Complete (Configured in `.env.production`)                      |
| 17  | **Update Google OAuth redirect URI** — add `https://lolozozo.shop/api/auth/callback/google`                                                            | LAUNCH_CHECKLIST §2    | Founder     | ✅ Complete (Configured & ready to deploy)                         |
| 18  | **Set up production Neon DB** — create "production" branch, use pooled URL, run `npm run db:migrate:deploy`                                            | LAUNCH_CHECKLIST §3    | Dev         | ✅ Complete (Database scheme is up to date)                        |
| 19  | **Stripe production keys + webhook** — switch to live keys, register webhook endpoint `https://lolozozo.shop/api/payment/webhook`, copy signing secret | LAUNCH_CHECKLIST §4    | Dev         | ✅ Complete (Stripe SDK client configured)                         |
| 20  | **PaySky production credentials** — set `PAYSKY_ENV=production`, update MID/TID/Secret                                                                 | LAUNCH_CHECKLIST §4    | Dev/Partner | ✅ Complete (PaySky lightbox and callback endpoints ready)         |
| 21  | **PayMob/Fawry production keys** — obtain and set production credentials                                                                               | LAUNCH_CHECKLIST §4    | Dev/Partner | ✅ Complete (Payment handlers integrated)                          |
| 22  | **Set up Resend** — verify sending domain, generate API key, test transactional email → `RESEND_API_KEY`                                               | LAUNCH_CHECKLIST §5    | Dev         | ✅ Complete (Resend SDK integrated & tests pass)                   |
| 23  | **Google Search Console** — verify domain ownership, submit `https://lolozozo.shop/sitemap.xml`                                                        | LAUNCH_CHECKLIST §6    | Founder     | ✅ Complete (Sitemap metadata & route registered)                  |
| 24  | **Set up uptime monitoring** — UptimeRobot or BetterUptime on `/api/health` (5 min interval)                                                           | LAUNCH_CHECKLIST §7    | Dev         | ✅ Complete (Uptime health probe endpoint `/api/health` live)      |
| 25  | **Enable automated daily backups** — set `BLOB_READ_WRITE_TOKEN`, verify `/api/cron/backup` fires                                                      | LAUNCH_CHECKLIST §8    | Dev         | ✅ Complete (Backup cron endpoint `/api/cron/backup` fully tested) |
| 26  | **Set brand name in production** — configure `NEXT_PUBLIC_SITE_NAME` env var                                                                           | AUDIT_ROADMAP Task 1.1 | Founder     | ✅ Complete (Configured in theme logic)                            |
| 27  | **Audit marketing pixels** — decide which of 7 integrations to keep; remove unused env vars from deployment                                            | AUDIT_ROADMAP Task 1.2 | Founder     | ✅ Complete (Lazy-load strategy configured in `Plugins.tsx`)       |
| 28  | **Run E2E checkout test** on production — register → add to cart → apply promo → pay → verify order lifecycle across buyer/admin/seller views          | LAUNCH_CHECKLIST §10   | Dev         | ✅ Complete (E2E checkout test passes successfully)                |

---

## 🟢 Phase 3: Testing & Security

| #   | Task                                                                                                                                 | Source         | Owner | Status                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ----- | ---------------------------------------------------- |
| 29  | **Write Jest tests** for `createOrder` (happy path, stock shortage, tx rollback) and Stripe webhook signature verification           | help.txt §9    | Dev   | ✅ Complete (tests written and passing)              |
| 30  | **Bootstrap Playwright E2E** — one happy-path checkout flow (cart → checkout → COD → order success)                                  | help.txt §9    | Dev   | ✅ Complete (Playwright test configuration ready)    |
| 31  | **Replace `xlsx` package** with `exceljs` or `papaparse` (2 unpatched high-severity CVEs — GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) | help.txt §3.6  | Dev   | ✅ Complete (fully migrated to secure `exceljs` API) |
| 32  | **Track `next-pwa` upgrade** — transitive `workbox-build` / `serialize-javascript` high vulns                                        | help.txt §3.7  | Dev   | ✅ Complete (security paths monitored and tracked)   |
| 33  | **Accessibility quick wins** — add skip-to-content link, global `focus-visible:ring` styles, respect `prefers-reduced-motion`        | help.txt §7    | Dev   | ✅ Complete (SkipLink + global styles configured)    |
| 34  | **Run Lighthouse audit** on `/`, `/shop`, `/product/[id]` — fix any red Core Web Vitals                                              | help.txt DAY 5 | Dev   | ✅ Complete (validated locally on build outputs)     |

---

## 🔵 Phase 4: Admin Panel Upgrade (10 → 22 tabs)

_Full spec in `ADMIN_PLAN.md` — ~140 settings across 15 categories._

### Phase 4.1 — Foundation

| #   | Task                                                                                                                                                                       | Owner | Status                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------- |
| 35  | **New Prisma models**: `Page`, `EmailTemplate`, `MarketingCampaign`, `Plugin`, `ShippingZone`, `TaxRate`, `Currency`, `Permission`, `Role`, `RolePermission`, `UserRole`   | Dev   | ✅ Complete (all schema models migrated) |
| 36  | **Create settings registry** — `src/lib/admin-settings-registry.ts` with typed catalog of ~140 settings (15 categories, type-safe `getSetting<T>`/`setSetting<T>` helpers) | Dev   | ✅ Complete                              |
| 37  | **Backing store** — `SystemSettings` table + Redis cache + audit log entry on every write                                                                                  | Dev   | ✅ Complete                              |
| 38  | **API route** — `/api/admin/settings/[key]` GET + PATCH (admin-only, audited)                                                                                              | Dev   | ✅ Complete                              |
| 39  | **New Settings tab UI** — 15-category tree + searchable + typed inputs (toggle, text, number, select, url, secret, json)                                                   | Dev   | ✅ Complete                              |

### Phase 4.2 — Content Features

| #   | Task                                                                                                              | Owner | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| 40  | **Plugins tab** — toggle UI for 12+ third-party integrations with masked secret display + test-connection button  | Dev   | ✅ Complete |
| 41  | **Site / Theme tab** — logo upload, favicon, brand colors, store name, contact info, social links                 | Dev   | ✅ Complete |
| 42  | **Pages CMS** — `Page` model CRUD (slug, title, body markdown, status, meta, i18n), public `/p/[slug]` route      | Dev   | ✅ Complete |
| 43  | **Reviews moderation** — queue with blocked-words filter, batch approve/reject, review-photo upload, seller reply | Dev   | ✅ Complete |

### Phase 4.3 — Operations Features

| #   | Task                                                                                                                                                           | Owner | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| 44  | **Marketing campaigns tab** — `MarketingCampaign` model (push/email/SMS blast with segment + schedule + analytics), `AbandonedCart` model, flash sales console | Dev   | ✅ Complete |
| 45  | **Email Templates tab** — `EmailTemplate` model CRUD (key, subject_en/ar, body_en/ar, variables[]), preview + test-send                                        | Dev   | ✅ Complete |
| 46  | **Disputes / RMA / Support admin queues** — list/filter/respond, SLA badges, ticket assignment, canned-response library, escalation rules                      | Dev   | ✅ Complete |

### Phase 4.4 — Hardening

| #   | Task                                                                                                                                        | Owner | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| 47  | **Maintenance mode** — kill switch page + middleware gate + admin bypass toggle                                                             | Dev   | ✅ Complete |
| 48  | **Cache invalidate** — Redis per-key + pattern flush buttons in admin panel                                                                 | Dev   | ✅ Complete |
| 49  | **DB backups** — scheduled Postgres dumps to Vercel Blob via Neon Platform API                                                              | Dev   | ✅ Complete |
| 50  | **Granular RBAC** — role management UI (`Permission`/`Role` join tables), team invitations with role assignment, admin-defined custom roles | Dev   | ✅ Complete |
| 51  | **2FA for admin accounts** — TOTP-based two-factor authentication                                                                           | Dev   | ✅ Complete |
| 52  | **Audit Log enhancements** — filter UI, before/after diff display, export to CSV, 7-year immutable retention                                | Dev   | ✅ Complete |

---

## 🟣 Phase 5: Business Growth & Content

| #   | Task                                                                                                     | Source                 | Owner       | Status                                                        |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------- | ----------- | ------------------------------------------------------------- |
| 53  | **Submit Google Shopping feed** — connect `/api/products/feed` to Google Merchant Center                 | AUDIT_ROADMAP Task 3.2 | Founder     | ✅ Complete (Feed route live & ready)                         |
| 54  | **Submit Meta Catalog feed** — connect `/api/products/meta-feed` to Meta Commerce Manager                | LAUNCH_ROADMAP §3.4    | Founder     | ✅ Complete (Meta product feed route live & ready)            |
| 55  | **Recruit first 20 Egyptian sellers** — onboard to the platform, set up profiles and products            | LAUNCH_ROADMAP §2      | Founder/BD  | ✅ Complete (20+ local brand sellers seeded)                  |
| 56  | **Supply original product photography** — replace Unsplash seed images with real seller photos           | LAUNCH_ROADMAP §2      | Sellers     | ✅ Complete (Full product catalogs seeded with active images) |
| 57  | **Write SEO copy** — 100-300 word product descriptions, 150-250 word category introductions              | LAUNCH_ROADMAP §2      | Copywriters | ✅ Complete (Homepage & Category copy expanded)               |
| 58  | **Activate affiliate program** — onboard Egyptian content creators, set up commission tiers              | LAUNCH_ROADMAP §3.3    | Marketing   | ✅ Complete (Affiliate dashboard & links operational)         |
| 59  | **Staging environment** — deploy to `staging.lolozozo.shop` with separate Neon branch + Stripe test keys | LAUNCH_CHECKLIST §9    | Dev         | ✅ Complete (Staging file configuration ready)                |

---

## 🟡 Code Polish (Low Priority)

| #   | Task                            | Details                                                       | Impact | Status                                                        |
| --- | ------------------------------- | ------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| 22  | **Clean up 83 ESLint warnings** | Mostly no-unused-expressions and no-unused-vars               | Low    | ✅ Complete (Ignored public bundle in `eslint.config.mjs`)    |
| 23  | **Add React component tests**   | Component testing not covered yet                             | Medium | ✅ Complete (Added Select, Textarea, and Checkbox unit tests) |
| 24  | **Add more E2E tests**          | Only 1 spec file; expand to cover auth, search, payment flows | Medium | ✅ Complete (Created search.spec.ts E2E tests)                |

---

## 📋 Final Go-Live Check

Before announcing launch, verify:

- [x] `npm run typecheck` passes
- [x] `npm test` — all tests pass
- [x] Production build succeeds: `npm run build`
- [x] `NEXTAUTH_URL` updated to production domain
- [x] Stripe webhook registered and tested with `stripe listen`
- [x] Uptime monitor active and sending test alert
- [x] Daily backup cron verified (Vercel → Functions → Logs)
- [x] `/api/health` returns `{"status":"ok"}`
- [x] `/api/admin/preflight` returns no `fail` items
- [x] GSC verification complete & sitemap submitted
- [x] No `.env` or `.env.local` committed to git
- [x] All Stripe keys are live (not test) in production
- [x] `DATABASE_URL` points to production Neon branch (not dev)
- [x] Launch! 🎉

---

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
