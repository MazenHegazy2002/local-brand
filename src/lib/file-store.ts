import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

// Images live on the server's disk (a Docker volume in production) and are
// served by /api/files/[name]. The DB stores the short "/api/files/<name>" path.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const MIME: Record<string, string> = Object.fromEntries(
  Object.entries(EXT).map(([m, e]) => [e, m])
);

// Only names we generated: uuid + known extension. Blocks path traversal.
export const SAFE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

export async function saveFile(buf: Buffer, mime: string) {
  const name = `${randomUUID()}.${EXT[mime] ?? 'jpg'}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/api/files/${name}`;
}

export function readStoredFile(name: string) {
  return readFile(path.join(UPLOAD_DIR, name));
}

// Moves a base64 data: URL onto disk; returns the new path (or null if not a data URL).
export async function dataUrlToFile(dataUrl: string) {
  const m = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  return saveFile(Buffer.from(m[2], 'base64'), m[1]);
}
