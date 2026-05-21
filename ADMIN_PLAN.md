# Brandy Admin OS — full control panel inventory

The goal of this document is to enumerate **every** controllable setting,
every module, and every toggle the admin needs to operate Brandy at
Shopify / WordPress / Amazon-Seller-Central level — with the live status
of each item (existing / partial / missing) and the implementation
breadcrumbs so we know exactly what to wire up.

The headline change vs. the current Admin OS:

> The current admin has 10 tabs (Overview / Sellers / Users / Products /
> Orders / Payouts / Analytics / Taxonomy / Affiliate / Settings) and the
> Settings tab is a flat list of free-text key-value rows. We are
> upgrading to **22 tabs** + a **typed Settings catalog** with ~140
> controllable values across **15 categories**, plus dedicated CRUD
> screens for every content surface in the marketplace.

---

## Tab matrix (current vs. target)

| Tab                 | Status   | Notes                                                        |
| ------------------- | -------- | ------------------------------------------------------------ |
| **Overview**        | existing | KPI dashboard — keep                                         |
| **Sellers**         | existing | Approve / suspend / verify — keep, add KYC docs              |
| **Users**           | existing | CRUD — keep, add roles & permissions                         |
| **Products**        | existing | Listing — keep, add bulk import status panel                 |
| **Orders**          | existing | Listing — keep, add bulk status update                       |
| **Payouts**         | existing | Approve / reject — keep, add bank details snapshot view      |
| **Analytics**       | existing | Revenue / metrics — keep, add date range picker + export     |
| **Taxonomy**        | existing | Categories / tags / collections — keep                       |
| **Affiliate**       | existing | Tier configs + payouts — keep                                |
| **Settings**        | redesign | Was: flat key/value. Becomes: 15-category typed catalog      |
| **Plugins**         | NEW      | Toggle UI for 12+ third-party integrations                   |
| **Site / Theme**    | NEW      | Logo, favicon, brand colors, store name, contact, social     |
| **Pages**           | NEW      | CMS for About / FAQ / Terms / Privacy / Returns / Contact    |
| **Reviews**         | NEW      | Moderate product reviews + Q&A                               |
| **Marketing**       | NEW      | Flash sales, campaigns, abandoned cart, push, email blasts   |
| **Email Templates** | NEW      | Editable transactional & marketing templates                 |
| **Tax & Currency**  | NEW      | VAT rate, currencies, formatting                             |
| **Shipping**        | NEW      | Per-governorate rates, free-shipping threshold, courier list |
| **Returns / RMA**   | NEW      | Admin queue for return requests                              |
| **Disputes**        | NEW      | Admin queue for buyer/seller disputes                        |
| **Support Tickets** | NEW      | Customer support inbox                                       |
| **Maintenance**     | NEW      | Kill switch + cache invalidate + backups                     |

---

## Settings catalog — 15 categories, ~140 controls

Every row below is a typed entry in the new Settings catalog
(`src/lib/admin-settings-registry.ts`). Each setting has a **type** (toggle,
text, number, select, url, secret, json), a **category**, a **default**, and
free-text help. The same registry drives both the form rendering and the
validation on the API side.

### 1. Store / Brand

| Key                 | Type   | Default                        | Notes                                |
| ------------------- | ------ | ------------------------------ | ------------------------------------ |
| STORE_NAME          | text   | "Brandy"                       | Shown in header, emails, page titles |
| STORE_TAGLINE       | text   | "Egyptian fashion marketplace" |                                      |
| STORE_LOGO_URL      | url    | —                              | Used in nav + emails + footer        |
| STORE_LOGO_DARK_URL | url    | —                              | Logo for dark backgrounds            |
| FAVICON_URL         | url    | "/favicon.ico"                 |                                      |
| OG_IMAGE_URL        | url    | —                              | Open-Graph default for social shares |
| STORE_DESCRIPTION   | text   | —                              | Default meta description             |
| STORE_KEYWORDS      | text   | —                              | Comma-sep meta keywords              |
| BRAND_PRIMARY_COLOR | text   | "#534AB7"                      | HSL or hex                           |
| BRAND_ACCENT_COLOR  | text   | "#7F77DD"                      |                                      |
| BRAND_FONT_FAMILY   | select | "Cairo"                        | Cairo / Inter / Geist / system       |
| BRAND_RADIUS        | number | 8                              | Border-radius in px                  |

