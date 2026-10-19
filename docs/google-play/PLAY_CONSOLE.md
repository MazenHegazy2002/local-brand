# Brandyy — Google Play Console answers

App: **Brandyy** · package `shop.brandyy.app` · versionCode 1 / version 1.0.0 (`mobile/app.json`) · backend `https://brandyy.shop` (`mobile/eas.json` → `EXPO_PUBLIC_API_URL`).
Prepared 2026-10-19 from the code on branch `claude/google-play-ready`. Items marked **ACTION** need you to do something before you submit.

---

## 1. Store listing

Rules to keep in mind: no emoji, prices, "best"/"#1" or promo wording in the title or short description.

### English (en-US, default)

**App name** (30/30 chars)

```
Brandyy: Egyptian Local Brands
```

**Short description** (71/80 chars)

```
Shop independent Egyptian fashion & lifestyle brands. Cash on delivery.
```

**Full description** (1,662/4,000 chars)

```
Brandyy is Egypt's marketplace for independent local brands. Discover clothing, streetwear, accessories, beauty and lifestyle pieces made by Egyptian designers, and order from many brands in one place.

SHOP LOCAL, ALL IN ONE APP
• Browse curated categories, brand pages and new arrivals
• Search, filter by category and price, and sort results
• Save favourites to your wishlist and come back later
• See product photos, size and colour options, stock and reviews before you buy

EASY CHECKOUT FOR EGYPT
• Cash on delivery to all 27 governorates
• InstaPay or Vodafone Cash: transfer the amount, then upload your receipt in the app
• Save multiple delivery addresses
• Apply coupon and promo codes, and redeem loyalty points at checkout

TRACK EVERY ORDER
• Follow each order from confirmation to delivery
• Get push notifications when your order status changes
• Contact support about any order directly from the order page

EARN AS YOU SHOP
• Collect loyalty points with your orders and use them on your next purchase
• Join the affiliate programme, share your code and earn commissions on referred sales

FOR SELLERS AND BRANDS
Brand owners can manage their store from the same app: add products and photos, update stock, process orders, print shipping labels and follow their earnings. New sellers are reviewed by our team before their products go live.

YOUR LANGUAGE
Use the app in English, Arabic (full right-to-left layout) or Franko.

SAFE AND PRIVATE
Your account is protected with secure sign-in. You can delete your account at any time from Account settings in the app or on brandyy.shop.

Support: support@brandyy.shop
Website: https://brandyy.shop
```

### Arabic (ar)

**App name** (27/30 chars)

```
براندي: براندات مصرية محلية
```

**Short description** (70/80 chars)

```
تسوّق أزياء ومنتجات البراندات المصرية المستقلة، مع الدفع عند الاستلام.
```

**Full description** (1,433/4,000 chars)

```
براندي هو السوق الإلكتروني المصري للبراندات المحلية المستقلة. اكتشف الملابس والستريت وير والإكسسوارات ومنتجات التجميل ونمط الحياة من تصميم مصممين مصريين، واطلب من براندات متعددة في مكان واحد.

تسوّق محلي من تطبيق واحد
• تصفّح الأقسام وصفحات البراندات وأحدث المنتجات
• ابحث وصفِّ النتائج حسب القسم والسعر ورتّبها كما تريد
• احفظ المنتجات المفضلة في قائمة الرغبات
• اطّلع على صور المنتج والمقاسات والألوان المتاحة والتقييمات قبل الشراء

دفع سهل يناسب مصر
• الدفع عند الاستلام في جميع المحافظات الـ27
• إنستاباي أو فودافون كاش: حوّل المبلغ ثم ارفع صورة الإيصال من التطبيق
• احفظ أكثر من عنوان للتوصيل
• استخدم أكواد الخصم ونقاط الولاء عند إتمام الطلب

تابع كل طلب
• تابع طلبك من التأكيد حتى التوصيل
• تصلك إشعارات فورية عند تغيّر حالة الطلب
• تواصل مع الدعم بخصوص أي طلب من صفحة الطلب مباشرة

اكسب أثناء التسوّق
• اجمع نقاط الولاء مع كل طلب واستخدمها في طلبك التالي
• انضم إلى برنامج التسويق بالعمولة، شارك كودك واحصل على عمولة عن المبيعات

للبائعين وأصحاب البراندات
يمكن لأصحاب البراندات إدارة متاجرهم من التطبيق نفسه: إضافة المنتجات والصور، وتحديث المخزون، وتجهيز الطلبات، وطباعة بوالص الشحن، ومتابعة الأرباح. يراجع فريقنا حسابات البائعين الجدد قبل نشر منتجاتهم.

بلغتك
استخدم التطبيق بالعربية (بواجهة كاملة من اليمين إلى اليسار) أو الإنجليزية أو الفرانكو.

آمن وخاص
حسابك محمي بتسجيل دخول آمن، ويمكنك حذف حسابك في أي وقت من إعدادات الحساب في التطبيق أو عبر موقع brandyy.shop.

الدعم: support@brandyy.shop
الموقع: https://brandyy.shop
```

