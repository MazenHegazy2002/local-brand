// Self-hosted expo-updates server (protocol v1). See
// https://docs.expo.dev/technical-specs/expo-updates-1/
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/file-store';

export const UPDATES_DIR = path.join(UPLOAD_DIR, 'app-updates');

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  json: 'application/json',
  bundle: 'application/javascript',
  hbc: 'application/javascript',
  js: 'application/javascript',
};
export const mimeFor = (ext: string) => MIME[ext.toLowerCase()] ?? 'application/octet-stream';

const b64url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Resolve a path inside one update's folder; null if it escapes it. */
export function updateFile(updateId: string, rel: string): string | null {
  if (!/^[0-9a-f-]{36}$/i.test(updateId)) return null;
  const base = path.join(UPDATES_DIR, updateId);
  const full = path.resolve(base, rel);
  return full.startsWith(base + path.sep) ? full : null;
}

type Asset = { hash: string; key: string; fileExtension: string; contentType: string; url: string };
const cache = new Map<string, unknown>();

/** Build the manifest for one stored update and platform (cached in memory). */
export async function buildManifest(
  update: { id: string; runtimeVersion: string; createdAt: Date },
  platform: 'android' | 'ios',
  origin: string
) {
  const cacheKey = `${update.id}:${platform}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const meta = JSON.parse(await readFile(updateFile(update.id, 'metadata.json')!, 'utf8'));
  const files = meta.fileMetadata?.[platform];
  if (!files?.bundle) return null;
  let expoClient: unknown = {};
  try {
    expoClient = JSON.parse(await readFile(updateFile(update.id, 'expoConfig.json')!, 'utf8'));
  } catch {
    /* optional */
  }

  const asset = async (rel: string, ext: string, isLaunch = false): Promise<Asset> => {
    const buf = await readFile(updateFile(update.id, rel)!);
    return {
      hash: b64url(createHash('sha256').update(buf).digest()),
      key: createHash('md5').update(buf).digest('hex'),
      fileExtension: `.${ext}`,
      contentType: isLaunch ? 'application/javascript' : mimeFor(ext),
      url: `${origin}/api/app/updates/assets?id=${update.id}&path=${encodeURIComponent(rel)}&platform=${platform}`,
    };
  };

  const manifest = {
    id: update.id,
    createdAt: update.createdAt.toISOString(),
    runtimeVersion: update.runtimeVersion,
    launchAsset: await asset(files.bundle, 'bundle', true),
    assets: await Promise.all(
      (files.assets ?? []).map((a: { path: string; ext: string }) => asset(a.path, a.ext))
    ),
    metadata: {},
    extra: { expoClient },
  };
  cache.set(cacheKey, manifest);
  return manifest;
}

/** multipart/mixed body with one named JSON part, as the protocol expects. */
export function multipart(name: 'manifest' | 'directive', json: unknown) {
  const boundary = `brandyy-${Math.random().toString(36).slice(2)}`;
  const body =
    `--${boundary}\r\n` +
    `content-type: application/json; charset=utf-8\r\n` +
    `content-disposition: form-data; name="${name}"\r\n\r\n` +
    `${JSON.stringify(json)}\r\n` +
    `--${boundary}\r\n` +
    `content-type: application/json\r\n` +
    `content-disposition: form-data; name="extensions"\r\n\r\n` +
    `${JSON.stringify({ assetRequestHeaders: {} })}\r\n` +
    `--${boundary}--\r\n`;
  return { body, contentType: `multipart/mixed; boundary=${boundary}` };
}