### 2. Contact / Legal

| Key                     | Type | Default              | Notes                         |
| ----------------------- | ---- | -------------------- | ----------------------------- |
| CONTACT_EMAIL           | text | "support@brandy.com" | Footer + reply-to             |
| CONTACT_PHONE           | text | "+201234567890"      | Egyptian intl format          |
| CONTACT_WHATSAPP        | text | —                    | If set, shows WhatsApp button |
| BUSINESS_ADDRESS        | text | —                    | Footer + invoice              |
| TAX_REGISTRATION_NUMBER | text | —                    | Required on Egyptian invoices |
| COMMERCIAL_REGISTER_NO  | text | —                    | "السجل التجاري"               |
| LEGAL_ENTITY_NAME       | text | —                    | Used on invoice/legal pages   |

### 3. Social

| Key              | Type | Default | Notes |
| ---------------- | ---- | ------- | ----- |
| SOCIAL_FACEBOOK  | url  | —       |       |
| SOCIAL_INSTAGRAM | url  | —       |       |
| SOCIAL_TIKTOK    | url  | —       |       |
| SOCIAL_TWITTER   | url  | —       |       |
| SOCIAL_YOUTUBE   | url  | —       |       |
| SOCIAL_LINKEDIN  | url  | —       |       |

### 4. Tax

| Key           | Type   | Default                        | Notes                              |
| ------------- | ------ | ------------------------------ | ---------------------------------- |
| VAT_ENABLED   | toggle | true                           | Master VAT switch                  |
| VAT_RATE      | number | 0.14                           | 14% default for Egypt              |
| VAT_LABEL     | text   | "VAT" / "ضريبة القيمة المضافة" | Invoice label                      |
| VAT_INCLUSIVE | toggle | false                          | Whether prices already include VAT |

### 5. Shipping

| Key                     | Type   | Default                             | Notes                                       |
| ----------------------- | ------ | ----------------------------------- | ------------------------------------------- |
| FREE_SHIPPING_ENABLED   | toggle | true                                |                                             |
| FREE_SHIPPING_THRESHOLD | number | 1000                                | EGP                                         |
| DEFAULT_SHIPPING_RATE   | number | 60                                  | Fallback when governorate not in zone table |
| SHIPPING_RATES_JSON     | json   | (see lib/shipping-rates.ts)         | Per-governorate map                         |
| ALLOWED_COUNTRIES       | text   | "Egypt"                             | Comma-sep                                   |
| COURIERS_JSON           | json   | `["Aramex","Bosta","Mylerz","DHL"]` | Dropdown source                             |

### 6. Payment methods

| Key                | Type   | Default | Notes                 |
| ------------------ | ------ | ------- | --------------------- |
| PAY_COD_ENABLED    | toggle | true    | Cash on delivery      |
| PAY_COD_FEE        | number | 0       | EGP added to total    |
| PAY_STRIPE_ENABLED | toggle | false   | Requires keys         |
| PAY_PAYSKY_ENABLED | toggle | false   | Requires merchant ref |
| PAY_PAYMOB_ENABLED | toggle | false   |                       |
| PAY_FAWRY_ENABLED  | toggle | false   |                       |
| PAY_WALLET_ENABLED | toggle | false   | Mobile wallet         |
| MIN_ORDER_AMOUNT   | number | 50      |                       |
| MAX_ORDER_AMOUNT   | number | 100000  |                       |

### 7. Plugins / Integrations

| Key                  | Type   | Default | Notes                 |
| -------------------- | ------ | ------- | --------------------- |
| GA_ID                | text   | —       | Google Analytics 4 ID |
| GTM_ID               | text   | —       | Google Tag Manager    |
| META_PIXEL_ID        | text   | —       | Facebook Pixel        |
| HOTJAR_ID            | text   | —       |                       |
| CRISP_WEBSITE_ID     | text   | —       |                       |
| TAWK_PROPERTY_ID     | text   | —       |                       |
| TAWK_WIDGET_ID       | text   | —       |                       |
| TIKTOK_PIXEL_ID      | text   | —       |                       |
| SNAPCHAT_PIXEL_ID    | text   | —       |                       |
| LINKEDIN_INSIGHT_TAG | text   | —       |                       |
| SENTRY_DSN           | secret | —       | Error tracking        |
| MIXPANEL_TOKEN       | secret | —       | Product analytics     |
| MAILCHIMP_API_KEY    | secret | —       | Mailing list          |

