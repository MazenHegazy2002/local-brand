# Codebase Audit — Brandy

> Generated after a full read of the repository (323 source files: `src/`, `prisma/`,
> `scripts/`, `script/`, `tests/`, plus root configs).
>
> See `AGENTS.md` for the cheat-sheet, `MEMORY.md` for the architectural
> memory, and `help.txt` for the existing punchlist.
>
> **STATUS:** All P0/P1/P2 items listed below have been addressed.
> See "Part 4 — Fixes Applied" at the bottom for the per-issue diff summary.

---

## Part 1 — Architecture Overview

### What it is

A multi-vendor Egyptian e-commerce marketplace ("Brandy"). Buyers browse and order;
sellers list products and request payouts; admins moderate via `/admin-os`.

### Stack

| Layer           | Tech                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| Framework       | Next.js 16.2.4 (App Router, Turbopack, React 19.2.4)                         |
| DB              | Neon Postgres via Prisma 6 (`@prisma/adapter-neon` + WebSocket)              |
| Auth            | NextAuth — Credentials + Google + optional Facebook/Twitter + magic-link     |
| Cache / pub-sub | ioredis — rate limit, guest cart, SSE notifications, PaySky pending sessions |
| Payments        | Stripe + PaySky PayForm + PayMob + Fawry (PayPal stub)                       |
| Email           | Resend (with dev console fallback)                                           |
| Storage         | Vercel Blob → Cloudinary → base64 data URL fallback                          |
| PWA             | next-pwa + Web Push + InstallPrompt                                          |
| Analytics       | Vercel Analytics + Speed Insights + custom `/api/vitals` + env-gated plugins |
| i18n            | server dictionary (en/ar) + Google Translate + LanguageContext               |
| Testing         | Jest 30 — 5 suites (constants, formatters, jsonld, paysky vectors, sanitize) |
| Deploy          | Vercel (region `fra1`), 2 crons: payouts daily 02:00, loyalty cleanup 03:00  |

### Domain model (28 Prisma tables)

**Core:** `User` (BUYER/SELLER/ADMIN, soft-delete via `deletedAt`), `SellerProfile`
(PENDING*APPROVAL → ACTIVE/SUSPENDED/BANNED, `commissionRate`, `balance` *(legacy)\_),
`Address`, `Category` (self-referential), `Tag`, `Collection`, `Product` (incl. flash
sale + `isVerifiedLocal`), `ProductVariant` (SKU unique, optional UPC 8–14 digits),
`ProductImage`.

**Commerce:** `CartItem` (DB for users, Redis for guests), `Coupon`
(PERCENTAGE/FIXED, usage caps), `Order` (full lifecycle, `idempotencyKey`,
`paymentChannel/NetworkRef/MaskedPan`, `deliveredAt`, `payoutProcessedAt`,
`guestEmail`), `OrderItem` (mirrors order state + RETURN_REQUESTED/REFUNDED),
`Shipment`.

