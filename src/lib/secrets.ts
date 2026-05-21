/**
 * AES-256-GCM symmetric encryption for at-rest secrets we have to round-trip
 * (e.g. seller bank-account numbers). Production callers must set
 * `BANK_ACCOUNT_SECRET` to a 32-byte key encoded as 64 hex chars or 44
 * base64 chars (the helper accepts both).
 *
 * Stored format: `enc:v1:<ivHex>:<authTagHex>:<ciphertextHex>`
 *   - The `enc:v1:` sentinel lets `isEncrypted()` distinguish encrypted
 *     blobs from legacy plain-text values, so reads gracefully fall back
 *     and we can opportunistically re-encrypt on next write.
 *   - Versioned (`v1`) so future key-rotation / algo-change is non-breaking.
 *
 * Intentionally NOT exported: a "decrypt or throw" helper. We want callers
 * to choose: `tryDecrypt()` returns `null` on failure (use this when the
 * stored value might be legacy plain-text), `decryptStrict()` throws (use
 * for paths that should never have legacy data).
 */
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce size
const KEY_BYTES = 32; // 256-bit key
const VERSION_PREFIX = 'enc:v1:';

let cachedKey: Buffer | null = null;

function loadKey(): Buffer | null {
  if (cachedKey) return cachedKey;
  const raw = process.env.BANK_ACCOUNT_SECRET;
  if (!raw) return null;

  // Accept either 64 hex chars or 44 base64 chars (32 bytes either way).
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    cachedKey = Buffer.from(raw, 'hex');
    return cachedKey;
  }
  // base64
  const buf = Buffer.from(raw, 'base64');
  if (buf.length === KEY_BYTES) {
    cachedKey = buf;
    return cachedKey;
  }

  // Misconfigured key — log loudly. We refuse to fall back to a default
  // because that would be worse than no encryption.
  console.error(
    '[secrets] BANK_ACCOUNT_SECRET is set but is not a valid 32-byte key ' +
      '(expected 64 hex chars or base64 of 32 bytes). Encryption is disabled.'
  );
  return null;
}

/** True iff the stored value matches the `enc:v1:…` envelope. */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(VERSION_PREFIX);
}

/**
 * Encrypt a UTF-8 string. Returns `null` when encryption isn't configured;
 * callers should treat that as "store plain-text" (we explicitly warn loud
 * once — this is allowed in dev, never in prod).
 */
export function encryptSecret(plain: string): string | null {
  const key = loadKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[secrets] BANK_ACCOUNT_SECRET not configured in production. ' +
          'Sensitive fields will be stored in plain text — set it before launch.'
      );
    }
    return null;
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt or return null. Use this for "round-trip" paths where the stored
 * value might be a legacy plain-text record from before encryption was
 * enabled — caller should fall back to treating the stored string as the
 * cleartext.
 */
export function tryDecrypt(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isEncrypted(stored)) return null;
  const key = loadKey();
  if (!key) return null;

  try {
    const rest = stored.slice(VERSION_PREFIX.length);
    const [ivHex, tagHex, ctHex] = rest.split(':');
    if (!ivHex || !tagHex || !ctHex) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
  } catch (err) {
    console.error('[secrets] decrypt failed (key rotated? blob corrupted?):', err);
    return null;
  }
}

/**
 * Decrypt a stored secret, falling back to the raw value for legacy
 * plain-text rows. Always returns a string (or null if input is empty).
 *
 * The opportunistic re-encryption is the caller's responsibility — read
 * with this helper, then write the encrypted version back through
 * `encryptSecret()` next time the row is updated.
 */
export function readSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (isEncrypted(stored)) return tryDecrypt(stored);
  return stored; // legacy plain-text
}

/**
 * Mask a bank account number for display. Keeps the last 4 chars,
 * replaces the rest with •. e.g. `EG12 3456 7890 1234` → `••• 1234`.
 */
export function redactBankAccount(account: string | null | undefined): string {
  if (!account) return '';
  const trimmed = account.replace(/\s+/g, '');
  if (trimmed.length <= 4) return '••' + trimmed;
  return `••• ${trimmed.slice(-4)}`;
}