### 8. Email / Notifications

| Key                | Type   | Default              | Notes                      |
| ------------------ | ------ | -------------------- | -------------------------- |
| EMAIL_ENABLED      | toggle | true                 | Master kill-switch         |
| EMAIL_FROM         | text   | "noreply@brandy.com" |                            |
| EMAIL_FROM_NAME    | text   | "Brandy"             |                            |
| EMAIL_REPLY_TO     | text   | "support@brandy.com" |                            |
| EMAIL_PROVIDER     | select | "resend"             | resend / sendgrid / smtp   |
| RESEND_API_KEY     | secret | —                    |                            |
| SMTP_HOST          | text   | —                    |                            |
| SMTP_PORT          | number | 587                  |                            |
| SMTP_USER          | text   | —                    |                            |
| SMTP_PASS          | secret | —                    |                            |
| PUSH_ENABLED       | toggle | true                 | Web Push                   |
| SMS_ENABLED        | toggle | false                |                            |
| SMS_PROVIDER       | select | "twilio"             | twilio / vonage / unifonic |
| TWILIO_ACCOUNT_SID | text   | —                    |                            |
| TWILIO_AUTH_TOKEN  | secret | —                    |                            |
| TWILIO_FROM_NUMBER | text   | —                    |                            |

### 9. Reviews / Comments / Q&A

| Key                      | Type   | Default | Notes                                |
| ------------------------ | ------ | ------- | ------------------------------------ |
| REVIEWS_ENABLED          | toggle | true    | Master toggle                        |
| REVIEWS_AUTO_PUBLISH     | toggle | true    | If false → moderation queue          |
| REVIEWS_REQUIRE_PURCHASE | toggle | true    | Only customers who bought can review |
| REVIEWS_MIN_LENGTH       | number | 0       | Comment min chars                    |
| REVIEWS_MAX_LENGTH       | number | 2000    |                                      |
| REVIEWS_BLOCKED_WORDS    | json   | `[]`    | Auto-flag list                       |
| QA_ENABLED               | toggle | true    | Product Q&A                          |
| QA_AUTO_PUBLISH          | toggle | false   | Sellers approve answers              |
| QA_GUEST_QUESTIONS       | toggle | false   | Allow non-buyers to ask              |

### 10. Loyalty / Rewards

| Key                     | Type   | Default | Notes                             |
| ----------------------- | ------ | ------- | --------------------------------- |
| LOYALTY_ENABLED         | toggle | true    |                                   |
| LOYALTY_POINTS_PER_EGP  | number | 1       | Earn rate                         |
| LOYALTY_REDEMPTION_RATE | number | 0.01    | 100 points = 1 EGP                |
| LOYALTY_MIN_REDEEM      | number | 100     |                                   |
| LOYALTY_SIGNUP_BONUS    | number | 50      | Points awarded at signup          |
| LOYALTY_REFERRAL_BONUS  | number | 100     | When referee makes first purchase |
| LOYALTY_REVIEW_BONUS    | number | 10      | Per published review              |
| LOYALTY_BIRTHDAY_BONUS  | number | 200     |                                   |

### 11. Cart / Checkout

| Key                        | Type   | Default | Notes                                |
| -------------------------- | ------ | ------- | ------------------------------------ |
| CART_GUEST_CHECKOUT        | toggle | true    |                                      |
| CART_REQUIRE_PHONE         | toggle | true    | Egyptian shipments need phone        |
| CART_AUTO_SAVE             | toggle | true    | Persist guest carts in Redis         |
| ABANDONED_CART_EMAIL       | toggle | true    | Re-engagement email                  |
| ABANDONED_CART_DELAY_HOURS | number | 24      | When to send                         |
| MAX_CART_ITEMS             | number | 50      | Per cart                             |
| MAX_QTY_PER_ITEM           | number | 99      |                                      |
| CART_RESERVATION_MINUTES   | number | 0       | 0=no reserve, X=hold stock for X min |

### 12. Orders / Returns

