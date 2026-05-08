# Local Brand — Architecture Memory

Living document. Last updated: **2026-05-08**.

For the punchlist of bugs / TODOs / cleanup, see [`help.txt`](./help.txt).

---

## What this is

A multi-vendor Egyptian e-commerce marketplace. Buyers register, browse,
and order from sellers; sellers manage inventory and request payouts;
admins moderate everything via a dedicated `/admin-os` console.

## Stack

| Layer        | Tech                                                |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js 16.2.4 (App Router, Turbopack, RSC + Edge)  |
| UI           | React 19.2.4 + Tailwind CSS 3.4 + lucide-react      |
| Auth         | NextAuth (Credentials + Google OAuth)               |
| Database     | Neon Postgres via Prisma 6.19.3                     |
| Cache / Pub  | Upstash Redis (rate-limit, SSE pub/sub, guest cart) |
| Email        | Resend (with dev-mode console fallback)             |
| Storage      | Vercel Blob (preferred) or Cloudinary (fallback)    |
| Payments     | Stripe + PayMob + Fawry + **PaySky PayForm**        |
| Analytics    | Vercel Analytics + Speed Insights + custom Vitals   |
| Testing      | Jest 30 + jsdom (42 tests, 5 suites)                |
| Deploy       | Vercel (`vercel.json`) — region `fra1`              |

## Repo layout

```
src/
├── app/
│   ├── (public pages)/       /, /shop, /product/[id], /category/[slug] ...
│   ├── api/                  52 route handlers (REST + SSE + cron)
│   ├── actions/              Server Actions (orders, seller, loyalty)
│   ├── admin-os/             Admin console (dashboard, financial, audit, banners)
│   ├── seller-hub/           Seller console (overview, orders, products, wallet, settings, returns)
│   ├── dashboard/            Customer dashboard (orders, wishlist, settings)
│   ├── checkout/             Multi-step checkout
│   ├── help/                 FAQ + contact ticket form
│   ├── legal/                Privacy, returns, shipping, seller-terms
│   ├── layout.tsx            Root layout — providers, Analytics, CookieConsent, InstallPrompt
│   └── middleware.ts         RBAC + rate-limit (rename → proxy.ts in Next 16)
├── components/               60+ React components
│   ├── ui/                   Reusable primitives (Button, Modal, Toast, ...)
│   └── PaySkyCheckout, ProductQuickView, RecentlyViewed, RelatedProducts, ...
├── lib/
│   ├── constants.ts          VAT, commission, shipping, env-bound singletons
│   ├── formatters.ts         EGP currency, locale dates, Arabic plurals
│   ├── jsonld.ts             schema.org generators
│   ├── paysky.ts             HMAC + canonicalize + verifyCallbackHash
│   ├── email.ts              Resend wrapper + 5 templates
│   ├── validation.ts         Zod schemas for every API + action
│   └── ...
├── types/index.ts            Single source of truth for domain types
└── generated/client/         Prisma Client (gitignored)

prisma/
├── schema.prisma             23 models
├── seed.ts                   Test data seeder
└── dev.db                    Stale SQLite (slated for deletion — see help.txt §1.3)

tests/
├── example.test.ts           Constants
├── formatters.test.ts        Locale formatters
├── jsonld.test.ts            schema.org
├── paysky.test.ts            HMAC ref vectors
└── sanitize.test.ts          XSS / cn()
```

## Core domain flow

### Order placement (default — Cash on Delivery)

```
   ┌──────────┐  POST /api/checkout                ┌──────────┐
   │  client  │ ──────────────────────────────────▶│  server  │
   └──────────┘   { items, addressId, ... }        └──────────┘
                                                        │
                                                        ▼
                                             createOrder() in
                                             src/app/actions/orders.ts
                                                        │
                                              prisma.$transaction:
                                                ├─ stock decrement (atomic)
                                                ├─ Order.create
                                                └─ Coupon.usedCount++
                                                        │
                                                        ▼
                                              loyalty + email (async, after-tx)
                                                        │
                                                        ▼
                                              return { orderId }
```

### Order placement (PaySky PayForm)

