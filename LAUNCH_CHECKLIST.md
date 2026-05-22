# Brandy — Production Launch Checklist

Complete every item below before going live. Items marked **[CODE]** are
already wired in the codebase; you just need to supply the value.
Items marked **[INFRA]** require external service sign-up or DNS changes.

Run the automated preflight checker once all env vars are set:

```
curl -H "Cookie: next-auth.session-token=<admin-token>" \
     https://your-domain.com/api/admin/preflight | jq
```

---

## 1. Domain & SSL

### [INFRA] Pick ONE canonical domain

You currently have two domains: `brandy-egypt.com` and `lolozozo.shop`.

1. Decide which is the canonical domain (recommended: `lolozozo.shop` to match the `.shop` TLD branding)
2. Set `CANONICAL_DOMAIN=lolozozo.shop` in your hosting env vars
3. Point the non-canonical domain's DNS to the same server (or set up a redirect at the registrar)
4. Confirm the redirect works: `curl -I https://brandy-egypt.com/` should return `301 → lolozozo.shop`
5. Update `NEXT_PUBLIC_APP_URL=https://lolozozo.shop` in env

### [INFRA] HTTPS / SSL auto-renewal

- **Vercel**: SSL is automatic — no action needed.
- **Self-hosted (VPS/Docker)**: install Certbot and enable the systemd timer:
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d lolozozo.shop -d www.lolozozo.shop
  # Verify auto-renew
  sudo certbot renew --dry-run
  sudo systemctl enable certbot.timer
  ```
- Confirm SSL: `curl -vI https://lolozozo.shop 2>&1 | grep -E "subject|expire"`

---

## 2. Authentication

### [CODE] Set NEXTAUTH_URL

```bash
NEXTAUTH_URL=https://lolozozo.shop   # your canonical domain
```

### [CODE] Rotate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# Copy output → NEXTAUTH_SECRET env var in your hosting platform
```

### [INFRA] Google OAuth — update Authorized Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs" add:
   `https://lolozozo.shop/api/auth/callback/google`
4. Save

---

## 3. Database

### [INFRA] Use production Neon branch