| Key                       | Type   | Default | Notes                                  |
| ------------------------- | ------ | ------- | -------------------------------------- |
| ORDER_AUTO_CONFIRM        | toggle | false   | Auto-confirm new orders                |
| ORDER_CANCEL_WINDOW_HOURS | number | 24      | Buyer cancel window                    |
| RETURN_WINDOW_DAYS        | number | 14      | Days after delivery                    |
| RETURN_RESTOCK_FEE        | number | 0       | % deducted from refund                 |
| RETURN_REQUIRES_PHOTO     | toggle | true    | RMA must include photo                 |
| ESCROW_DAYS               | number | 14      | Hold seller funds N days post-delivery |
| DEFAULT_COMMISSION_RATE   | number | 0.15    | Platform fee                           |

### 13. Security / Privacy

| Key                   | Type   | Default    | Notes                  |
| --------------------- | ------ | ---------- | ---------------------- |
| TWO_FACTOR_ENABLED    | toggle | false      | TOTP for admin/sellers |
| FORCE_HTTPS           | toggle | true       |                        |
| RATE_LIMIT_WINDOW_MIN | number | 1          |                        |
| RATE_LIMIT_MAX_REQ    | number | 60         |                        |
| LOGIN_ATTEMPT_LIMIT   | number | 5          | Lock after N failures  |
| LOGIN_LOCKOUT_MIN     | number | 15         |                        |
| PASSWORD_MIN_LENGTH   | number | 8          |                        |
| SESSION_TIMEOUT_MIN   | number | 1440       | 24h                    |
| ALLOW_GUEST_ORDERS    | toggle | true       | Order without account  |
| GDPR_BANNER           | toggle | true       | Cookie consent         |
| GDPR_PRIVACY_URL      | text   | "/privacy" |                        |

### 14. SEO / Indexing

| Key                     | Type   | Default                         | Notes                |
| ----------------------- | ------ | ------------------------------- | -------------------- |
| SEO_INDEXING            | toggle | true                            | Robots index/noindex |
| SEO_DEFAULT_TITLE       | text   | "Brandy — Egyptian Marketplace" |                      |
| SEO_DEFAULT_DESCRIPTION | text   | —                               |                      |
| SEO_DEFAULT_OG_IMAGE    | url    | —                               |                      |
| SITEMAP_ENABLED         | toggle | true                            |                      |
| ROBOTS_TXT              | text   | —                               | Custom robots.txt    |
| CANONICAL_DOMAIN        | url    | "https://brandy.com"            |                      |

### 15. Maintenance

| Key                     | Type   | Default                  | Notes                     |
| ----------------------- | ------ | ------------------------ | ------------------------- |
| MAINTENANCE_MODE        | toggle | false                    | Site-wide kill switch     |
| MAINTENANCE_MESSAGE     | text   | "We'll be back shortly." |                           |
| MAINTENANCE_ALLOW_ADMIN | toggle | true                     | Admins still get in       |
| READ_ONLY_MODE          | toggle | false                    | Browse but no buy         |
| FEATURE_FLAGS_JSON      | json   | `{}`                     | Per-feature kill switches |

---

## Module-by-module status

### Reviews & Q&A

- **Existing models**: `Review`, `ProductQA` ✓
- **Existing API**: review create / list, Q&A create / patch ✓
- **Missing**: admin moderation UI, blocked-words filter, review-photo
  upload, batch approve/reject, review reply by seller, Q&A pinning,
  spam/abuse reporting

### Pages CMS

- **Existing models**: none (only HomepageBanner)
- **Missing**: `Page` model (slug, title, body markdown, status, meta,
  i18n), public `/p/[slug]` route, admin CRUD, page revisions

### Marketing

- **Existing models**: `Coupon` ✓, `Product.flashSale*` columns ✓
- **Missing**: `MarketingCampaign` model (push/email/SMS blast with
  segment + schedule + analytics), `AbandonedCart` model, central flash
  sales console (currently per-product), bundle/upsell rules, gift cards

### Plugins / Integrations

- **Existing**: env-var driven (GA, GTM, Crisp, Tawk, Hotjar, Meta
  Pixel, Stripe, PaySky, Paymob, Fawry, Resend, Vercel Blob, Cloudinary,
  Web Push, Redis)
- **Missing**: `Plugin` model with status & config JSON, admin toggle UI,
  test-connection button, masked secret display, audit log on change

### Email Templates

- **Existing**: hard-coded in `src/lib/email.ts`
- **Missing**: `EmailTemplate` model (key, subject_en, subject_ar,
  body_en, body_ar, variables[]), admin editor with preview, test send

