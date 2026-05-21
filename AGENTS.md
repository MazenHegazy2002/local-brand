<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project cheat-sheet

## Commands

- `npm run dev` — local dev server.
- `npm run build` — prod build (runs `prisma generate` first).
- `npm run typecheck` — pure `tsc --noEmit`; use this to sanity-check refactors.
- `npm run lint` / `npm run lint:fix` — ESLint; lint-staged runs on commit.
- `npm test` — Jest (currently 6 suites, 52 tests).
- `npm run db:seed` — wipes the DB and re-seeds categories + 3 starter accounts (all counters reset to zero).

## Database migrations

Migration files live in `prisma/migrations/`. They are the canonical source of
truth for schema changes — do **not** use `prisma db push` for anything you
intend to ship.

| Command                     | When to use                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run db:migrate:dev`    | Local dev. After editing `schema.prisma`, run this with a `--name <slug>` flag to author a new migration and apply it. |
| `npm run db:migrate:status` | Check whether the local DB matches the migration history.                                                              |
| `npm run db:migrate:deploy` | Production / CI / Docker. Applies all pending migrations.                                                              |
| `npm run db:migrate:reset`  | **Destructive** — drops + re-applies. Local-only.                                                                      |
| `npm run db:push`           | Quick prototype-only schema sync. Skips the migration history; never use this against production.                      |
| `npm run db:seed`           | Wipe + reseed the 3 starter accounts and categories.                                                                   |

Workflow when changing `schema.prisma`:

1. Edit `schema.prisma`.
2. `npm run db:migrate:dev -- --name describes_what_you_changed` — Prisma
   generates a SQL file under `prisma/migrations/<timestamp>_<name>/` and
   applies it locally.
3. Commit both the schema and the new migration folder.
4. CI runs `npm run db:migrate:deploy` against the production DB on
   release (the docker `deploy.yml` workflow already does this on the
   server it SSHes into).

## Starter accounts (after `db:seed`)

| Role   | Email             | Password   | Lands on    |
| ------ | ----------------- | ---------- | ----------- |
| Admin  | admin@admin.com   | admin1234  | /admin-os   |
| Seller | seller@seller.com | seller1234 | /seller-hub |
| Buyer  | user@user.com     | user1234   | /dashboard  |

## Customer pages (for quick navigation debugging)

- `/dashboard` — buyer overview (tabs via `?tab=overview|orders|wishlist|notifications|wallet|settings`)
- `/dashboard/orders/[id]` — single order details
- `/dashboard/wishlist`, `/dashboard/addresses`, `/dashboard/reviews`, `/dashboard/notifications`
- The navbar avatar drops a menu (click, not hover — works on touch) with direct links.

# Optional plugins

`src/components/Plugins.tsx` is mounted once in the root layout. Each plugin
only renders if its `NEXT_PUBLIC_*` env var is set, so flipping one on is just
a matter of adding the env var to your deployment (`.env`, Vercel, Docker,
etc.) and redeploying.

The CSP allowlist in `src/proxy.ts` already covers all the plugin hosts
below; no CSP tweaks are needed when you enable a new one.

| Plugin                | Env var(s)                                                    | Purpose                              |
| --------------------- | ------------------------------------------------------------- | ------------------------------------ |
| Google Analytics 4    | `NEXT_PUBLIC_GA_ID` (`G-XXXXXXXXXX`)                          | Page-view + conversion analytics     |
| Google Tag Manager    | `NEXT_PUBLIC_GTM_ID` (`GTM-XXXXXXX`)                          | Umbrella tag manager for any tracker |
| Crisp live chat       | `NEXT_PUBLIC_CRISP_WEBSITE_ID`                                | Chat widget for customer support     |
| Tawk.to live chat     | `NEXT_PUBLIC_TAWK_PROPERTY_ID` + `NEXT_PUBLIC_TAWK_WIDGET_ID` | Alternative chat widget              |
| Hotjar                | `NEXT_PUBLIC_HOTJAR_ID`                                       | Session replay + heatmaps            |
| Meta (Facebook) Pixel | `NEXT_PUBLIC_META_PIXEL_ID`                                   | Facebook/Instagram ad tracking       |

Already wired in (just add the env vars on your host):

- **Stripe** — `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **PaySky** — `PAYSKY_MERCHANT_ID`, `PAYSKY_TERMINAL_ID`, `PAYSKY_MERCHANT_SECRET`
- **Paymob** — `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_HMAC_SECRET`
- **Fawry** — `FAWRY_MERCHANT_CODE`, `FAWRY_SECURITY_KEY`
- **Resend** (transactional email) — `RESEND_API_KEY`
- **Vercel Blob** (image hosting) — `BLOB_READ_WRITE_TOKEN`
- **Cloudinary** (fallback image hosting) — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Web Push** — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **Redis** (guest carts / rate limiting) — `REDIS_URL` or `UPSTASH_REDIS_REST_URL` + token

