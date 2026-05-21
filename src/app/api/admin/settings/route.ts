// Admin Settings API.
//
// GET  /api/admin/settings           — full registry + current values per
//                                      category, suitable for the Settings tab UI.
// GET  /api/admin/settings?key=X     — single setting (raw + typed value).
// PATCH /api/admin/settings          — body: { updates: [{ key, value }, ...] }
//                                      writes via the registry (audited).
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import {
  SETTINGS_REGISTRY,
  SETTING_CATEGORIES,
  getDefinition,
  getSetting,
  setSetting,
  serializeValue,
  type SettingDefinition,
} from '@/lib/admin-settings-registry';
import { prisma } from '@/lib/prisma';

function unauthorized() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

function maskSecret(def: SettingDefinition, value: unknown) {
  if (!def.sensitive) return value;
  if (typeof value !== 'string' || !value) return value;
  // Show only the last 4 chars so the admin knows the secret is "set"
  // without exposing the value.
  return `••• ${value.slice(-4)}`;
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key) {
    // Single-key read — useful for the Site/Theme tab to fetch one value.
    try {
      const def = getDefinition(key);
      const raw = await getSetting<unknown>(key);
      return NextResponse.json({ key, value: maskSecret(def, raw), definition: def });
    } catch {
      return NextResponse.json({ message: 'Unknown setting' }, { status: 404 });
    }
  }

  // Full catalog dump. We hydrate each registry entry with the current
  // serialized value from the DB (or '' if no row), masking secrets.
  const rows = await prisma.systemSettings.findMany();
  const byKey = new Map(rows.map(r => [r.key, r]));

  const items = SETTINGS_REGISTRY.map(def => {
    const row = byKey.get(def.key);
    const stored = row?.value ?? null;
    const value = stored !== null ? maskSecret(def, stored) : serializeValue(def, def.defaultValue);
    return {
      ...def,
      value,
      isDefault: stored === null,
      updatedAt: row?.updatedAt ?? null,
    };
  });

  // Group by category for the UI.
  const byCategory = SETTING_CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.slug),
  }));

  return NextResponse.json({ categories: byCategory, items });
}

interface PatchBody {
  updates?: Array<{ key: string; value: unknown }>;
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (!updates.length) {
    return NextResponse.json({ message: 'No updates provided' }, { status: 400 });
  }

  // Validate first, write second — fail closed if any key is unknown so we
  // don't apply a partial set.
  const failures: Array<{ key: string; reason: string }> = [];
  for (const u of updates) {
    if (!u || typeof u.key !== 'string') {
      failures.push({ key: String(u?.key ?? '?'), reason: 'Missing key' });
      continue;
    }
    try {
      const def = getDefinition(u.key);
      // Type-specific guardrails — basic sanity, schema-level checks live in
      // the registry pattern/range fields.
      if (def.type === 'number') {
        const n = Number(u.value);
        if (!Number.isFinite(n)) failures.push({ key: u.key, reason: 'Not a number' });
        else if (def.range && (n < def.range[0] || n > def.range[1])) {
          failures.push({
            key: u.key,
            reason: `Out of range [${def.range[0]}, ${def.range[1]}]`,
          });
        }
      }
      if (def.type === 'json') {
        // Already an object, or a JSON-parseable string.
        if (typeof u.value === 'string') {
          try {
            JSON.parse(u.value);
          } catch {
            failures.push({ key: u.key, reason: 'Invalid JSON' });
          }
        }
      }
    } catch {
      failures.push({ key: u.key, reason: 'Unknown setting key' });
    }
  }

  if (failures.length) {
    return NextResponse.json({ message: 'Validation failed', failures }, { status: 400 });
  }

  for (const u of updates) {
    await setSetting(u.key, u.value, admin.id);
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
