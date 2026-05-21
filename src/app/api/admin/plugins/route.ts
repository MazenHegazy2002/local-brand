// Admin Plugins API.
//
// GET   /api/admin/plugins              — registry + per-plugin install state
// PATCH /api/admin/plugins              — body: { slug, enabled?, config? }
//                                         updates the Plugin row, encrypts secrets.
// POST  /api/admin/plugins/test         — body: { slug } → runs a test ping
//
// Secrets in `config` go through `encryptSecret` from lib/secrets.ts before
// being persisted, so even DB dumps don't leak API keys.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { PLUGIN_REGISTRY, PLUGIN_CATEGORIES, getPlugin } from '@/lib/plugin-registry';
import { encryptSecret, readSecret } from '@/lib/secrets';
import type { PluginCategory } from '@/generated/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

function maskField(value: string | null | undefined, isSecret: boolean): string {
  if (!value) return '';
  if (!isSecret) return value;
  // Decrypt-then-mask so secrets never echo back as ciphertext.
  const plain = readSecret(value);
  if (!plain) return '';
  return `••• ${plain.slice(-4)}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.plugin.findMany();
  const bySlug = new Map(rows.map(r => [r.slug, r]));

  const plugins = PLUGIN_REGISTRY.map(def => {
    const row = bySlug.get(def.slug);
    let parsed: Record<string, string> = {};
    if (row?.configJson) {
      try {
        parsed = JSON.parse(row.configJson);
      } catch {
        /* tolerate corrupt rows */
      }
    }
    // Mask each field that's flagged secret in the registry definition.
    const maskedConfig: Record<string, string> = {};
    for (const field of def.fields) {
      maskedConfig[field.key] = maskField(parsed[field.key], field.type === 'secret');
    }
    // Whether any of the env-var fallbacks are present in the runtime.
    const envConfigured = (def.envVars ?? []).some(v => Boolean(process.env[v]));

    return {
      ...def,
      installed: !!row,
      isEnabled: row?.isEnabled ?? false,
      lastTestOk: row?.lastTestOk ?? null,
      lastTestAt: row?.lastTestAt ?? null,
      lastTestMsg: row?.lastTestMsg ?? null,
      configMasked: maskedConfig,
      envConfigured,
    };
  });

  // Group by category for the UI.
  const byCategory = PLUGIN_CATEGORIES.map(cat => ({
    ...cat,
    plugins: plugins.filter(p => p.category === cat.slug),
  }));

  return NextResponse.json({ categories: byCategory, plugins });
}

interface PatchBody {
  slug?: string;
  isEnabled?: boolean;
  config?: Record<string, string>;
  notes?: string;
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  if (!body.slug) return NextResponse.json({ message: 'slug required' }, { status: 400 });

  const def = getPlugin(body.slug);
  if (!def) return NextResponse.json({ message: 'Unknown plugin' }, { status: 404 });

  // Merge incoming config with the existing row so partial updates don't
  // wipe other fields. Encrypt fields flagged secret.
  const existing = await prisma.plugin.findUnique({ where: { slug: body.slug } });
  let merged: Record<string, string> = {};
  if (existing?.configJson) {
    try {
      merged = JSON.parse(existing.configJson);
    } catch {
      merged = {};
    }
  }
  if (body.config) {
    for (const field of def.fields) {
      const v = body.config[field.key];
      if (v === undefined) continue;
      // Empty string clears the field (lets admin delete a key).
      if (v === '') {
        delete merged[field.key];
        continue;
      }
      // Don't re-store the masked placeholder — that means the admin
      // didn't change the value. Skip those entries.
      if (typeof v === 'string' && v.startsWith('••• ')) continue;
      if (field.type === 'secret') {
        const enc = encryptSecret(v);
        merged[field.key] = enc ?? v; // fall back to plaintext if no key set
      } else {
        merged[field.key] = v;
      }
    }
  }

  const updated = await prisma.plugin.upsert({
    where: { slug: body.slug },
    create: {
      slug: body.slug,
      name: def.name,
      category: def.category as PluginCategory,
      isEnabled: body.isEnabled ?? false,
      configJson: JSON.stringify(merged),
      notes: body.notes ?? null,
    },
    update: {
      isEnabled: body.isEnabled ?? existing?.isEnabled ?? false,
      configJson: JSON.stringify(merged),
      notes: body.notes ?? existing?.notes ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: body.isEnabled === false ? 'PLUGIN_DISABLED' : 'PLUGIN_UPDATED',
      targetId: body.slug,
      details: JSON.stringify({
        slug: body.slug,
        isEnabled: updated.isEnabled,
        // Don't log the full config — just the keys that were changed.
        changedKeys: body.config ? Object.keys(body.config) : [],
      }),
    },
  });

  return NextResponse.json({ ok: true });
}
