import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface GoogleDriveCredentials {
  clientEmail: string;
  privateKey: string;
}

export interface UploadFileOptions {
  folderId: string;
  fileName: string;
  mimeType: string;
  body: Buffer | string;
  credentials: GoogleDriveCredentials;
}

export interface UploadFileResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
}

/**
 * Returns Google Drive credentials from environment variables or settings.
 * Supports GOOGLE_SERVICE_ACCOUNT_JSON (full JSON or file path),
 * standard google-service-account.json files, or separate EMAIL + PRIVATE_KEY.
 */
export function getGoogleDriveCredentials(): GoogleDriveCredentials | null {
  function tryParseJson(str: string): any {
    try {
      let p = JSON.parse(str);
      if (typeof p === 'string') p = JSON.parse(p);
      return p;
    } catch {
      try {
        const cleaned = str.replace(/\\"/g, '"');
        let p = JSON.parse(cleaned);
        if (typeof p === 'string') p = JSON.parse(p);
        return p;
      } catch {
        return null;
      }
    }
  }

  // 1. Try GOOGLE_SERVICE_ACCOUNT_JSON env var (either JSON content or file path)
  let rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  // Check if it's a file path
  if (rawJson && fs.existsSync(rawJson)) {
    try {
      rawJson = fs.readFileSync(rawJson, 'utf-8');
    } catch {
      /* ignore read errors */
    }
  }

  let parsed = rawJson ? tryParseJson(rawJson) : null;

  // Auto-detect standard service account file paths if env var not set or invalid
  if (!parsed) {
    const candidateFiles = [
      path.resolve(process.cwd(), 'google-service-account.json'),
      path.resolve(process.cwd(), 'medical-lms-485318-2d4be2c8d4df.json'),
      '/opt/localbrand/google-service-account.json',
      '/opt/localbrand/medical-lms-485318-2d4be2c8d4df.json',
    ];
    for (const f of candidateFiles) {
      if (fs.existsSync(f)) {
        try {
          const content = fs.readFileSync(f, 'utf-8');
          parsed = tryParseJson(content);
          if (parsed?.client_email && parsed?.private_key) break;
        } catch {
          /* continue */
        }
      }
    }
  }

  if (parsed && parsed.client_email && parsed.private_key) {
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key.replace(/\\n/g, '\n'),
    };
  }

  // 2. Try separate env vars
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    return { clientEmail, privateKey };
  }

  return null;
}

/**
 * Generates an OAuth2 access token for Google Drive API using a Service Account JWT.
 * No external Google libraries required — uses native Node.js crypto.
 */
export async function getGoogleAccessToken(credentials: GoogleDriveCredentials): Promise<string> {
  const { clientEmail, privateKey } = credentials;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + payload);
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Failed to obtain Google access token (${tokenRes.status}): ${errorBody}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

/**
 * Uploads a file (Buffer or String) into a specific Google Drive folder.
 * Uses Google Drive REST API v3 multipart upload.
 */
export async function uploadFileToGoogleDrive(
  options: UploadFileOptions
): Promise<UploadFileResult> {
  const { folderId, fileName, mimeType, body, credentials } = options;

  const accessToken = await getGoogleAccessToken(credentials);

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const boundary = `-------brandy_backup_boundary_${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileBuffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf-8');

  const metadataHeader =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n';

  const base64Data = fileBuffer.toString('base64');
  const multipartBody = metadataHeader + base64Data + closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const data = (await uploadRes.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };

  return {
    fileId: data.id,
    fileName: data.name,
    webViewLink: data.webViewLink,
  };
}