1. Create a "production" branch in Neon Console (separate from dev/staging)
2. Use the production branch's **pooled** connection string:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require&pool_timeout=10&connect_timeout=15
   ```
3. Run migrations on first deploy:
   ```bash
   npm run db:migrate:deploy
   ```
4. Verify: `npm run db:migrate:status` should show all migrations as applied

### [INFRA] Enable Neon point-in-time recovery

1. Neon Console → your project → Settings → Retention
2. Set history retention to at least 7 days (paid plan) or keep the default free-tier 1 day

### [CODE] Verify .env is in .gitignore

```bash
git check-ignore -v .env
# Should output: .gitignore:.env
```

If not, add `.env` and `.env.local` to `.gitignore`.

---

## 4. Payments

### [INFRA] Stripe — production keys & webhook

1. Switch from test keys to live keys:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```
2. In [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks → Add endpoint:
   - URL: `https://lolozozo.shop/api/payment/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
3. Copy the Signing Secret:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
4. Test: `stripe listen --forward-to localhost:3000/api/payment/webhook`

### [INFRA] PaySky — switch to production environment

1. Contact PaySky and request production credentials
2. Set `PAYSKY_ENV=production` and update MID/TID/Secret

### [INFRA] Paymob — production integration

1. Obtain production API key from [Paymob dashboard](https://accept.paymob.com)
2. Update `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_HMAC_SECRET`

### [INFRA] Fawry — production merchant

1. Contact Fawry and update `FAWRY_MERCHANT_CODE` and `FAWRY_SECURITY_KEY`
2. Set `FAWRY_BASE_URL=https://www.atfawry.com` (not the sandbox URL)

### [INFRA] Egyptian Gateway Sandboxes (test before live)

- Vodafone Cash sandbox: Contact Vodafone Business Egypt for test credentials
- Orange Money sandbox: Contact Orange Egypt
- Instapay: Available via Paymob integration — enable in Paymob dashboard

---

## 5. Email (Resend)

### [CODE] Connect Resend for transactional email

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your sending domain (`brandy.eg` or `lolozozo.shop`)
3. Generate an API key:
   ```
   RESEND_API_KEY=re_xxx
   ```
4. Test: send a test order confirmation email via the admin panel

---

## 6. SEO & Google Search Console

### [INFRA] Get Google Search Console verification code

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property → URL prefix → `https://lolozozo.shop`
3. Verify ownership via "HTML tag" method
4. Copy the content value from `<meta name="google-site-verification" content="XXX">`
5. Set: `GOOGLE_SITE_VERIFICATION=XXX`
6. Redeploy

### [INFRA] Submit sitemap

1. Wait until GSC verifies your domain
2. GSC → Sitemaps → enter `https://lolozozo.shop/sitemap.xml` → Submit
3. Check indexing status within 48 hours

### [CODE] Set Twitter/X handle

```
NEXT_PUBLIC_TWITTER_HANDLE=@yourbrand
```

---

## 7. Uptime Monitoring

### [INFRA] Set up UptimeRobot (free tier works)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://lolozozo.shop/api/health`
   - Friendly name: Brandy Production
   - Check interval: 5 minutes
3. Add alert contact → Webhook:
   - URL: `https://lolozozo.shop/api/webhooks/alerting?secret=YOUR_SECRET`
   - POST body: `{"monitorID":"*monitorID*","monitorURL":"*monitorURL*","alertType":"*alertType*","alertTypeFriendlyName":"*alertTypeFriendlyName*","alertDetails":"*alertDetails*","monitorFriendlyName":"*monitorFriendlyName*"}`
4. Set environment variables:
   ```
   UPTIME_WEBHOOK_SECRET=your-secret-here
   UPTIME_ALERT_EMAIL=ops@brandy.eg
   ```

### [INFRA] BetterUptime (alternative, has on-call scheduling)

1. Sign up at [betteruptime.com](https://betteruptime.com)
2. Add monitor → URL: `https://lolozozo.shop/api/health`
3. Integrations → Webhook → URL: `https://lolozozo.shop/api/webhooks/alerting?secret=YOUR_SECRET`

---

## 8. Backup & DR

### [INFRA] Enable automated daily backups

1. Set `BLOB_READ_WRITE_TOKEN` (Vercel Blob token) so `/api/cron/backup` can write dumps
2. Verify the cron fires: check Vercel Dashboard → Logs → filter `/api/cron/backup`
3. Set retention: `BACKUP_RETENTION_DAYS=30`

### [INFRA] Test database recovery (recommended monthly)

```bash
# 1. Create a Neon branch from yesterday
# 2. Set RESTORE_DATABASE_URL to that branch
npm run db:migrate:status  # should show all applied
# 3. Spot-check a few orders:
psql "$RESTORE_DATABASE_URL" -c "SELECT count(*) FROM \"Order\";"
```

### [INFRA] Image storage backup

- **Cloudinary**: Enable Media Backup in your Cloudinary plan (Settings → Security)
- **Vercel Blob**: Blobs are replicated within Vercel's infrastructure; no additional config needed

---

## 9. Staging Environment

### [INFRA] Set up staging.lolozozo.shop

1. Deploy the same codebase to a separate Vercel project (or Docker container)
2. Use a different Neon branch for the staging DB:
   ```
   DATABASE_URL=<staging-neon-branch-url>
   NEXTAUTH_URL=https://staging.lolozozo.shop
   NEXT_PUBLIC_APP_URL=https://staging.lolozozo.shop
   ```
3. Use Stripe test keys in staging:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```
4. Configure the same GitHub Actions workflow with a `staging` environment

---

## 10. E2E Checkout Test

Run this on **production** after all keys are live (use a real card with a small amount):

- [ ] Register a new buyer account
- [ ] Add a product to cart
- [ ] Apply a promo code (use one from Admin → Affiliates)
- [ ] Proceed to checkout — choose card payment (Stripe)
- [ ] Confirm order appears in buyer Dashboard → Orders
- [ ] Confirm order appears in Admin → Orders with status PAID
- [ ] Confirm seller receives a notification in Seller Hub
- [ ] Confirm stock count decremented on the product

COD flow test:

- [ ] Repeat the checkout with "Cash on Delivery"
- [ ] Confirm order status is CONFIRMED (not PAID)

---

## 11. Credential Security Final Check

- [ ] No `.env` or `.env.local` committed to git: `git log --all -p -- .env | head -5`
- [ ] `NEXTAUTH_SECRET` is a new random value (not the dev placeholder)
- [ ] All Stripe keys are live (not test) in production
- [ ] `DATABASE_URL` points to the production Neon branch (not dev)
- [ ] Run preflight: `curl ... /api/admin/preflight` — all required items PASS

---

## 12. Final Go-Live Checklist

- [ ] All items above completed
- [ ] `npm run typecheck` passes
- [ ] `npm test` — all 210 tests pass
- [ ] Production build succeeds: `npm run build`
- [ ] `NEXTAUTH_URL` updated to production domain
- [ ] GSC verification complete
- [ ] Sitemap submitted
- [ ] Stripe webhook registered and tested with `stripe listen`
- [ ] Uptime monitor active and sending test alert
- [ ] Daily backup cron verified (check Vercel → Functions → Logs)
- [ ] `/api/health` returns `{"status":"ok"}` from production URL
- [ ] `/api/admin/preflight` returns no `fail` items
- [ ] Announce launch 🎉

---

_Generated by Devin — update as infrastructure evolves._
