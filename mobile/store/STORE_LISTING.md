# Brandyy — store submission kit

Copy/paste source for Google Play Console and App Store Connect.

## Identity

| Field              | Value                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| App name           | Brandyy                                                                            |
| Bundle / package   | `shop.brandyy.app` (iOS + Android)                                                 |
| Category           | Shopping                                                                           |
| Privacy policy URL | https://brandyy.shop/privacy                                                       |
| Terms URL          | https://brandyy.shop/terms                                                         |
| Support URL        | https://brandyy.shop/contact                                                       |
| Marketing URL      | https://brandyy.shop                                                               |
| Account deletion   | In app: Account → Delete account. Web: https://brandyy.shop/dashboard?tab=settings |

## Texts

**Subtitle (iOS, ≤30):** Shop Egypt's local brands

**Short description (Play, ≤80):** Discover and shop Egypt's best local fashion brands, delivered to your door.

**Promotional text (iOS, ≤170):** New drops from local Egyptian brands every week. Pay by card or cash on delivery and track every order live.

**Keywords (iOS, ≤100):** local brands,egypt,fashion,clothes,streetwear,shopping,hoodies,sneakers,cairo,brandyy

**Full description:**

```
Brandyy is the home of Egypt's local brands.

Discover hundreds of independent Egyptian labels in one app — streetwear, basics, modest wear, accessories and more — and shop them with one bag and one checkout.

• Browse by category or brand and see what just dropped
• Save favourites to your wishlist
• Pay by card or cash on delivery
• Track every order from confirmed to delivered
• Get a notification the moment your order ships or arrives
• Easy returns within 14 days of delivery
• Earn points and affiliate commission by sharing products

Every purchase supports a local creator. Welcome to Brandyy.
```

## Reviewer notes / demo account

Create a dedicated review account on production (do NOT reuse admin or real users), e.g. `review@brandyy.shop`, and put its password only into the store consoles:

- App Store Connect → App Review Information → Sign-in required.
- Play Console → App content → App access → "All or some functionality is restricted".

Notes: "Sign in with the provided account. Payments can be tested using Cash on Delivery; no real charge occurs. Account deletion is at Account → Delete account."

## Privacy — Google Play Data safety

| Data                          | Collected                            | Shared                        | Purpose                               | Optional |
| ----------------------------- | ------------------------------------ | ----------------------------- | ------------------------------------- | -------- |
| Name, email, phone            | Yes                                  | No                            | Account management, app functionality | No       |
| Physical address              | Yes                                  | Yes (delivery courier/seller) | Order delivery                        | No       |
| Purchase history              | Yes                                  | No                            | App functionality                     | No       |
| Photos (user uploads)         | Yes                                  | No                            | App functionality (profile, reviews)  | Yes      |
| Device/other IDs (push token) | Yes                                  | No                            | Notifications                         | Yes      |
| Payment info                  | No — handled by the payment provider |                               |                                       |          |

- Data is encrypted in transit: **Yes** (HTTPS).
- Users can request deletion: **Yes** (in-app + web).

## Privacy — App Store "nutrition label"

Data linked to the user, **not** used for tracking:
Contact info (name, email, phone, address), Purchases, User content (photos), Identifiers (user ID, push token).
Tracking: **No** (only if you enable the Meta Pixel / ads SDK in the app later would this change).

## Content rating

IARC (Play) / Age rating (iOS): no violence, sexual content, gambling, drugs, or user-to-user chat → **Everyone / 4+**. Answer "Yes" to "app lets users purchase physical goods".

## Graphics checklist

| Asset             | Size                    | Where     | Status               |
| ----------------- | ----------------------- | --------- | -------------------- |
| App icon          | 1024×1024 PNG, no alpha | both      | ✅ `assets/icon.png` |
| Play hi-res icon  | 512×512 PNG             | Play      | export from icon.png |
| Feature graphic   | 1024×500 PNG/JPG        | Play      | TODO                 |
| Phone screenshots | 2–8, 1080×1920+         | Play      | TODO                 |
| iPhone 6.9"/6.7"  | 1290×2796 (3–10)        | App Store | TODO                 |
| iPhone 6.5"       | 1242×2688               | App Store | TODO (or reuse 6.7") |

Suggested screens: Home, Shop categories, Product page, Bag/checkout, Order tracking, Notifications.

## Release steps

```bash
npm i -g eas-cli
eas login
eas init                              # fills extra.eas.projectId in app.json
eas build -p android --profile production
eas build -p ios --profile production
eas submit -p android --profile production   # needs google-play-key.json (service account)
eas submit -p ios --profile production       # fill appleId / ascAppId in eas.json first
```

Versions auto-increment on every production build (`appVersionSource: remote`).
