# Deployment Checklist

## Pre-Deploy
- [ ] All environment variables set in Vercel dashboard
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Prisma client generated
- [ ] Seed data (if needed)
- [ ] Custom domain configured
- [ ] SSL certificate verified

## Post-Deploy
- [ ] Health check passing (/api/health)
- [ ] Login works (test with admin account)
- [ ] Product listing works
- [ ] Cart and checkout flow works
- [ ] Stripe webhook configured
- [ ] Cron jobs running
- [ ] Error monitoring set up (Sentry)
- [ ] Analytics configured
- [ ] SEO verified (Google Search Console)