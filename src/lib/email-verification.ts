import { SUPPORT_EMAIL } from '@/lib/constants';

/**
 * Canonical base URL for all verification and auth links in transactional emails.
 * Always resolves to https://brandyy.shop unless explicitly configured to another non-localhost public domain.
 */
export function getEmailBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/+$/, '');
  }
  return 'https://brandyy.shop';
}

/**
 * HTML email sent to every new user immediately after registration.
 * The link is valid for 10 minutes and points to /api/auth/verify-email?token=…
 */
export function generateEmailVerificationEmail(name: string, verifyUrl: string): string {
  // Ensure verifyUrl always uses brandyy.shop if it accidentally pointed to localhost or a relative URL
  let safeVerifyUrl = verifyUrl;
  if (
    !safeVerifyUrl ||
    safeVerifyUrl.startsWith('/') ||
    safeVerifyUrl.includes('localhost') ||
    safeVerifyUrl.includes('127.0.0.1')
  ) {
    try {
      const parsed = new URL(safeVerifyUrl, 'https://brandyy.shop');
      safeVerifyUrl = `https://brandyy.shop${parsed.pathname}${parsed.search}`;
    } catch {
      safeVerifyUrl = `https://brandyy.shop/api/auth/verify-email?token=${encodeURIComponent(verifyUrl)}`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f9f9;padding:20px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#1e3b8a;color:#fff;padding:36px 30px;text-align:center">
      <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px">BRANDY</h1>
      <p style="margin:8px 0 0;opacity:0.8;font-size:14px">Confirm your email address</p>
    </div>
    <div style="padding:36px 30px">
      <h2 style="color:#1e293b;margin:0 0 12px;font-size:20px">Hey ${name} &#128075;</h2>
      <p style="color:#64748b;line-height:1.7;margin:0 0 28px">
        Thanks for joining Brandy! Please verify your email address by clicking the button below.
        This link expires in <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:0 0 28px">
        <a href="${safeVerifyUrl}"
           style="display:inline-block;background:#1e3b8a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px">
          Verify Email Address
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0">
        If you didn&apos;t create this account you can safely ignore this email.<br>
        Or copy this link: <span style="color:#1e3b8a;word-break:break-all">${safeVerifyUrl}</span>
      </p>
    </div>
    <div style="background:#f8fafc;padding:20px 30px;text-align:center;font-size:12px;color:#94a3b8">
      &copy; 2026 Brandy. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sent to a new seller after they register, letting them know the account is
 * under admin review and they cannot list products yet.
 */
export function generateSellerPendingEmail(name: string, storeName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9f9f9;padding:20px;margin:0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:#0F6E56;color:#fff;padding:36px 30px;text-align:center">
      <h1 style="margin:0;font-size:28px;font-weight:900">BRANDY</h1>
      <p style="margin:8px 0 0;opacity:0.8;font-size:14px">Seller Application Received</p>
    </div>
    <div style="padding:36px 30px">
      <h2 style="color:#1e293b;margin:0 0 12px;font-size:20px">Hi ${name},</h2>
      <p style="color:#64748b;line-height:1.7;margin:0 0 16px">
        We received your application to open <strong>${storeName}</strong> on Brandy.
        Our team will review your details within <strong>1&#8211;2 business days</strong>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin:0 0 24px">
        <p style="margin:0;color:#166534;font-size:13px;line-height:1.6">
          &#9203; <strong>What happens next?</strong><br>
          Once approved you&apos;ll receive a confirmation email and can start adding products.
          Until then your account is under review &mdash; you cannot list products yet.
        </p>
      </div>
      <p style="color:#94a3b8;font-size:12px">Questions? Email us at ${SUPPORT_EMAIL}</p>
    </div>
    <div style="background:#f8fafc;padding:20px 30px;text-align:center;font-size:12px;color:#94a3b8">
      &copy; 2026 Brandy. All rights reserved.
    </div>
  </div>
</body>
</html>`;
}
