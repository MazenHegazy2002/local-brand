# 🚀 Brandy (lolozozo.shop) — Production Launch Checklist & Roadmap

This checklist compiles all remaining open findings and operational roadmap tasks from the [Website Audit Report (PDF)](file:///c:/Users/Mazen/Desktop/Apps%20Store/Local%20brand/Brandy_lolozozo_Website_Audit_Report.pdf), [Issue Tracker (Excel)](file:///c:/Users/Mazen/Desktop/Apps%20Store/Local%20brand/brandy_lolozozo_audit_checklist.xlsx), and the audit resolution roadmap.

---

## 📊 Roadmap Overview & Phase Status

| Phase                                         | Target Timeline | Focus Area                                                                     |    Status    |
| :-------------------------------------------- | :-------------- | :----------------------------------------------------------------------------- | :----------: |
| **Phase 1: Pre-Launch Readiness & Decisions** | Days 0-30       | Identity reconciliation, DNS mapping, Search Console, telemetry adjustments.   | **80% Done** |
| **Phase 2: Seller & Content Onboarding**      | Days 31-60      | Recruiting Egyptian sellers, uploading real photos, writing descriptions.      | **20% Done** |
| **Phase 3: Growth & Local Integrations**      | Days 61-90      | Review workflows, affiliate outreach, transactional post-purchase email flows. | **40% Done** |

---

## 🗓️ Action Checklist by Launch Phase

### Phase 1: Pre-Launch Readiness & Decisions (Days 0-30)

- [ ] **Task 1.1: Finalize Brand Name & Domain (B-011 / B-048)**
  - _Status_: Open (Founder/Owner action)
  - _Details_: Decide on the canonical brand identity (`Brandy` vs `Lolozo`). Configure `NEXT_PUBLIC_SITE_NAME` and `NEXT_PUBLIC_APP_URL` on the Vercel production hosting dashboard. Map DNS records for `www.lolozozo.shop`.
- [ ] **Task 1.2: Set up Google Search Console & Sitemap submission (Roadmap 10 & 11)**
  - _Status_: Open (Founder action)
  - _Details_: Create a GSC property for `https://www.lolozozo.shop` and submit the dynamic sitemap located at `/sitemap.xml`.
- [ ] **Task 1.3: Audit Pixel Telemetry Stack (B-042)**
  - _Status_: Open (Founder action)
  - _Details_: Select which of the 7 lazy-loaded marketing pixels to preserve. Remove unused pixel IDs from Vercel's env variables.

---

### Phase 2: Seller & Content Onboarding (Days 31-60)

- [ ] **Task 2.1: Recruit first 20 Egyptian Sellers (Roadmap 16)**
  - _Status_: Open (Business Development action)
  - _Details_: Recruit and onboard independent local brands and designers.
- [ ] **Task 2.2: Supply Original Product Photography (B-024 / Roadmap 18)**
  - _Status_: Open (Sellers + Ops action)
  - _Details_: Replace the generic Unsplash database seed images with real, original product photos.
- [ ] **Task 2.3: Write Content & SEO Copy (Roadmap 19 & 20)**
  - _Status_: Open (Copywriters action)
  - _Details_: Add 100-300 word detailed descriptions for every active product variant, and supply 150-250 word introductions for category grids.
- [ ] **Task 2.4: Branded Visual Assets (Roadmap 30)**
  - _Status_: Open (Designers action)
  - _Details_: Update the homepage hero section with custom graphics showing local Egyptian models.

---

### Phase 3: Localized Features, Growth & Post-Launch (Days 61-90)

- [x] **Task 3.1: Wire Post-Purchase Email Flow Triggers (Roadmap 43)**
  - _Status_: **[x] Done** (Developer action)
  - _Details_: Connected the existing `Resend` email templates inside `src/lib/email.ts` to status update hooks. Automatically dispatch notification emails to customers when their order is **Shipped**, **Delivered**, or **Cancelled**.
- [ ] **Task 3.2: Google Shopping feed connection (B-060)**
  - _Status_: Open (Founder action)
  - _Details_: Submit the XML feed URL (`/api/products/feed`) to Google Merchant Center.
- [ ] **Task 3.3: Creator Affiliate Outreach (Roadmap 36)**
  - _Status_: Open (Marketing action)
  - _Details_: Activate the affiliate program dashboard and onboard initial Egyptian content creators.
- [x] **Task 3.4: Instagram Shopping Integration (Roadmap 38)**
  - _Status_: **[x] Done** (Developer action)
  - _Details_: Exposed the Meta Catalog RSS 2.0 XML product feed at `/api/products/meta-feed` for syncing with Meta Commerce Manager.
- [ ] **Task 3.5: Core Web Vitals Field Data (Roadmap 41)**
  - _Status_: Open (Developer action)
  - _Details_: Monitor Vercel's Analytics and Speed Insights reports under production load.