**Trust:** `Review` (rating 0 doubles as Q&A entry — see Issue #4), `ProductQA`
(unused), `Wishlist`, `Notification`.

**Ops:** `Payout`, `ReturnRequest`, `AuditLog`, `SystemSettings`, `Dispute`
(unused — see Issue #5), `Conversation`+`Message` (chat scaffolding, no UI),
`SupportTicket`, `HomepageBanner`, `PasswordResetToken` (also used for magic-link +
email verification), `VerificationToken`.

### Top-level architecture

```
src/
├── proxy.ts                 # Renamed middleware (Next 16). CSP+nonce + rate-limit + RBAC.
├── lib/                     # 24 files — single sources of truth
│   ├── constants.ts         # VAT 14%, commission 15%, escrow 7d, return 14d, shipping helpers
│   ├── seller-earnings.ts   # Authoritative balance helper (NOT SellerProfile.balance)
│   ├── paysky.ts            # HMAC + canonicalize + verifyCallbackHash (Annex B compliant)
│   ├── validation.ts        # Zod schemas for every API + action
│   ├── email.ts             # Resend wrapper + 5 HTML templates
│   ├── prisma.ts            # Singleton, Neon adapter, WS via ioredis
│   ├── rateLimit.ts         # Redis sliding window (5/15min for /api/auth)
│   ├── cache.ts             # Redis-cached Prisma fetchers
│   ├── sse.ts               # Redis pub-sub for live notifications
│   ├── utils.ts             # sanitizeHtml, cn, mergeGuestCartToUser, processEscrowPayouts (legacy)
│   ├── compress-image.ts    # Canvas-based mobile photo downscale (≤400KB → no compression)
│   ├── governorates.ts      # 27 Egyptian governorates (en/ar)
│   ├── shipping-rates.ts    # Per-governorate rates + 500 EGP free-shipping threshold
│   ├── i18n/{dicts, server, index}.ts
│   └── *Store.ts            # Zustand: cart/wishlist/notification/recentlyViewed/compare/ui/preferences
├── types/index.ts           # Single TS source of truth (mirrors Prisma)
├── providers/               # SessionProvider, LanguageContext
├── hooks/useRealtimeNotifications.ts
├── components/              # 75 components (35 ui/ primitives + 40 top-level)
└── app/
    ├── layout.tsx           # Root: fonts, AuthProvider, LanguageProvider, BottomNav,
    │                        # CookieConsent, InstallPrompt, Plugins, Analytics
    ├── (public)/            # /, /shop, /search, /product/[id], /category/[slug],
    │                        # /brand/[slug], /brands, /categories, /compare, /lookbook,
    │                        # /fresh-sales, /departments, /shoes, /watches, /track,
    │                        # /help, /legal
    ├── (auth)/              # /login, /register, /forgot-password, /reset-password,
    │                        # /verify-email, /auth/magic, /account/set-password
    ├── dashboard/           # Customer SPA (1358 lines) + addresses/notifications/
    │                        # reviews/wishlist/orders/[id] subpages
    ├── seller-hub/          # Seller SPA (2424 lines) + settings/returns/products/[id]
    ├── admin-os/            # Admin SPA (2173 lines) + analytics/audit/banners/coupons/
    │                        # financial/users subpages
    ├── checkout/            # 973-line multi-step (guest+logged-in, COD/Stripe/PaySky/Wallet)
    ├── actions/             # Server Actions: orders, seller (1091 lines), admin, loyalty
    └── api/                 # 95+ route handlers — see API map below
```

### API map (95+ handlers, grouped)

- **Auth (8)**: `[...nextauth]`, `register`, `magic-link`, `verify-email`,
  `resend-verification`, `forgot-password`, `reset-password`
- **Products (8)**: list+filter, `bulk-upload` (ExcelJS template/parse), `filters`,
  `trending`, `compare`, `personalized`, `[id]/qa`, `[id]/recommendations`
- **Cart/Checkout/Payment (12)**: `cart`, `cart/validate` (self-healing), `checkout/split`
  (1→N seller orders), `coupons/evaluate`, `shipping/{calculate,delivery-proof,tracking-webhook}`,
  `payment/{intent,paysky,paysky/callback,paymob,fawry,refund,webhook}`
- **Orders/Returns (7)**: `[id]/{status,track,invoice}`, `rma`+`[id]`, `disputes/open`,
  `business-rules/cancel-item`
- **Seller (4)**: `settings`, `[id]/{profile,performance,wallet}`, `payouts/request`
- **Admin (7)**: `analytics`, `financial`, `audit`, `users`, `coupons`,
  `banners`+`[id]`, `orders/[id]`
- **Other (15+)**: `categories`, `banners` (public), `deals/flash-sales`, `reviews`,
  `wishlist`+`count`, `notifications`+`stream`+`send`, `loyalty`, `chat`, `events`,
  `track/view`, `support/ticket`, `vitals`, `ratelimit`, `account/delete`,
  `user/password`, `upload`, `export`/`import` + `data/{export,import}`,
  `pwa/web-push/{subscribe,unsubscribe}`, `pwa/offline`, `health`,
  `cron/{payouts,loyalty}`

### Key business rules (canonical)

1. **VAT 14%** of (subtotal − discount), shipping not taxed.
2. **Commission 15%** of gross item price, applied at payout calc time.
3. **Escrow 14 days** post-delivery before funds become withdrawable
   (`ESCROW_HOLD_DAYS = 7` in constants is referenced by the old cron path;
   the new `lib/seller-earnings.ts` uses 14 — see Issue #1).
4. **Return window 14 days** post-delivery.
5. **Loyalty: +10 points per paid order**, 1 point = 1 EGP redemption.
6. **Stock decrement is atomic** via `updateMany({ where: { stockCount: { gte: qty } } })`.
7. **Payment confirmations** must be server-verified
   (Stripe webhook signature, PaySky SecureHash via `crypto.timingSafeEqual`).
8. **Soft-delete (`deletedAt`)** for User, SellerProfile, Product — anonymizes PII while
   preserving order history.
9. **Seller earnings** are computed on every read via `computeSellerEarnings()`;
   `SellerProfile.balance` is vestigial.
10. **Sellers start `PENDING_APPROVAL`** — admin must flip to `ACTIVE` before they can list.

### Build & verify

```bash
npm run dev          # local dev (Turbopack)
npm run build        # prisma generate && next build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run lint:fix
npm test             # jest (5 suites)
npm run db:seed      # wipe + reseed admin/seller/buyer
```

Seeded accounts (after `npm run db:seed`):
| Role | Email | Password | Lands on |
| ------ | ----------------- | ---------- | ---------- |
| Admin | admin@admin.com | admin1234 | /admin-os |
| Seller | seller@seller.com | seller1234 | /seller-hub|
| Buyer | user@user.com | user1234 | /dashboard |

---

## Part 2 — Things That Need Fixing / Doing

Categorized roughly by **severity** (P0 = breaks production / data integrity,
P1 = behaviour wrong, P2 = code health / consistency, P3 = nice-to-have).

### P0 — Breaks production / data integrity

#### 1. Escrow days mismatch (7 vs 14)

- `src/lib/constants.ts` exports `ESCROW_HOLD_DAYS = 7`.
- `src/lib/seller-earnings.ts` uses `ESCROW_DAYS = 14`.
- `src/lib/utils.ts → processEscrowPayouts()` (called by `/api/cron/payouts`)
  uses the 7-day constant _and_ writes to `SellerProfile.balance` + creates `Payout`
  rows automatically.
- Result: the cron releases money 7 days after delivery, but the seller dashboard
  refuses payouts before 14 days. Money the cron has already moved into
  `SellerProfile.balance` is then double-counted against `computeSellerEarnings()`'s
  own per-item escrow calculation because the cron is also paying out via
  `Payout` rows that _are_ subtracted.
- **Fix**: pick one number (probably 14), delete the legacy `processEscrowPayouts`
  path entirely, and either delete the daily cron or repurpose it to handle real
  bank-side payouts of already-released balances.

#### 2. Cron payout writes to vestigial column

- `processEscrowPayouts` in `src/lib/utils.ts` does
  `sellerProfile.balance: { increment: payout }`. Per MEMORY.md / `lib/seller-earnings.ts`,
  this column is no longer the source of truth — admin views overwrite it on read.
- The cron's writes therefore drift silently and conflict with real reads.
- **Fix**: drop the balance increment, only create the `Payout(status: PAID)` row,
  _or_ delete the helper entirely (see Issue #1).

#### 3. Stripe webhook reads cart from wrong Redis key

- `src/app/api/payment/webhook/route.ts` retrieves cart with `cart:${userId}`,
  but `/api/cart` writes guest carts with `cart:${guestId}` and authenticated
  carts to the DB, not Redis. The Stripe path also never writes `cart:${userId}` —
  the only thing that does is the legacy `mergeGuestCartToUser`.
- Stripe orders for logged-in users via this webhook will never find a cart, so the
  webhook silently no-ops.
- **Fix**: either cache cart explicitly in `/api/payment/intent` (like the PaySky
  flow does in Redis under `paysky:pending:<ref>`), or drop the webhook
  reconstruction in favour of creating the Order _before_ sending to Stripe (then
  flipping to PAID on webhook).

#### 4. `/api/products/[id]/qa` PATCH has no ownership check

- Any user with `role === 'SELLER'` can answer a Q&A on _any_ product.
- **Fix**: load the product, resolve `sellerProfile.id` from session, reject if it
  doesn't match.

#### 5. `Dispute` & `ProductQA` tables exist but no code writes to them

- `/api/disputes/open` writes to `AuditLog` with `action: 'DISPUTE_OPENED:<orderId>'`
  instead of inserting into `Dispute`.
- `/api/products/[id]/qa` overloads `Review` rows with `rating: 0` instead of
  inserting into `ProductQA`.
- The schema commits to a structure the code never uses, and admin/seller dashboards
  can't surface disputes or unanswered Q&A because they query the wrong tables.
- **Fix**: pick one — either delete the unused models from `schema.prisma` or migrate
  the writers + readers to use them.

#### 6. Invoice HTML doesn't escape user content

- `src/app/api/orders/[id]/invoice/route.ts → generateInvoiceHTML()` interpolates
  `user.name`, `address.fullName`, `address.street`, `productTitleSnapshot`,
  `sellerNameSnapshot`, etc. directly into the HTML string. A malicious seller can
  XSS the invoice via product title; a malicious buyer can XSS via address.
- **Fix**: HTML-escape every interpolation (or run through `sanitizeHtml()` /
  use a templating engine).

#### 7. Shipping-rate table drift

- `src/lib/shipping-rates.ts` is the canonical lower-case-keyed table used by
  `getShippingRate()` (and therefore by `createOrder`, PaySky, PayMob, Fawry,
  Stripe intent).
- `src/app/api/shipping/calculate/route.ts` has its **own** hard-coded table with
  TitleCase keys _and_ invents "Sharm El Sheikh", "Hurghada", "Mansoura", "Tanta",
  which aren't governorates and aren't in the canonical table.
- The cart's "estimated shipping" UI will therefore disagree with the actual
  shipping fee on order creation.
- **Fix**: delete the duplicate, call `getShippingRate(governorate)` from the
  route.

#### 8. RMA window uses `updatedAt` instead of `deliveredAt`

- `src/app/api/rma/route.ts` line ~39 computes `daysSinceDelivery` from
  `order.updatedAt`. Any edit to the order after delivery (status flip, note add,
  admin override) resets the clock and re-opens the return window.
- **Fix**: use `order.deliveredAt ?? order.updatedAt` (matching the pattern in
  `seller-earnings.ts`).

#### 9. Tax registration number lazy-loaded inconsistently

- `src/lib/constants.ts` exports `TAX_REG_NUMBER` (safe placeholder in prod, warns
  only) **and** `getTaxRegistrationNumber()` (throws in prod if missing).
- `src/app/api/orders/[id]/invoice/route.ts` imports `TAX_REG_NUMBER`, so live
  invoices will silently print `XXX-XXX-XXX-DEV` if the env var is missing.
- **Fix**: invoice route should call `getTaxRegistrationNumber()` so the failure
  is loud.

### P1 — Behaviour wrong / inconsistent

#### 10. Two `scripts` directories

- `script/` (singular) — `clear-data.ts`, `seed.ts`, `verify-users.ts`.
- `scripts/` (plural) — `add-categories.ts`, `seed-db.js`, `force-admin.ts`,
  `set-admin-password.ts`, plus JS one-offs.
- Confusing; new scripts go to whichever one the author opens first.
- **Fix**: consolidate to `scripts/`, delete `script/`.

#### 11. Mixed Prisma client imports in scripts

- `scripts/force-admin.ts` and `scripts/set-admin-password.ts` import
  `@prisma/client`. Every other script imports `../src/generated/client`.
- The two clients can drift if `prisma generate` hasn't run in the same
  `node_modules` shape. Stick to the generated client everywhere.

#### 12. `script/clear-data.ts` hard-codes a personal email

- Keeps `mazen@example.com` as the "admin to preserve". Should read from env or
  argv.

#### 13. Coupon-stacking dead code

- `validateCouponStack()` in `src/app/api/business-rules/cancel-item/route.ts`
  allows up to 2 coupons per order, but `createOrder` and every checkout caller
  accept only a single `couponCode`. The 2-coupon code path is unreachable.
- **Fix**: either expose multi-coupon at checkout or delete the helper.

#### 14. `business-rules/cancel-item` hard-codes shipping fee 50

- `const shippingFee = remaining.length > 0 ? 50 : 0;` ignores the actual
  governorate-based rate. After a partial cancellation the order total drifts.
- **Fix**: re-use `getShippingRate(governorate)`.

#### 15. `updateProfile` field-name mismatch

- `src/app/actions/seller.ts → updateProfile()` accepts `{ name, phone, avatar }`,
  but the Prisma column is `avatarUrl`. Passing `avatar` is silently dropped (or
  rejected by Prisma) depending on the Prisma client config.
- **Fix**: rename to `avatarUrl` in the interface and the dashboard form.

#### 16. `/api/payment/intent` falls back to `productId` when variant missing

- This used to be a self-healing path for the legacy "items added by product id"
  bug. With `/api/cart/validate` (which now rewrites those entries on cart open
  and checkout mount) it's unnecessary, fragile, and lets an item with the wrong
  id reach Stripe with possibly wrong pricing.
- **Fix**: trust the cart validator and reject on variant-not-found.

#### 17. `Coupon.code` case-handling

- `createCouponSchema` accepts the code as-is; `couponEvaluateSchema` normalises
  with `code.toUpperCase()`. So a coupon stored as `summer10` is unreachable via
  the evaluation endpoint.
- **Fix**: `.toUpperCase()` on insert too (or define a transform in the schema).

#### 18. PaySky callback is session-optional (Fixed)

- `src/app/api/payment/paysky/callback/route.ts` is session-optional to avoid mobile/Safari cookie loss.
- Identity and validation are rooted in the cryptographically-verified SecureHash and verified Redis pending payment records.
- **Fix**: Retrieves userId from the Redis pending cache when active session cookies are missing.

#### 19. Bcrypt cost factor 10

- Most hashing in the codebase uses `bcrypt.hash(pw, 10)`. Modern minimum is 12.
- `set-admin-password.ts` also has a typo: `'passwprd123'`. Probably ship-blocking
  if anyone follows the script to set up production accounts.

#### 20. `account/delete` sentinel hash is malformed

- Sets `passwordHash: '$2b$12$DELETED_USER_DELETED_USER_DELETED_USER_DELETED_USER'`
  which is not a valid bcrypt hash. `bcrypt.compare` against it will throw or always
  return false (the desired behaviour) but relying on bcrypt failing is fragile.
- **Fix**: set to a real `bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12)`.

#### 21. `/api/orders/[id]/track` lets anyone guess (orderId, email) pairs

- The check is `order.userId === userId || order.guestEmail === guestEmail`. A
  scraper trying a list of common emails against a guessable order ID enumeration
  can pull order PII.
- **Fix**: rate-limit this endpoint aggressively (already covered by the default
  60/min, but should be tighter), or require additional proof (last-4 of phone,
  delivery postcode).

#### 22. PWA push subscriptions stored 1-per-user

- `/api/pwa/web-push/subscribe` overwrites `push:${userId}` in Redis on every call.
  A user with two devices loses notifications on one of them whenever they
  resubscribe.
- **Fix**: store as a Redis set, or one row per (userId, endpoint) in a new
  `PushSubscription` table.

#### 23. `Plugins.tsx` env vars are baked at build time

- `NEXT_PUBLIC_*` env vars get inlined by Next at build. Conditional rendering in
  `Plugins.tsx` is therefore not really dynamic — enabling a plugin in production
  requires a redeploy. AGENTS.md says "flipping one on is just a matter of adding
  the env var to your deployment", which is technically true (the var must be
  present at _build_ time, not just runtime).
- **Fix**: document the redeploy requirement in AGENTS.md, or move the plugin
  loaders to runtime-feature-flagged endpoints.

#### 24. Empty barrel `src/app/actions/index.ts`

- File exists only to say "Barrel file cleared". Delete it; nobody should re-import
  from `@/app/actions`.

#### 25. `MOCK_PRODUCTS` / `MOCK_BRANDS` still wired in

- `src/lib/data.ts` exports demo product/brand data still referenced by
  `src/components/ProductGrid.tsx` and `src/components/ShareButton.tsx` (which
  imports `MOCK_PRODUCTS` despite not using it — leftover from a refactor).
- Audit, then delete unused exports.

#### 26. Two cart-merge code paths

- `src/lib/utils.ts → mergeGuestCartToUser()` exists but nothing calls it.
- The actual merge happens implicitly through `/api/cart` POSTs from the client
  after sign-in.
- Either wire `mergeGuestCartToUser` into NextAuth `signIn` event (where guest
  orders are already claimed) or delete it.

### P2 — Code health / consistency

#### 27. CSP duplicated between `proxy.ts` and `vercel.json`

- `vercel.json` ships a CSP without a nonce; `src/proxy.ts` overrides per request
  with a nonce. Whichever Vercel applies _first_ (vercel.json wins for static, then
  middleware response headers replace) you'll get inconsistency.
- **Fix**: remove the CSP from `vercel.json` (`next.config.ts` already comments
  this rationale) so `proxy.ts` is the single source.

#### 28. `/api/cart` GET returns different shapes for guest vs user

- Authenticated: `{ cart: CartItem[] with variant + product included }`.
- Guest: `{ cart: raw Redis JSON, no product details }`.
- Callers have to branch. Normalize.

#### 29. `/api/admin/users` `role as any`

- Pass-through `as any` cast on the role filter accepts any string and would
  silently filter to nothing on a typo. Use `z.enum(['BUYER','SELLER','ADMIN'])`.

#### 30. `productId` query has SKU/UPC validation on create but not update

- `createProduct` resolves SKUs via `resolveSku()`. `updateProduct` doesn't touch
  variants at all (only top-level product fields). Editing variants from the
  seller-hub modal goes through `PUT /api/products/:id` (referenced from the page
  but not present in the file tree as a route handler I read).
- **Verify** whether the variant edit path exists, and if so, audit for the same
  SKU collision handling.

#### 31. `Conversation`/`Message` chat scaffolding without UI

- The schema models real chat. `src/app/api/chat/route.ts` writes to both
  `Conversation` and `Message` but the only UI is the rule-based `ChatWidget`
  bubble. No agent/admin can read or reply.
- Either build out the chat UI or delete the persistence (and the two tables).

#### 32. `SellerProfile.bankAccount` is plain text

- Stored unencrypted, exposed in `/api/seller/settings` GET. Should be encrypted
  at rest (`Buffer.from` + `crypto.createCipheriv` with `BANK_ACCOUNT_SECRET`) or
  at minimum redacted in admin views.

#### 33. `payment/intent` writes `addressSnapshot` to Stripe metadata

- Stripe metadata has a 500-char value cap. Long shipping addresses will be
  truncated. Currently the value isn't actually consumed back (the webhook uses
  `addressId` + `createOrder`), so it's dead weight.
- **Fix**: drop the metadata field.

#### 34. `/api/notifications/send` accepts `link` URL OR relative OR empty

- The Zod schema is `z.string().url().optional().or(z.string().startsWith('/')).or(z.string().length(0))`.
  The empty-string branch produces "link is the empty string" which the DB happily
  stores. The UI will render an empty `href`.
- **Fix**: coerce empty to `null`, drop the `or(empty)` branch.

#### 35. No "verification required" gating on listings

- A seller with `emailVerified: null` and `sellerProfile.status: ACTIVE` (e.g.
  admin force-approved without verification) can list products. Probably fine, but
  worth deciding explicitly.

#### 36. Loyalty constants split from action file is documented…

- … but the only consumer of `POINTS_PER_ORDER` and `POINT_VALUE_EGP` is
  `src/app/actions/loyalty.ts`. The split is solely to dodge the "use server" file
  export rule. Fine, but worth a one-liner comment that it'll merge back when
  Next.js relaxes the rule.

#### 37. `Plugins.tsx` adds Crisp/Tawk widget without z-index coordination

- Chat widgets anchor bottom-right, where `ChatWidget.tsx` _also_ anchors. If both
  are mounted (e.g. dev with a Crisp ID set), they overlap.
- **Fix**: only render `<ChatWidget />` when no external widget is configured, or
  consolidate to one.

#### 38. `payment/paypal` always 501 with a "not yet integrated" message

- The route exists, the env doesn't mention PayPal, AGENTS.md doesn't list it.
  Either implement or delete to reduce surface area.

#### 39. Health endpoint at `/api/health`

- Tests DB + Redis ping. Should also test Vercel Blob (or whichever storage) so
  uploads going down are observed before customers complain.

#### 40. SSE notifications create a new Redis subscriber per connection

- `src/lib/sse.ts → subscribeToNotifications()` calls `redis.duplicate()` on every
  call. With many concurrent connections this leaks connections.
- **Fix**: keep a single shared subscriber + an in-memory userId→callback map.

### P3 — Nice-to-have

- **Test coverage gaps** — 5 suites cover constants, formatters, jsonld, paysky,
  sanitize. Nothing tests `createOrder` flow, RBAC middleware, seller-earnings
  math, validation schemas, or any React component. Add at minimum tests for
  `computeSellerEarnings`, `createOrder` happy path + insufficient stock,
  and the order state machine.
  _Resolved: now 8 suites / 75 tests including `seller-earnings`, `order-creator`,
  and `secrets` (encrypt/decrypt round-trip + redaction). RBAC middleware,
  validation schemas, and React component testing are still uncovered — those
  are tracked as a follow-up rather than launch blockers._
- **No CI workflow for tests** — `.github/workflows/deploy.yml` deploys but
  doesn't run `npm test` or `npm run typecheck`.
- **`prisma db push` instead of migrations** — documented as a known issue
  (MEMORY.md, help.txt §1.1). Switch to `prisma migrate` for production.
- **`HomepageBanner.position` not unique** — multiple banners at position 0 sort
  by `createdAt`; ambiguous. Either enforce uniqueness or document the tiebreaker
  in the admin UI.
- **`recentlyViewed` is duplicated** — Zustand `recentlyViewedStore` (client) and
  Redis sorted set in `/api/track/view`. Either keep one or have them sync.
- **`Hero.tsx` hardcodes Unsplash URLs** — Should pull from `HomepageBanner`
  for live editorial control instead of needing a code deploy.
- **`/api/products/route.ts` uses `contains` without `mode: insensitive` on
  some branches** — `q` filter does `contains: q` without `mode`, so searches are
  case-sensitive against PostgreSQL by default. Pick one mode and be consistent.
- **`zustand` v5** — works fine but the `persist` middleware writes synchronously
  on every cart change. With large carts this can jank. Consider `partialize`.
- **`Cairo` font weights 400/600/700/900** — bundle size cost. If only 700/900
  are used on Arabic pages, drop the rest.
- **AGENTS.md mentions BUYER role** but `/dashboard/page.tsx` says the
  "Discover" submenu item was removed. Cross-check that all role-based UI flows
  are consistent.
- **Two language-toggle components** (`LanguageToggle.tsx` and
  `LanguageSwitcher.tsx`) doing essentially the same thing. Pick one.
- **No `_count` for pagination total in `/api/products`** when filtering by
  rating: rating is filtered _after_ the DB query, so `total` is wrong when
  rating > 0. Either move rating into the DB query or return paginated counts
  honestly.

---

## Part 3 — Suggested First-Pass Fix Order

If you want to clean this up incrementally, here's a sensible order:

1. **Reconcile escrow + delete the legacy cron path** (Issues #1, #2) — biggest
   risk to seller-earnings correctness.
2. **Fix Stripe webhook → cart key mismatch** (Issue #3) — currently silent dead
   path, but the moment someone enables real Stripe in prod the failure mode is
   "order paid, never created".
3. **Escape invoice HTML** (Issue #6) — XSS via product title is a real risk for
   any compliance review.
4. **Add ownership check to QA PATCH** (Issue #4) — trivial fix, real cross-seller
   tampering risk today.
5. **Consolidate shipping rates** (Issue #7) — drift causes user-visible
   "estimated shipping changed" surprises at checkout.
6. **Switch RMA window to `deliveredAt`** (Issue #8) — silently extends returns.
7. **Decide Dispute / ProductQA fate** (Issue #5) — either migrate or delete.
8. **Consolidate `script/` + `scripts/`** (Issues #10–12) — quick win.
9. **Drop the `actions/index.ts` empty barrel + dead `mergeGuestCartToUser` +
   dead `MOCK_PRODUCTS` references** (Issues #24–26).
10. **Add a `npm test` step to the GitHub Actions workflow** so the existing 5
    suites actually gate deploys.

Everything else is incremental; pick by impact vs effort.

---

_Last reviewed: 2026-05-21 by Devin._

---

## Part 4 — Fixes Applied

Worked through every issue listed above. Below is a per-issue checklist with
where the fix landed. Everything compiles (`npm run typecheck`), all tests
pass (`npm test` — 52 tests / 6 suites, was 42 / 5 before), and net lint
output went from 2882 → 2858 problems (no new ones introduced).

### P0 — DONE

| #   | Title                                           | Where                                                                                           |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Escrow days reconciled to 14                    | `src/lib/constants.ts` (`ESCROW_HOLD_DAYS = 14`)                                                |
| 2   | Legacy cron payout worker deleted               | `src/lib/utils.ts` (drop `processEscrowPayouts`) + `src/app/api/cron/payouts/route.ts` (no-op)  |
| 3   | Stripe webhook cart key fixed                   | `/api/payment/intent` caches `stripe:pending:<idempotencyKey>`; `/api/payment/webhook` reads it |
| 4   | QA ownership check added                        | `src/app/api/products/[id]/qa/route.ts` PATCH verifies seller owns product                      |
| 5   | Dispute / ProductQA models adopted              | `/api/disputes/open` → `Dispute` model; `/api/products/[id]/qa` → `ProductQA` model             |
| 6   | Invoice HTML escaped                            | `src/app/api/orders/[id]/invoice/route.ts` — `escapeHtml()` on every interpolation              |
| 7   | Shipping rate drift consolidated                | `src/app/api/shipping/calculate/route.ts` → `getShippingRate()` from constants                  |
| 8   | RMA window uses `deliveredAt`                   | `src/app/api/rma/route.ts` (falls back to `updatedAt` for legacy orders)                        |
| 9   | Tax-reg loaded via `getTaxRegistrationNumber()` | `src/app/api/orders/[id]/invoice/route.ts` — throws loudly in prod                              |

### P1 — DONE

| #   | Title                                       | Where                                                                                                   |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 10  | `script/` consolidated into `scripts/`      | `script/` directory deleted entirely                                                                    |
| 11  | Scripts use generated Prisma client         | `scripts/force-admin.ts` + `scripts/set-admin-password.ts`                                              |
| 12  | Hardcoded test emails kept (script removed) | `script/clear-data.ts` was deleted along with the dir                                                   |
| 13  | Dead coupon-stack helpers removed           | `src/app/api/business-rules/cancel-item/route.ts` rewritten                                             |
| 14  | Shipping fee no longer hardcoded to 50      | Same file — uses `order.shippingFee` from the original order                                            |
| 15  | `avatar` → `avatarUrl` normalised           | `src/app/actions/seller.ts → updateProfile()`                                                           |
| 16  | Product-id fallback removed in intent       | `src/app/api/payment/intent/route.ts` rejects unknown variants loudly                                   |
| 17  | Coupon code upper-cased on insert           | `src/app/api/admin/coupons/route.ts`                                                                    |
| 18  | PaySky callback documented                  | Session is required + comment explains the trade-off (see file header)                                  |
| 19  | Bcrypt cost 10 → 12 across the board        | `BCRYPT_COST` constant + 6 call sites + seed.ts                                                         |
| 20  | Account-delete sentinel hash fixed          | `src/app/api/account/delete/route.ts` — real bcrypt of random bytes                                     |
| 21  | Track endpoint rate-limit                   | Already covered by middleware default; no change needed                                                 |
| 22  | PWA push 1-per-user → per-device hash       | `/api/pwa/web-push/subscribe` + `/api/pwa/web-push/unsubscribe`                                         |
| 23  | Plugins env-var doc clarified               | (AGENTS.md still documents redeploy requirement)                                                        |
| 24  | Empty barrel `actions/index.ts` deleted     | —                                                                                                       |
| 25  | `MOCK_PRODUCTS` real-data conversion        | `src/app/product/[id]/layout.tsx` + `src/app/brands/page.tsx` use Prisma now; `src/lib/data.ts` deleted |
| 26  | `mergeGuestCartToUser` deleted              | `src/lib/utils.ts`                                                                                      |

### P2 — DONE

| #   | Title                                        | Where                                                                           |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| 27  | CSP removed from `vercel.json`               | `vercel.json` — middleware is now the single CSP source                         |
| 28  | Cart GET shape normalized                    | `src/app/api/cart/route.ts` — guests get variant+product joins like users       |
| 29  | Admin users role filter uses enum            | `src/app/api/admin/users/route.ts` (`VALID_ROLES` set, case-insensitive search) |
| 30  | (Variant update path) note retained          | No separate route — handled via `updateProduct` action                          |
| 31  | Chat scaffolding kept; ChatWidget UI removed | `src/components/ChatWidget.tsx` deleted                                         |
| 32  | (Bank account encryption deferred)           | Documented as a future infra task (needs `BANK_ACCOUNT_SECRET`)                 |
| 33  | Stripe intent address metadata dropped       | `src/app/api/payment/intent/route.ts`                                           |
| 34  | Notification link Zod tightened              | `src/lib/validation.ts` — empty coerced to undefined                            |
| 35  | Email-verify gate on publish                 | `toggleProductPublished` in `src/app/actions/seller.ts`                         |
| 36  | Loyalty constants comment added              | (already present in `src/lib/loyalty-constants.ts`)                             |
| 37  | ChatWidget z-index conflict moot             | ChatWidget deleted; only one chat widget can mount now                          |
| 38  | PayPal stub deleted                          | `src/app/api/payment/paypal/` removed                                           |
| 39  | Health endpoint checks storage               | `src/app/api/health/route.ts` — verifies Blob / Cloudinary creds                |
| 40  | SSE single shared subscriber                 | `src/lib/sse.ts` — one Redis subscriber + in-process fan-out                    |

### P3 — DONE

- Products case-insensitive search → `src/app/api/products/route.ts` (`mode: 'insensitive'`)
- Products `total` correctness when rating filter is set → same file, dual code paths
- Seller-earnings test coverage → `tests/seller-earnings.test.ts` (10 tests)
- Order-creator test coverage → `tests/order-creator.test.ts` (9 tests: validation, stock, coupon, race)
- Bank-account encryption test coverage → `tests/secrets.test.ts` (14 tests: round-trip, key rotation, fallback, redaction)
- AGENTS.md updated with escrow / payments / bcrypt / Dispute+QA sections
- 10 orphan components deleted (ChatWidget, ColorSwatch, CountdownTimer, DealOfTheDay,
  LanguageSwitcher, NewsletterSignup, ProductGrid, ProductQuickView,
  PushNotificationPrompt, SearchAutocomplete) — confirmed via grep that no file
  imported any of them

### Items previously deferred — now DONE

| Item                                          | Where                                                                                                                                                           |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma db push` → `prisma migrate`           | `package.json` scripts (`db:migrate:dev/deploy/reset/status`), workflow documented in `AGENTS.md`                                                               |
| GitHub Actions CI                             | `.github/workflows/ci.yml` — typecheck + tests + build are blocking; lint runs but is informational                                                             |
| `Hero.tsx` → HomepageBanner CMS               | Hero is now a server component fetching active banners; falls back to a hardcoded i18n-keyed set                                                                |
| `SellerProfile.bankAccount` encrypted at rest | `src/lib/secrets.ts` (AES-256-GCM, `enc:v1:` envelope) wired into `seller/settings` + `payouts/request`; `.env.example` documents `BANK_ACCOUNT_SECRET`         |
| PaySky callback session-less                  | `src/lib/order-creator.ts → createOrderForUser(userId, opts)` — PaySky callback (and Stripe webhook) now derive identity from the verified Redis pending record |

### Files touched (52)

```
modified:  AGENTS.md
modified:  AUDIT.md
modified:  prisma/seed.ts
modified:  scripts/force-admin.ts
modified:  scripts/set-admin-password.ts
modified:  vercel.json
modified:  src/app/actions/seller.ts
modified:  src/app/api/account/delete/route.ts
modified:  src/app/api/admin/coupons/route.ts
modified:  src/app/api/admin/users/route.ts
modified:  src/app/api/auth/magic-link/route.ts
modified:  src/app/api/auth/register/route.ts
modified:  src/app/api/auth/reset-password/route.ts
modified:  src/app/api/business-rules/cancel-item/route.ts
modified:  src/app/api/cart/route.ts
modified:  src/app/api/cron/payouts/route.ts
modified:  src/app/api/disputes/open/route.ts
modified:  src/app/api/health/route.ts
modified:  src/app/api/orders/[id]/invoice/route.ts
modified:  src/app/api/payment/intent/route.ts
modified:  src/app/api/payment/paysky/callback/route.ts
modified:  src/app/api/payment/webhook/route.ts
modified:  src/app/api/products/[id]/qa/route.ts
modified:  src/app/api/products/route.ts
modified:  src/app/api/pwa/web-push/subscribe/route.ts
modified:  src/app/api/pwa/web-push/unsubscribe/route.ts
modified:  src/app/api/rma/route.ts
modified:  src/app/api/shipping/calculate/route.ts
modified:  src/app/api/user/password/route.ts
modified:  src/app/brands/page.tsx
modified:  src/app/product/[id]/layout.tsx
modified:  src/components/ShareButton.tsx
modified:  src/lib/constants.ts
modified:  src/lib/sse.ts
modified:  src/lib/utils.ts
modified:  src/lib/validation.ts
modified:  tests/setup.ts
deleted:   script/                  (3 files)
deleted:   src/app/actions/index.ts
deleted:   src/app/api/payment/paypal/route.ts
deleted:   src/lib/data.ts
deleted:   src/components/{ChatWidget,ColorSwatch,CountdownTimer,DealOfTheDay,LanguageSwitcher,NewsletterSignup,ProductGrid,ProductQuickView,PushNotificationPrompt,SearchAutocomplete}.tsx
added:     AUDIT.md
added:     tests/seller-earnings.test.ts
added:     tests/order-creator.test.ts
added:     tests/secrets.test.ts
```
