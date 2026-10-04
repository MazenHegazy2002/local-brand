# Handoff: Brandyy native mobile app (iOS + Android)

## Overview

Native shopping app for brandyy.shop (Egyptian marketplace for local brands). One app, four role experiences chosen by the signed-in user's role:

- **Buyer** (default) → Home, Shop, Local, Bag, Account
- **Seller** → Seller Hub (dashboard, orders, products, payouts)
- **Affiliate** → Affiliate dashboard inside the buyer Account
- **Admin** → Admin OS (overview, approvals)

No webview. The app talks to the existing Next.js backend through its REST API with per-user auth.

## About the design files

`Brandyy App.dc.html` is a **design reference built in HTML** — a hi-fi prototype of look and behavior, not production code. Recreate it natively.

**Recommended stack:** React Native + Expo (one codebase → iOS `.ipa` + Android `.apk/.aab` via EAS Build), TypeScript, Expo Router, TanStack Query for data, Zustand for cart/session, `expo-secure-store` for tokens, `expo-image`, `expo-notifications` (push), `I18nManager` for RTL. Rationale: the web codebase is already TypeScript/React, so types, validation and API helpers can be shared.

Open the HTML file in a browser; Tweaks panel switches `platform` (ios/android) and `lang` (en/ar). Screens carry ids (1a…6a) referenced below.

## Fidelity

**High-fidelity.** Colors, type, spacing, radii and copy are final. Recreate pixel-accurately at a 390×844 pt base; scale layout fluidly for other devices.

## Data & API (must follow)

- **Never** ship the master API key, DB credentials or `NEXTAUTH_SECRET` in the app. `/api/v1/db` is server-only.
- Auth: sign in with email/phone + password, Google, Apple → backend issues a session/JWT → store in SecureStore → send `Authorization: Bearer <token>`. Role comes from the session and decides the root navigator.
- Endpoints (existing):
  - Catalog: `GET /api/products`, `GET /api/products/[id]`, `GET /api/categories`
  - Public feed used by the prototype: `GET /api/export/public-products?limit=30` (fields: `title`, `titleAr`, `priceEGP`, `brand`, `category`, `image`, `images[]`, `inStock`)
  - Cart: `GET/POST /api/cart`
  - Checkout: `POST /api/checkout` — methods: PaySky Card/Meeza, Cash on Delivery, Fawry
  - Orders: `GET /api/orders`, `GET /api/orders/[id]`
  - Seller: `GET/POST /api/seller/products`, `GET /api/seller/orders`
  - Affiliate, admin, wishlist, addresses, notifications, loyalty: existing `/api/affiliate/*`, `/api/admin/*`, `/api/addresses`, `/api/account` routes — mirror what the website uses.
- Every list in the prototype is derived from live data (no demo content). Show skeletons while loading, an empty state when a list is empty, and a retry banner on error.
- PaySky card payment: open PaySky's hosted payment page in an in-app browser (`expo-web-browser`) and handle the return deep link `brandyy://checkout/result`. This is the only allowed web surface.

## Business rules

- Currency EGP, formatted `1,299 EGP` / `١٬٢٩٩ ج.م`.
- Free shipping at subtotal ≥ **1,000 EGP**; bag shows a progress bar toward it.
- Shipping cost by governorate (27) from backend; standard vs same-day options.
- 14-day escrow buyer protection shown on product page.
- Loyalty: 10 pts per order, 5 per verified review, 1 pt = 1 EGP at checkout (toggle).
- Affiliate tiers: Starter 5%, Silver 6%, Gold 8%, Platinum 12%. Referral link `brandyy.shop/ref/<CODE>`.
- New seller products go to admin review (≤24 h).

## Screens

All screens: background `#faf8f5` (buyer), `#f4f5f8` (seller), `#0f1424` (admin). Horizontal page padding 20. Bottom tab bar: white, top border `#ece8e1`, 5 items, icon 22, label Inter 600 10.5, active `#1e3b8a`, inactive `#8a8f9c`, bag badge amber `#f59e0b` 16×16.

**1a Home (selected direction)** — full-bleed campaign image top 540 with dark gradient (top 35% → clear → bottom 70%). Transparent header: wordmark "brandyy" Outfit 800 22 white; search + bell buttons 40 round `rgba(255,255,255,.18)` blur. Hero copy bottom-left: kicker Inter 600 11 tracking .2em uppercase; title Instrument Serif 44/1; white pill CTA 13×20 padding. Content sheet `#faf8f5` radius 26 top overlaps hero:

- **Brand stories row**: 64 circles, 2.5 ring (gradient `#f59e0b→#1e3b8a` if unseen, `#d8d4cc` seen), name Inter 600 11. Tap opens full-screen story viewer (brand's latest products, 5 s per slide, tap to advance, swipe down to close).
- **Flash Sale** header Outfit 700 19 + live countdown chip (`#fef3c7` bg, `#b45309` text, tabular nums) + "See all". Horizontal cards 128 wide, image 160 radius 14, badge top-left amber, name Inter 500 12.5 1-line, price Inter 700 13 `#1e3b8a`.
- 1b and 1c are alternative Home directions kept for reference — do not build.

**2a Onboarding** — full-bleed image, gradient to `#0e1633`. Language switch pill top-right. 3-step pager dots (active 22×4 amber). Title Instrument Serif 46. Buttons 54 high radius 16: primary amber, secondary outline `rgba(255,255,255,.3)`.

**2b Sign in / Register** — segmented control (`#efece6`, active white w/ shadow). Inputs 52 high radius 14, border `#e3dfd7`, focus 1.5 `#1e3b8a`. Primary 54 `#1e3b8a`. Google (white) + Apple (black) buttons.

**2c Shop** — serif title 38, search field 48, gender tabs (underline 2 `#1f2333`), category rows 92 high radius 18 tinted bg (`#efe9df, #e8edf9, #f3e7e5, #ecebe6, #fdf3dc`) with image right 110 wide. Categories and counts from API.

**2d Search + filters** — results grid 2-col gap 12, cards 230 radius 16. Filter bottom sheet radius 28: price range slider, size chips (multi, selected `#e8edf9`/`#1e3b8a`), color swatches 32, "Local brands only" switch 50×30, CTA "Show N results".

**2e Product** — gallery 470 top with pager; round 42 back/share/favorite buttons `rgba(255,255,255,.92)`. "Try it on" dark pill. Sheet: brand (verified badge) Inter 600 11 uppercase `#1e3b8a`, title Outfit 700 22, price Outfit 700 20, rating. Color thumbnails 52×60 (selected border 2 `#1e3b8a`), size buttons 44 (out of stock = strikethrough `#b8bcc6`), delivery + escrow card. Sticky footer: points earned + "Add to bag" 54 (turns `#15803d` "Added ✓").

**2f Brand page** — cover 250, logo tile 84 radius 22 overlapping, Follow toggle, tags, tabs Products/Reviews/About, product grid.

**2g Virtual try-on** — dark `#0e1633`. Result image 480 radius 24 with Your photo / Try-on toggle. Garment row, "New photo" + "Add to bag" (amber). Uses existing `/api/ai` try-on route.

**3a Bag** — free-shipping progress card `#fef3c7`, line items (image 86×106 radius 12, qty stepper 34 high), promo/referral field dashed, sticky subtotal + Checkout.

**3b Checkout** — Ship to card, Shipping options (2 cards, selected 1.5 `#1e3b8a`), Payment radio list (PaySky Card/Meeza · COD · Fawry), Use points toggle, summary + CTA ("Place order" for COD, "Pay X EGP" otherwise).

**3c Order tracking** — blue status card with serif ETA + 4-segment progress, vertical timeline, items row, WhatsApp courier + Help buttons.

**3d Wishlist** — 2-col grid, remove heart, "Price dropped" badge `#15803d`, "Move to bag".

**3e Account** — avatar, loyalty card `#152c6e` (points amber Outfit 800 36), quick counts, menu list (Orders, Addresses, Payment methods, Earn with Brandyy, Sell on Brandyy, Language, Help).

**3f Notifications** — list rows with 42 icon tile; unread rows `#f5f7fd`; "Mark all read". Push via Expo Notifications, categories: order status, flash sale, price drop, points, followed brand, Q&A reply.

**4a Seller dashboard** — store switcher (multi-brand sellers), range segmented (Today/7d/30d), sales card `#1e3b8a` with bar chart (last bar amber), 4 KPI tiles, "Needs action" rows.

**4b Seller orders** — status filter chips, order cards with status pill (New `#fef3c7/#92400e`, Accepted `#e8edf9/#1e3b8a`, Ready `#dcfce7/#15803d`), actions Print label / Accept → Mark ready.

**4c Add product** — photo slots (camera/gallery via `expo-image-picker`), EN + AR title, price, category, variants with stock steppers, Save draft / Submit.

**5a Affiliate** — tier card amber gradient, progress to next tier, 4 stat tiles, referral link with Copy + share (WhatsApp/Instagram/TikTok via native share sheet), Request payout.

**6a Admin** — dark theme, live pill, KPI tiles with deltas, approvals queue (brand / product / payout) with Approve (amber) / Reject.

## Interactions

- Countdown ticks every 1 s from the flash sale's `endsAt`.
- Tab bar persists across buyer screens; product/brand/checkout push as stack screens.
- Filter sheet: drag handle, snap to 90% height.
- Buttons: pressed state opacity .85 + scale .98, 120 ms.
- Toggle switches: knob slides 200 ms.
- RTL: when `ar`, `I18nManager.forceRTL(true)`, mirror back arrows, keep numbers/phone/URLs LTR.

## Design tokens

Colors: primary `#1e3b8a`, primary-dark `#152c6e`, navy `#0e1633`, accent `#f59e0b`, accent-light `#fcd34d`, accent-bg `#fef3c7`, accent-text `#b45309`, ink `#1f2333`, muted `#5b6070`, subtle `#6b7080`, placeholder `#8a8f9c`, border `#ece8e1`, input-border `#e3dfd7`, surface `#fff`, bg `#faf8f5`, success `#15803d`, danger `#dc2626`, favorite `#e11d48`.
Type: Outfit (headings/numbers 600–800), Inter (UI 400–700), Instrument Serif (editorial titles), Cairo (Arabic UI), Amiri (Arabic editorial).
Radii: 6 badge · 10–12 small · 14 input · 16 button/card · 18–22 large card · 26–28 sheet · 999 pill.
Spacing: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24.

## Assets

- `img/logo.png` — app icon (from `/public/icon-512.png`).
- `img/tryon-man.jpg`, `img/tryon-result.jpg` — try-on illustration only.
- Product/brand imagery: from the API at runtime.
- Icons: stroke 1.8–2.2 line icons (use `lucide-react-native`).

## Files

- `Brandyy App.dc.html` — full prototype (all screens 1a–6a); open in a browser.
- `screenshots/` — static captures with live data (Android frame, English): 01 Home options, 02 Discovery (2a–2g), 03 Checkout & account (3a–3f), 04 Seller / Affiliate / Admin (4a–6a).