# Bulk product import (sellers)

- Download template: `GET /api/products/bulk-upload` → returns a styled
  `.xlsx` with a `Products` sheet + an `Instructions` sheet.
- Upload filled file: `POST /api/products/bulk-upload` (multipart/form-data,
  key `file`).
- Expected columns (order matters):
  `Title *, Description, Price (EGP) *, Stock, Category, Sizes (csv), Colors (csv), Image URL`.
- **Business rule:** products created without an image URL are saved as
  drafts (`published: false`) and cannot go live until an image is
  attached. The `toggleProductPublished` server action enforces three
  preconditions when a seller flips a product live:
  1. At least one product image attached.
  2. The seller's email is verified (`User.emailVerified IS NOT NULL`).
  3. The `SellerProfile.status` is `ACTIVE` (admin has approved the
     account — `PENDING_APPROVAL` / `SUSPENDED` / `BANNED` sellers can own
     drafts but cannot publish).

# Money & escrow

- **Single source of truth for seller balances** is
  `computeSellerEarnings(sellerId)` in `src/lib/seller-earnings.ts`.
  The legacy `SellerProfile.balance` column is vestigial — admin / seller
  views overwrite it from the helper on read.
- **Escrow window is 14 days** post-delivery
  (`ESCROW_DAYS` in seller-earnings + `ESCROW_HOLD_DAYS` in constants —
  keep them in lockstep).
- The daily `/api/cron/payouts` route is a no-op since earnings are
  derived on read; it stays on the schedule for monitoring. Re-implement
  the worker there when real bank disbursements are wired up.

# Payment flows (cached pending → webhook finalize)

Both Stripe and PaySky cache the pending order in Redis before the user
is redirected to the payment surface, then the webhook / callback reads
the cached cart back, calls `createOrder`, and flips the resulting order
to `PAID + CONFIRMED`. Keys + TTLs:

| Gateway | Pending key                          | TTL | Cached by             | Finalized by                                         |
| ------- | ------------------------------------ | --- | --------------------- | ---------------------------------------------------- |
| Stripe  | `stripe:pending:<idempotencyKey>`    | 1 h | `/api/payment/intent` | `/api/payment/webhook` (signature verified)          |
| PaySky  | `paysky:pending:<MerchantReference>` | 1 h | `/api/payment/paysky` | `/api/payment/paysky/callback` (SecureHash verified) |

Idempotency is enforced via `Order.idempotencyKey` (unique). Both webhook
paths refuse to finalize twice for the same key.

# Password hashing

`BCRYPT_COST = 12` is the canonical cost factor in `src/lib/constants.ts`.
Every `bcrypt.hash` call (register, magic-link, reset-password,
set-password, admin user create, account delete sentinel, seed) uses it.
Existing 10-cost hashes still verify — bcrypt embeds the cost in the
hash string.

# Disputes & Q&A — real tables (not Review/AuditLog overloads)

- Disputes go into the `Dispute` model. `/api/disputes/open` writes there
  and also drops an `AuditLog` entry so admin scanners get both signals.
- Product Q&A goes into the `ProductQA` model. `/api/products/[id]/qa`
  PATCH verifies the seller owns the product before allowing answers.

# Image handling

- Upload endpoint `POST /api/upload` (requires `SELLER` or `ADMIN` role).
- Priority order: **Vercel Blob → Cloudinary → dev base64 data URL**.
- Without any hosting env vars the endpoint returns the uploaded file as a
  `data:image/…` URL so local dev always shows the real image. Configure
  a proper host in production — base64 bloats the DB.
- The client previews via `URL.createObjectURL` before the network request
  returns, so sellers see their image instantly.
- Remove buttons on the avatar, store logo, and product variant previews
  let the seller/customer undo an upload without touching the file input.