### Site / Theme

- **Existing**: hard-coded `STORE_NAME` in i18n, brand colors in
  `globals.css`, no logo upload
- **Missing**: all settings under §1 above wired into a live theme
  layer + a `<ThemeProvider>` that reads from the registry

### Tax / Shipping / Currency

- **Existing**: hard-coded in `src/lib/constants.ts` &
  `src/lib/shipping-rates.ts`
- **Missing**: `ShippingZone` model (governorate → rate, weight band),
  `TaxRate` model (per-category override), multi-currency support
  (`Currency` model with FX rate), price formatter that reads currency

### Returns / RMA, Disputes, Support

- **Existing**: `ReturnRequest`, `Dispute`, `SupportTicket` models ✓,
  buyer-facing endpoints
- **Missing**: admin queues for each (list/filter/respond), SLA badges,
  ticket assignment, canned-response library, escalation rules

### Maintenance / Cache / Backups

- **Existing**: nothing
- **Missing**: maintenance mode page + middleware gate, Redis-cache
  invalidate buttons (per-key + pattern), DB backup trigger via Neon
  Platform API, scheduled Postgres dumps to Vercel Blob, system status
  panel (DB/Redis/email/Stripe ping)

### Roles / Permissions

- **Existing**: 3 enum values (`ADMIN`, `SELLER`, `BUYER`)
- **Missing**: granular permission matrix (e.g. CONTENT_EDITOR who can
  manage Pages but not Products), team invitations with role
  assignment, `Permission`/`Role` join tables, admin-defined custom
  roles

### Audit Log

- **Existing**: `AuditLog` model + admin tab ✓
- **Missing**: filter UI, replay-action UI for state changes, before/
  after diff display, export to CSV, immutable retention (7-year
  Egyptian VAT requirement)

### Reports & Exports

- **Existing**: per-tab listings only
- **Missing**: scheduled CSV/Excel exports (orders, payouts,
  inventory), tax-period reports (monthly VAT statement), seller
  performance scorecards, P&L & cash flow snapshots

---

## Implementation phases

> Phase 1 is required for everything else to land. Phases 2–4 can be
> parallelized.

**Phase 1 — Foundation (this PR)**

1. New Prisma models: `Page`, `EmailTemplate`, `MarketingCampaign`,
   `Plugin`, `ShippingZone`, `TaxRate`, `Currency`, `Permission`,
   `Role`, `RolePermission`, `UserRole` (granular RBAC).
2. `src/lib/admin-settings-registry.ts` — typed catalog of all ~140
   settings with category, default, validator.
3. `getSetting<T>(key)` / `setSetting<T>(key, value)` helpers backed by
   `SystemSettings` + Redis cache + audit log entry on every write.
4. `/api/admin/settings/[key]` GET + PATCH (admin-only, audited).
5. New Settings tab UI: 15-category tree + searchable + typed inputs.

**Phase 2 — Content (this PR)**

- Plugins tab + Site/Theme tab + Pages CMS + Reviews moderation
- Use the registry pattern for everything

**Phase 3 — Operations (this PR)**

- Marketing tab, Email Templates tab
- Disputes / RMA / Support admin queues

**Phase 4 — Hardening (next PR)**

- Maintenance mode, cache invalidate, backups, exports
- Granular RBAC roles UI
- 2FA admin login

---

## Why a registry-driven approach?

Every Shopify-clone admin we've seen falls into the same trap: settings
live as ad-hoc DB rows, the form is a hand-rolled mess of components,
and adding a new toggle requires touching 5 files. The registry gives us:

1. **Single source of truth** — one TS file lists every setting, its
   type, default, and category. The UI auto-renders from it.
2. **Type safety** — `getSetting('VAT_RATE')` returns `number`,
   `getSetting('STORE_NAME')` returns `string`. Compile-time errors if
   you typo a key.
3. **i18n-ready** — labels and help text live next to the key with
   English+Arabic siblings.
4. **Audit-ready** — every PATCH writes to AuditLog with before/after
   diff for free.
5. **Cacheable** — registry hits Redis with a 5-min TTL; setSetting
   bumps the cache version so we don't fight stale reads.
6. **Self-documenting** — any new dev runs `npm run docs:settings` and
   gets a Markdown table of every controllable value.
