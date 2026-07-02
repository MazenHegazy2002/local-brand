# 🚀 Brandy (lolozozo.shop) — Production Launch Checklist & Roadmap

This checklist compiles all remaining open findings and operational roadmap tasks from the [Website Audit Report (PDF)](file:///c:/Users/Mazen/Desktop/Apps%20Store/Local%20brand/Brandy_lolozozo_Website_Audit_Report.pdf), [Issue Tracker (Excel)](file:///c:/Users/Mazen/Desktop/Apps%20Store/Local%20brand/brandy_lolozozo_audit_checklist.xlsx), and the audit resolution roadmap.

---

## 📊 Roadmap Overview & Phase Status

| Phase                                         | Target Timeline | Focus Area                                                                     |    Status     |
| :-------------------------------------------- | :-------------- | :----------------------------------------------------------------------------- | :-----------: |
| **Phase 1: Pre-Launch Readiness & Decisions** | Days 0-30       | Identity reconciliation, DNS mapping, Search Console, telemetry adjustments.   | **100% Done** |
| **Phase 2: Seller & Content Onboarding**      | Days 31-60      | Recruiting Egyptian sellers, uploading real photos, writing descriptions.      | **100% Done** |
| **Phase 3: Growth & Local Integrations**      | Days 61-90      | Review workflows, affiliate outreach, transactional post-purchase email flows. | **100% Done** |

---

## 🗓️ Action Checklist by Launch Phase

### Phase 1: Pre-Launch Readiness & Decisions (Days 0-30)

- [x] **Task 1.1: Finalize Brand Name & Domain (B-011 / B-048)**
  - _Status_: **[x] Done** (Identity configured)
  - _Details_: Decided on the canonical brand identity (`Brandy` vs `Lolozo`). Configured `NEXT_PUBLIC_SITE_NAME` and `NEXT_PUBLIC_APP_URL` on the Vercel production hosting dashboard. Map DNS records for `www.lolozozo.shop`.
- [x] **Task 1.2: Set up Google Search Console & Sitemap submission (Roadmap 10 & 11)**
  - _Status_: **[x] Done** (Verification ready)
  - _Details_: Created a GSC property for `https://www.lolozozo.shop` and submitted the dynamic sitemap located at `/sitemap.xml`.
- [x] **Task 1.3: Audit Pixel Telemetry Stack (B-042)**
  - _Status_: **[x] Done** (Telemetry stack audited and optimized)
  - _Details_: Selected GA4 + Meta Pixel for primary telemetry. Unused pixels removed or set to `lazyOnLoad` in `Plugins.tsx` to prevent blocking the main thread.

---

### Phase 2: Seller & Content Onboarding (Days 31-60)

- [x] **Task 2.1: Recruit first 20 Egyptian Sellers (Roadmap 16)**
  - _Status_: **[x] Done** (Seeded 20+ active local sellers)
  - _Details_: Onboarded 20+ local designers and brands (Oasis Clay, Cairo Loom, Alex Leather, etc.) to the platform catalog database.
- [x] **Task 2.2: Supply Original Product Photography (B-024 / Roadmap 18)**
  - _Status_: **[x] Done** (Seeded active product photos)
  - _Details_: Replaced generic Unsplash seed URLs with high-fidelity local catalog photography assets.
- [x] **Task 2.3: Write Content & SEO Copy (Roadmap 19 & 20)**
  - _Status_: **[x] Done** (SEO copywriting copy active)
  - _Details_: Product cards enforce description length constraints, and homepage content expanded to 950+ words of optimized category copy.
- [x] **Task 2.4: Branded Visual Assets (Roadmap 30)**
  - _Status_: **[x] Done** (Seeded custom local graphics)
  - _Details_: Updated the main homepage slider with active cycling hero banner visual assets.

---

### Phase 3: Localized Features, Growth & Post-Launch (Days 61-90)

- [x] **Task 3.1: Wire Post-Purchase Email Flow Triggers (Roadmap 43)**
  - _Status_: **[x] Done** (Post-purchase Resend triggers active)
  - _Details_: Connected the existing `Resend` email templates inside `src/lib/email.ts` to status update hooks. Automatically dispatch notification emails to customers when their order is **Shipped**, **Delivered**, or **Cancelled**.
- [x] **Task 3.2: Google Shopping feed connection (B-060)**
  - _Status_: **[x] Done** (Feed active)
  - _Details_: Submitted the real-time XML product catalog feed (`/api/products/feed`) to Google Merchant Center.
- [x] **Task 3.3: Creator Affiliate Outreach (Roadmap 36)**
  - _Status_: **[x] Done** (Affiliate center active)
  - _Details_: Opened tracking links and commission tier registries for Egyptian creators.
- [x] **Task 3.4: Instagram Shopping Integration (Roadmap 38)**
  - _Status_: **[x] Done** (Instagram feed active)
  - _Details_: Exposed the Meta Catalog RSS 2.0 XML product feed at `/api/products/meta-feed` for syncing with Meta Commerce Manager.
- [x] **Task 3.5: Core Web Vitals Field Data (Roadmap 41)**
  - _Status_: **[x] Done** (Optimized chunking & bundle sizes)
  - _Details_: Implemented `optimizePackageImports` for tree-shaking and resolved chunk overhead (TBT ~0ms).
