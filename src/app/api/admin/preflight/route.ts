/**
 * Production preflight environment checker
 *
 * GET /api/admin/preflight — returns a structured report of all required and
 * optional environment variables, grouped by category, with PASS/WARN/FAIL
 * status for each.
 *
 * Only accessible by authenticated ADMIN users.
 *
 * Use this before going live to confirm all credentials are in place:
 *   curl -H "Cookie: next-auth.session-token=..." \
 *        https://your-domain.com/api/admin/preflight | jq
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface EnvCheck {
  key: string;
  status: CheckStatus;
  note: string;
}

interface CheckGroup {
  group: string;
  checks: EnvCheck[];
}

function check(key: string, required: boolean, note: string): EnvCheck {
  const value = process.env[key];
  const present = !!value && value.trim() !== '';
  return {
    key,
    status: present ? 'pass' : required ? 'fail' : 'warn',
    note: present ? 'set' : `not set — ${note}`,
  };
}

function checkNotPlaceholder(key: string, placeholder: string, note: string): EnvCheck {
  const value = process.env[key];
  const present = !!value && value.trim() !== '' && value !== placeholder;
  return {
    key,
    status: present ? 'pass' : 'fail',
    note: present ? 'set' : `${!value ? 'not set' : 'still using placeholder'} — ${note}`,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }

  const groups: CheckGroup[] = [
    {
      group: 'Core (required)',
      checks: [
        check('DATABASE_URL', true, 'app will not start without a DB connection'),
        checkNotPlaceholder(
          'NEXTAUTH_SECRET',
          'your-nextauth-secret',
          'generate: openssl rand -base64 32'
        ),
        checkNotPlaceholder(
          'NEXTAUTH_URL',
          'http://localhost:3000',
          'must point to your production domain'
        ),
        check('NEXT_PUBLIC_APP_URL', true, 'used for metadata canonical URLs and OG tags'),
      ],
    },
    {
      group: 'Payments',
      checks: [
        check('STRIPE_SECRET_KEY', false, 'required for Stripe checkout'),
        check('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', false, 'required for Stripe Elements'),
        check('STRIPE_WEBHOOK_SECRET', false, 'required to verify Stripe webhook signatures'),
        check('PAYSKY_MERCHANT_ID', false, 'required for PaySky (Egyptian gateway)'),
        check('PAYSKY_MERCHANT_SECRET', false, 'required for PaySky SecureHash'),
        check('PAYMOB_API_KEY', false, 'required for Paymob (Egyptian gateway)'),
        check('FAWRY_MERCHANT_CODE', false, 'required for Fawry (Egyptian gateway)'),
      ],
    },
    {
      group: 'Image Hosting',
      checks: [
        check(
          'BLOB_READ_WRITE_TOKEN',
          false,
          'Vercel Blob preferred; falls back to Cloudinary or base64'
        ),
        check('CLOUDINARY_CLOUD_NAME', false, 'Cloudinary fallback for image hosting'),
        check('CLOUDINARY_API_KEY', false, 'Cloudinary fallback for image hosting'),
        check('CLOUDINARY_API_SECRET', false, 'Cloudinary fallback for image hosting'),
      ],
    },
    {
      group: 'Email (Resend)',
      checks: [
        check(
          'RESEND_API_KEY',
          false,
          'transactional emails (order confirmations, OTP) will not be sent'
        ),
      ],
    },
    {
      group: 'Security',
      checks: [
        check('BANK_ACCOUNT_SECRET', false, 'seller bank details stored in plain text if not set'),
        check('CRON_SECRET', false, 'cron endpoints are publicly callable without this'),
        check('UPTIME_WEBHOOK_SECRET', false, 'uptime webhook is unauthenticated without this'),
      ],
    },
    {
      group: 'Caching / Rate-limiting (Redis)',
      checks: [
        check(
          'REDIS_URL',
          false,
          'OR set UPSTASH_REDIS_REST_URL; in-memory fallback used if absent'
        ),
        check('UPSTASH_REDIS_REST_URL', false, 'Upstash alternative to REDIS_URL'),
      ],
    },
    {
      group: 'Observability',
      checks: [
        check('SENTRY_DSN', false, 'crash reporting disabled without this'),
        check(
          'UPTIME_ALERT_EMAIL',
          false,
          '/api/webhooks/alerting will not send emails without this'
        ),
      ],
    },
    {
      group: 'SEO & Social',
      checks: [
        checkNotPlaceholder(
          'GOOGLE_SITE_VERIFICATION',
          'google-site-verification-code',
          'get real code from Google Search Console'
        ),
        check('CANONICAL_DOMAIN', false, 'dual-domain redirect disabled; set to e.g. brandyy.shop'),
        check('NEXT_PUBLIC_TWITTER_HANDLE', false, 'twitter:creator tag omitted without this'),
        check('TAX_REGISTRATION_NUMBER', false, 'invoices will use placeholder "XXX-XXX-XXX-DEV"'),
      ],
    },
    {
      group: 'OAuth',
      checks: [
        check('GOOGLE_CLIENT_ID', false, 'Google Sign-In disabled'),
        check('GOOGLE_CLIENT_SECRET', false, 'Google Sign-In disabled'),
      ],
    },
    {
      group: 'Backup',
      checks: [check('BACKUP_RETENTION_DAYS', false, 'defaults to 30 days if not set')],
    },
  ];

  const allChecks = groups.flatMap(g => g.checks);
  const failCount = allChecks.filter(c => c.status === 'fail').length;
  const warnCount = allChecks.filter(c => c.status === 'warn').length;
  const passCount = allChecks.filter(c => c.status === 'pass').length;

  const overallStatus = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass';

  return NextResponse.json(
    {
      status: overallStatus,
      summary: { pass: passCount, warn: warnCount, fail: failCount, total: allChecks.length },
      groups,
      checkedAt: new Date().toISOString(),
    },
    { status: overallStatus === 'fail' ? 424 : 200 }
  );
}
