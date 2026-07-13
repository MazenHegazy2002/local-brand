// POST /api/admin/plugins/[slug]/test
// Runs a lightweight connectivity test for the given plugin and writes the
// result back to the Plugin row (lastTestOk / lastTestAt / lastTestMsg).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { getPlugin } from '@/lib/plugin-registry';
import { readSecret } from '@/lib/secrets';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

async function runTest(slug: string, config: Record<string, string>): Promise<string> {
  switch (slug) {
    case 'stripe': {
      const key = config.secretKey ? readSecret(config.secretKey) : process.env.STRIPE_SECRET_KEY;
      if (!key) return 'No secret key configured';
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return `Stripe returned ${res.status}`;
      return 'Connected — balance endpoint OK';
    }

    case 'resend': {
      const key = config.apiKey ? readSecret(config.apiKey) : process.env.RESEND_API_KEY;
      if (!key) return 'No API key configured';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      });
      // 200 or 405 both confirm the key is valid
      if (res.status === 401 || res.status === 403)
        return `Resend rejected the key (${res.status})`;
      return 'Connected — Resend API key accepted';
    }

    case 'cloudinary': {
      const cloud = config.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = config.apiKey ? readSecret(config.apiKey) : process.env.CLOUDINARY_API_KEY;
      const apiSecret = config.apiSecret
        ? readSecret(config.apiSecret)
        : process.env.CLOUDINARY_API_SECRET;
      if (!cloud || !apiKey || !apiSecret) return 'Cloud name, API key, or secret missing';
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) return `Cloudinary returned ${res.status}`;
      return 'Connected — usage endpoint OK';
    }

    case 'bosta': {
      const key = config.apiKey ? readSecret(config.apiKey) : undefined;
      if (!key) return 'No API key configured';
      const res = await fetch('https://app.bosta.co/api/v2/cities', {
        headers: { Authorization: key },
      });
      if (!res.ok) return `Bosta returned ${res.status}`;
      return 'Connected — cities endpoint OK';
    }

    case 'virtual-tryon': {
      const keys = config.apiKeys ? readSecret(config.apiKeys) : undefined;
      if (!keys) return 'No Gemini API key(s) configured';
      const firstKey = keys.split(',')[0].trim();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${firstKey}`
      );
      if (!res.ok) return `Gemini returned ${res.status}`;
      return 'Connected — Gemini API key accepted';
    }

    default: {
      // Generic: just check a required field is set
      const def = getPlugin(slug);
      if (!def) return 'Unknown plugin';
      const firstRequired = def.fields.find(f => f.required);
      if (!firstRequired) return 'No required fields — nothing to test';
      const val = config[firstRequired.key] ? readSecret(config[firstRequired.key]) : undefined;
      if (!val) return `Required field "${firstRequired.label}" is not configured`;
      return `Field "${firstRequired.label}" is set (no live connectivity test available for ${def.name})`;
    }
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;

  const def = getPlugin(slug);
  if (!def) return NextResponse.json({ message: 'Unknown plugin' }, { status: 404 });

  // Load stored config
  const row = await prisma.plugin.findUnique({ where: { slug } });
  let config: Record<string, string> = {};
  if (row?.configJson) {
    try {
      config = JSON.parse(row.configJson);
    } catch {
      /* ignore */
    }
  }

  let ok = false;
  let message = '';
  try {
    message = await runTest(slug, config);
    ok = true;
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
    ok = false;
  }

  // Upsert the Plugin row with test result
  await prisma.plugin.upsert({
    where: { slug },
    create: {
      slug,
      name: def.name,
      category: def.category as import('@/generated/client').PluginCategory,
      configJson: '{}',
      isEnabled: false,
      lastTestOk: ok,
      lastTestAt: new Date(),
      lastTestMsg: message,
    },
    update: {
      lastTestOk: ok,
      lastTestAt: new Date(),
      lastTestMsg: message,
    },
  });

  return NextResponse.json({ ok, message });
}