```
   client ──POST /api/payment/paysky──▶ server signs Lightbox config
                                        with HMAC-SHA256(merchantSecretHex)
                                          │
                                          ├─ caches pending cart in
                                          │    Redis paysky:pending:<ref> (1 h TTL)
                                          ▼
                                        returns lightboxConfig + lightboxUrl
   client loads PaySky LightBox.js, pops up modal
   user enters card, PaySky processes
                                          ▼
   PaySky completeCallback fires on the iframe with SystemReference + SecureHash
                                          ▼
   client ──POST /api/payment/paysky/callback──▶ server
                                                  │
                                                  ├─ verifyCallbackHash() with timingSafeEqual
                                                  ├─ idempotency check on MerchantReference
                                                  ├─ pull cached cart from Redis
                                                  ├─ createOrder(...)
                                                  └─ Order.update { paymentStatus: 'PAID',
                                                                    status: 'CONFIRMED',
                                                                    paymentId: SystemReference,
                                                                    paymentChannel: PaidThrough,
                                                                    paymentNetworkRef: NetworkReference,
                                                                    paymentMaskedPan: PayerAccount,
                                                                    idempotencyKey: MerchantReference }
                                          ▼
                                        client → /checkout/success?orderId=...
```

### Seller payout (escrow)

```
  Order delivered ──┐
                    ├─ 7-day hold (ESCROW_HOLD_DAYS in constants.ts)
                    ▼
  vercel.json cron → /api/cron/payouts
                       └─ processEscrowPayouts()
                          ├─ find orders where status=DELIVERED
                          │  and updatedAt < now - 7 d
                          │  and payoutProcessedAt IS NULL
                          └─ transaction:
                               ├─ SellerProfile.balance += (gross - commission)
                               ├─ Payout.create({ amount, status: 'PAID' })
                               └─ Order.update({ payoutProcessedAt: now })

  Seller withdraws via /api/payouts/request (POST):
    └─ creates Payout(status: 'PENDING') and decrements SellerProfile.balance
```

## Security model

1. **RBAC** is enforced server-side in `src/middleware.ts` (and on every
   server action / API route via `getServerSession()` checks).
2. **Rate limiting** runs in middleware via Redis-backed sliding window
   (`src/lib/rateLimit.ts`).
3. **All payment confirmations** are server-verified (Stripe webhook
   signature; PaySky SecureHash with `crypto.timingSafeEqual`; PayMob
   webhook).
4. **All Prisma writes** in checkout flows use `prisma.$transaction` so
   stock + order + coupon are atomic.
5. **User-generated HTML** (product descriptions, Q&A) goes through
   `sanitizeHtml()` (isomorphic-dompurify) with an explicit allow-list.
6. **Cron routes** verify a `CRON_SECRET` header before running.
7. **Soft delete** with `deletedAt` for User, SellerProfile, Product
   (preserves order history / legal records while anonymising PII).
8. **CSP + X-Frame-Options + nosniff** in `vercel.json` and
   `next.config.ts` (note: the two CSPs need to be reconciled — see
   `help.txt` §2.1 / §2.2).

## Internationalisation

Currently a hybrid — **server-rendered dictionary** in
`src/lib/i18n/dicts.ts` (en / ar) plus a **Google Translate widget** in
the layout for everything that's not in the dictionary. Long-term plan
is to migrate to `next-intl` (deferred — see Phase 9 in help.txt).

- `formatEGP(amount, locale)` — currency, locale-aware
- `formatDateLong / formatRelativeTime` — locale-aware
- `pluralize(count, forms, locale)` — full Arabic plural rules

## Testing

`npm test` runs 5 suites (42 tests). Coverage gaps are tracked in
help.txt §9. Run `npm test -- --coverage` to see line-by-line coverage.

## Deployment

- **Vercel** is the canonical target (`vercel.json` defines headers,
  redirects, and 2 cron jobs).
- A **Docker** alternative exists (`Dockerfile` + `docker-compose.yml`)
  driven by `.github/workflows/deploy.yml` for self-hosted setups.
- **Migrations**: currently using `prisma db push` (NOT recommended for
  production — see help.txt §1.1).

## Where to start when you pick this up

1. Read **help.txt** end-to-end.
2. Tackle help.txt §12 DAY 1 items — they unblock a clean production
   deploy.
3. Run `npm test && npm run build` after every change.
4. Check `git status` before commits — there are stale files at the
   repo root that should NOT be re-added (see help.txt §1.4).

---

Maintainer: Mazen
Reviewer (this round): Devin / Claude Opus 4.7