Counts are Unicode characters (Python `len`), measured on the exact text above.

Notes:

- Card payment is **not** offered in the app (`mobile/app/(buyer)/checkout.tsx` line 24: card/Fawry stay off). The listing therefore only mentions COD, InstaPay and Vodafone Cash. **ACTION:** the first onboarding slide in `mobile/app/(auth)/index.tsx` says "Pay by card or cash on delivery" — change it so the app doesn't claim card payment (reviewers check for misleading claims).
- The website and its privacy page call the brand "Brandy"; the app is "Brandyy". Pick one spelling for the developer name, listing and privacy page.
- Graphics you still need: 512×512 icon, 1024×500 feature graphic, 2–8 phone screenshots (min 320 px side, 16:9 or 9:16). Make Arabic screenshots for the `ar` listing.

---

## 2. Category, tags, contact

| Field               | Value                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| App or game         | App                                                                                                              |
| Category            | **Shopping**                                                                                                     |
| Tags (pick up to 5) | Shopping, Fashion, Marketplace, Clothing, Local / Online shopping (choose the closest offered in the tag picker) |
| Contact email       | **support@brandyy.shop** (`SUPPORT_EMAIL` in `src/lib/constants.ts`; also used in the app's order page)          |
| Phone (optional)    | The site footer shows `+20 10 20960757` (WhatsApp). Only add it if you want it public on Play.                   |
| Website             | https://brandyy.shop                                                                                             |
| Privacy policy URL  | **https://brandyy.shop/legal/privacy-policy** (`/privacy` redirects there; give Play the final URL)              |
| Free / paid         | Free (no in-app purchases of digital goods)                                                                      |

---

## 3. Privacy policy

**Status:** `https://brandyy.shop/privacy` → redirects to `/legal/privacy-policy` → HTTP 200 (checked 2026-10-19). The live text is the short CMS version stored in the database (`LegalPageLoader`, slug `legal-privacy-policy`, editable in /admin-os → Pages), **not** the longer fallback in `src/app/legal/privacy-policy/page.tsx`.

What the live page covers: account info (name, email, phone), order history, delivery addresses, browsing behaviour; use for orders, payments, order updates, personalisation; rights to access/correct/delete; 7-year order retention; anonymisation on deletion.

**Gaps to fix on the website page (ACTION, edit in /admin-os → Pages):**

1. **No mention of the mobile app.** Say the policy covers the Brandyy Android app and website.
2. **Payment receipts and sender details.** InstaPay/Vodafone Cash orders upload a receipt image and the sender phone/InstaPay address (`Order.paymentReceiptUrl`, `paymentSenderDetail`).
3. **Photos.** Profile photo, product photos (sellers), receipt photos picked from the device gallery.
4. **Push notifications.** The app stores an Expo push token per user (Redis `push:token:<userId>`, 60 days) and sends it via Expo / Google Firebase Cloud Messaging.
5. **Third-party processors by name or type:** hosting/database, image hosting (Vercel Blob / Cloudinary), email (Resend), push (Expo, Google FCM), crash logging (Sentry, if `SENTRY_DSN` set), payment providers (Stripe, Paymob, PaySky, Fawry — web), courier partners, and web-only analytics if enabled (Google Analytics/GTM, Meta Pixel, Hotjar, Crisp/Tawk.to chat).
6. **Sharing with sellers and couriers** — name, phone and address go to the seller and courier for delivery. (The long fallback version had this; the live one doesn't.)
7. **Seller and affiliate data:** store details, pickup address/phone/coordinates, tax number, bank/payout details (`SellerProfile`, `Payout`, `AffiliatePayout`).
8. **Account deletion:** how to delete in the app (Account → Delete account) and on the web, what is deleted or anonymised (name, email, phone, avatar, push token), and what is kept (order records for 7 years for tax, unlinked from your identity).
9. **Contact for privacy requests:** use support@brandyy.shop (or a real dpo@brandyy.shop mailbox). The fallback code still has placeholders — `dpo@brandy.eg`, "Registration No. 12345/2024", phone `16171` — never publish those; remove them from `src/app/legal/privacy-policy/page.tsx` too.
10. **Security** (HTTPS/TLS in transit, passwords hashed with bcrypt), **children** (not directed at under-13s / under-18s), **effective date**, and the legal entity name and address.

---

## 4. Account deletion

Done (both requirements met):

- **In the app:** buyers Account → Delete account; sellers and admins More → Delete account;
  affiliates link at the bottom of their screen. All call `POST /api/account/delete`.
- **Web URL for the Play form:** https://brandyy.shop/delete-account (public page, English /
  Arabic / Franko; signed-in users can delete there, others get sign-in + email fallback to
  support@brandyy.shop).
- **Deleted:** profile (email/name/phone/avatar), addresses, cart, wishlist, notifications,
  loyalty history, push tokens, sign-in sessions, seller/affiliate payout and bank details,
  payment receipt images and sender details.
- **Kept, unlinked from the person:** order records for tax law (up to 7 years), reviews shown as
  "Deleted User", disputes and payout records without bank details. In-progress orders keep the
  delivery address until delivered.

Play form answers: "Users can request that data be deleted: Yes"; deletion URL as above.

## 5. Data safety form

General answers:

- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes** — all API calls go to `https://brandyy.shop` (TLS); `NSAllowsArbitraryLoads: false`. (Release builds use HTTPS only.)
- Do you provide a way for users to request that their data be deleted? **Yes** — in-app + the web URL from section 4.
- Account creation: email + password, created in the app (`/api/auth/register`). No Google/Facebook sign-in in the app.

"Shared" in Play's sense excludes service providers acting for you (hosting, email, push, crash logs) and transfers the user starts. Giving the buyer's name, phone and address to an independent seller to fulfil the order counts as a **user-initiated** transfer, so it doesn't need to be declared as shared. To be cautious you may still tick it — that is also accepted.

| Data type (Play category)                 | Collected by the app?                                                                                                                       | Shared?                                    | Purposes                                                                                               | Optional?                                             | Deletable?                                                | Source in code                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| **Name** (Personal info)                  | Yes                                                                                                                                         | No\*                                       | App functionality, Account management                                                                  | Required                                              | Yes (anonymised)                                          | `User.name`, register                                          |
| **Email address**                         | Yes                                                                                                                                         | No                                         | Account management, App functionality, Developer communications (order/verification emails via Resend) | Required                                              | Yes (anonymised)                                          | `User.email`                                                   |
| **Phone number**                          | Yes                                                                                                                                         | No\*                                       | App functionality (delivery), Account management                                                       | Optional at sign-up; needed for delivery              | Yes (nulled)                                              | `User.phone`, checkout, `paymentSenderDetail`                  |
| **Address** (Personal info)               | Yes                                                                                                                                         | No\*                                       | App functionality (delivery)                                                                           | Required to order                                     | **Not yet** — see section 4                               | `Address` model, `/api/addresses`                              |
| **User IDs**                              | Yes (internal account id)                                                                                                                   | No                                         | App functionality, Account management                                                                  | Required                                              | Yes                                                       | `User.id`, Bearer token                                        |
| Other personal info                       | Sellers only: store name, pickup address/phone, tax no. (entered on web; seller settings on app)                                            | No                                         | App functionality                                                                                      | Required for sellers                                  | Partly                                                    | `SellerProfile`                                                |
| **Purchase history** (Financial info)     | Yes                                                                                                                                         | No\*                                       | App functionality, Analytics (seller/admin stats), Fraud prevention                                    | Required                                              | Retained 7 yrs (tax), unlinked                            | `Order`, `OrderItem`                                           |
| **Other financial info**                  | Yes — InstaPay/Vodafone Cash sender number; sellers/affiliates: payout/bank details (web)                                                   | No                                         | App functionality (payment verification, payouts), Fraud prevention                                    | Required for those payment methods                    | Retained with order                                       | `paymentSenderDetail`, `bankAccount`, `bankDetails`            |
| Credit/debit card info                    | **Not in the app.** Web only: cards go straight to Stripe/Paymob/PaySky; the server stores at most a masked PAN (`paymentMaskedPan`)        | —                                          | —                                                                                                      | —                                                     | —                                                         | web checkout                                                   |
| **Photos**                                | Yes — profile photo, receipt photo, seller product photos (chosen by the user)                                                              | No                                         | App functionality                                                                                      | Optional (receipt required only for InstaPay/VF Cash) | Avatar yes; receipts/products retained with order/listing | `expo-image-picker` → `/api/upload` (Vercel Blob / Cloudinary) |
| Videos, audio, voice                      | No (`RECORD_AUDIO` blocked)                                                                                                                 | —                                          | —                                                                                                      | —                                                     | —                                                         |                                                                |
| Files and docs                            | No                                                                                                                                          |                                            |                                                                                                        |                                                       |                                                           |                                                                |
| **App interactions** (App activity)       | Yes — wishlist, cart, orders, notifications read state                                                                                      | No                                         | App functionality, Personalisation                                                                     | Required                                              | Yes / with account                                        | `Wishlist`, `CartItem`                                         |
| In-app search history                     | Not stored by the app (search is sent as a query; check server logs) — answer **No**                                                        |                                            |                                                                                                        |                                                       |                                                           | `/api/products?q=`                                             |
| Other user-generated content              | Sellers: product listings. Buyers can't post reviews in the app (read only)                                                                 | No                                         | App functionality                                                                                      | Optional                                              | Seller products soft-deleted                              |                                                                |
| **Device or other IDs**                   | Yes — Expo push token                                                                                                                       | No (sent to Expo/FCM as service providers) | App functionality (order notifications)                                                                | Optional (notification permission)                    | Yes — deleted on sign-out and account deletion            | `/api/notifications/push-token`                                |
| **Crash logs / Diagnostics**              | App: **No** (no Sentry or crash SDK in `mobile/`). Server: Sentry captures API errors (when `SENTRY_DSN` is set), passwords/tokens redacted | No                                         | Analytics / app stability                                                                              | —                                                     | —                                                         | `sentry.server.config.ts`                                      |
| Location (approx./precise)                | **No** — the app has no location permission. Sellers type a "lat,lng" pickup address on the web                                             | —                                          | —                                                                                                      | —                                                     | —                                                         |                                                                |
| Contacts, calendar, SMS, health, messages | No                                                                                                                                          |                                            |                                                                                                        |                                                       |                                                           |                                                                |
| Web browsing                              | No                                                                                                                                          |                                            |                                                                                                        |                                                       |                                                           |                                                                |

\* Shared with the seller and courier only to fulfil the order the user places (user-initiated, so it doesn't need to be declared). Tick "Shared → App functionality" if you want to be conservative.

**Web-only (not in the Android app — don't declare for the app):** cookies, `TrafficLog` (IP, user agent, city — `/api/tracker`), Google Analytics 4, GTM, Meta Pixel, Hotjar, Crisp/Tawk.to (`src/components/Plugins.tsx`, only when the `NEXT_PUBLIC_*` vars are set), Stripe/Paymob/PaySky/Fawry card flows. The app opens a few web pages (forgot password, seller hub, admin links) in the **system browser** (`expo-web-browser` / `Linking`). Data collected there falls under the website, but if those pages load analytics plugins, staying conservative means also declaring "App interactions → Analytics".

---

## 6. Other App content declarations

### Content rating (IARC questionnaire)

- Category: **"All other app types"** (not game; shopping/marketplace — do not pick "Social" or "Communication").
- Violence, fear, sexuality, nudity, profanity/crude humour, drugs, alcohol, tobacco, gambling, simulated gambling: **No** to all. (Marketplace sells fashion/lifestyle goods; if sellers could list alcohol/tobacco/adult items, the answer changes — confirm your seller rules forbid them.)
- Users can interact or exchange content with each other (chat, messaging, sharing)? **No** in the app (no chat; reviews are read-only in the app; sellers publish listings that admins moderate). If you later add Q&A or reviews in the app, change this to **Yes**.
- Shares the user's current physical location with other users? **No**
- Allows purchase of digital goods? **No** (physical goods only)
- Unrestricted internet / web browser? **No** (only opens own web pages).
- Expected result: **Everyone / PEGI 3 / 3+**.

### Target audience and content

- Target age groups: **18 and over** (you may also add 16–17, but then the Families policy questions get stricter; 18+ is simplest because purchases and payments are involved).
- Appeals to children? **No**. No child-directed content.

### Ads

- **No, my app does not contain ads.** No ad SDK in `mobile/package.json` (no AdMob or similar). The homepage banners and flash sales promote the marketplace's own products — that is not advertising for Play.

### App access (reviewer instructions)

All features need sign-in (the root layout sends signed-out users to the auth screens). Choose **"All or some functionality is restricted"** and give credentials.
**ACTION:** on https://brandyy.shop/register (or in the app's Create account tab), create a **dedicated reviewer buyer account**, e.g. `play-review@brandyy.shop`, with a strong password used nowhere else. Verify its email and add one saved address. Don't use the seeded `user@user.com` / `admin@admin.com` accounts (if they exist in production, change those passwords). Paste into Play Console:

```
Username: <reviewer email you created>
Password: <password you set>
Steps: 1) Open the app, tap through onboarding, choose Sign in.
2) Enter the credentials above. You land on the Home tab.
3) Browse Shop / Local, open a product, add to Bag, check out with
   "Cash on delivery" (no payment needed; orders from this account are
   test orders and will be cancelled).
4) Account tab -> Delete account shows the deletion flow (please don't
   confirm, or the reviewer account will be gone).
No 2FA or OTP. Account works from any country.
```

(Optional: give a second reviewer account with the SELLER role if you want the seller tools reviewed; it's not required.)

### Financial features declaration

Select **"My app doesn't provide any financial features"**. Reason: Brandyy sells physical goods. Payments are COD, or bank/wallet transfers the buyer makes **outside** the app (InstaPay, Vodafone Cash) with a receipt uploaded for manual check. Web card payments go through licensed gateways (Stripe, Paymob, PaySky, Fawry). Brandyy doesn't hold user funds as a wallet, lend, invest, or offer crypto. Seller and affiliate payouts are the marketplace paying its own merchants/partners, not a consumer financial product. Loyalty points are a store discount (1 pt = 1 EGP at checkout), not money.
Google Play Billing isn't required: physical goods and services are exempt from the Payments policy.

### Government apps

**No** — not developed by or for a government.

### Other declarations

- News app: **No**. Health apps: **No** (none of the health features). COVID-19: **No**.
- Data safety "Independent security review": skip.
- Advertising ID: **No** — the app doesn't use the Advertising ID (no ads/analytics SDK). If the merged manifest includes `com.google.android.gms.permission.AD_ID` from a dependency, block it or answer Yes. Check with the `aapt` command in section 7.

---

## 7. Android permissions

`mobile/android/` is gitignored (EAS regenerates it via prebuild), so `mobile/app.json` is the source of truth.

**State of `app.json`:** the **committed** version (HEAD) declares `["CAMERA", "READ_MEDIA_IMAGES", "NOTIFICATIONS"]` and blocks only `RECORD_AUDIO`, which is a policy problem (see below). The **working tree has uncommitted changes** (made outside this doc) that fix it: `permissions: ["android.permission.POST_NOTIFICATIONS"]`, and `blockedPermissions` covers CAMERA, RECORD_AUDIO, READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_IMAGES/VIDEO/AUDIO, SYSTEM_ALERT_WINDOW, USE_BIOMETRIC, USE_FINGERPRINT. **ACTION:** commit that change before building the AAB.

Final permission set with the working-tree `app.json`, and what to tell Play:

| Permission                                                   | Comes from                    | Justification                                                                                                                                                           |
| ------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INTERNET`                                                   | RN core                       | Connects to the Brandyy API (brandyy.shop). Normal permission, no declaration.                                                                                          |
| `ACCESS_NETWORK_STATE`                                       | expo-image                    | Loads and caches product images based on connectivity. Normal.                                                                                                          |
| `POST_NOTIFICATIONS` (Android 13+)                           | app.json + expo-notifications | Order-status, payment-confirmation and new-order (seller) notifications. Asked at runtime after sign-in (`app/_layout.tsx`). The user can decline; the app still works. |
| `RECEIVE_BOOT_COMPLETED`, `VIBRATE`, `WAKE_LOCK` (if merged) | expo-notifications / FCM      | Deliver notifications after reboot and vibrate on arrival. Normal.                                                                                                      |

Blocked or removed, and why:

- `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`: Play's **Photo and Video Permissions policy** only allows these for apps whose core purpose needs broad gallery access, and requires a declaration form. Brandyy only picks single images (profile photo, payment receipt, product photo) with `ImagePicker.launchImageLibraryAsync`, which uses the system **Photo Picker** and needs no permission. Shipping the committed HEAD version would require that declaration and would likely be rejected.
- `CAMERA`: unused — no `launchCameraAsync` anywhere in `mobile/`. (The iOS `NSCameraUsageDescription` and the image-picker plugin's `cameraPermission` string are now unnecessary too.)
- `NOTIFICATIONS` (old HEAD entry): not a real Android permission. Replaced by `POST_NOTIFICATIONS`.
- `SYSTEM_ALERT_WINDOW`: dev-overlay permission from the RN template, not needed in release.
- `READ/WRITE_EXTERNAL_STORAGE`: blocked. **Test the image picker on an Android 10–12 device** (internal testing) to confirm it still opens with these blocked; on Android 13+ the Photo Picker is used.
- `RECORD_AUDIO`, `USE_BIOMETRIC`, `USE_FINGERPRINT`: unused (secure-store `faceIDPermission: false`).

No permission in the final set needs a Play declaration form. Check the built bundle in Play Console → App bundle explorer → Permissions, or run `aapt dump permissions` on a universal APK, and make sure no `READ_MEDIA_*`, `CAMERA` or `com.google.android.gms.permission.AD_ID` slipped in.

**Push on Android also needs FCM:** `app.json` has no `android.googleServicesFile` and no `extra.eas.projectId`. Without FCM V1 credentials uploaded to EAS (`eas credentials`) and a linked EAS project, `getExpoPushTokenAsync` fails silently (caught in `_layout.tsx`) and Android users get no push. Not a Play blocker, but the listing promises notifications. Fix: `eas init`, add a Firebase project, put `google-services.json` in `mobile/` and reference it, then upload the FCM V1 service-account key in EAS.

---

## 8. Release checklist (in order)

1. **Fix blockers first:** commit the permission changes in `app.json` (section 7), onboarding "card" text, deletion gaps and public `/delete-account` page (section 4), privacy policy content (section 3), FCM setup if you want push at launch.
2. **Play Console → Create app:** name "Brandyy: Egyptian Local Brands", default language English (US), App, Free; accept declarations. Use the Play developer account that will own the app long-term (an organisation account needs a D-U-N-S number; a personal account triggers step 9).
3. **Build the AAB:** `cd mobile && eas build -p android --profile production` (gives an `.aab`; `autoIncrement` bumps versionCode; `appVersionSource: remote`). `eas.json` submit points to `./google-play-key.json` with track `production` — set it to `internal` for first uploads, and keep that key file out of git. (The working tree also has an uncommitted `plugins/with-android-release-signing.js` plus `buildType: app-bundle` in `eas.json` for local release signing. Whichever path you use, the keystore you sign with becomes the **upload key**. Back it up.)
4. **Play App Signing:** on the first upload to Internal testing, accept Google-managed signing (EAS keeps the upload key). Note the app-signing SHA-1/SHA-256 for Firebase and any Android App Links.
5. **Internal testing:** Testing → Internal testing → create release → upload AAB → add your email list → roll out. Install from the opt-in link and smoke-test: sign up, browse, COD order, InstaPay receipt upload, push notification, Arabic RTL, Delete account.
6. **App content** (Policy → App content): privacy policy URL; App access (reviewer account); Ads = No; Content rating questionnaire; Target audience 18+; Data safety (section 5 + deletion URL); Financial features = none; Government app = No; News/Health = No; Advertising ID.
7. **Store listing:** paste texts from section 1, add the Arabic (ar) translation, upload icon, feature graphic and screenshots; category Shopping; contact email support@brandyy.shop; website.
8. **Countries:** Production → Countries/regions → Egypt (plus any others you deliver to).
9. **Closed testing (new personal developer accounts created after Nov 2023):** Testing → Closed testing → upload the same or newer AAB → at least **12 testers opted in continuously for 14 days**. Then Dashboard → "Apply for production access" and answer the questionnaire about testing. (Organisation accounts skip this.)
10. **Production:** create a release (staged rollout e.g. 20%), submit for review. Typical review is 1–7 days; reply quickly to policy emails.
11. **After launch:** watch Android vitals and ANRs, Sentry for API errors, reviews; keep `versionCode` increasing; repeat Data safety updates whenever you add an SDK (e.g. mobile Sentry or analytics).
