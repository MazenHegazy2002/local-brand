import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { notifyMultiple } from '@/lib/notification-helpers';
import { getSetting } from '@/lib/admin-settings-registry';

export interface NewRegistrationNotificationParams {
  type: 'CUSTOMER' | 'SELLER' | 'AFFILIATE' | 'MAGIC_LINK' | 'ADMIN_CREATED';
  userId?: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  // Seller specific details
  storeName?: string;
  sellerType?: string;
  description?: string;
  taxNumber?: string | null;
  governorate?: string;
  city?: string;
  pickupStreet?: string;
  pickupBuilding?: string | null;
  pickupPhone?: string;
  pickupContactName?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  logoUrl?: string | null;
  // Affiliate specific details
  affiliateCode?: string;
  whatsapp?: string;
  socialLinks?: string;
  promotionMethod?: string;
  notes?: string;
}

const PRIMARY_ADMIN_EMAIL = 'mazenhegazy6@gmail.com';

export function generateAdminRegistrationEmailHtml(
  params: NewRegistrationNotificationParams,
  appUrl: string
): { subject: string; html: string } {
  const { type, name, email, phone, role } = params;

  let badgeText = '👤 New Customer Registration';
  let badgeColor = '#2563EB'; // Blue
  let subject = `🎉 New Customer Registered: ${name} (${email})`;
  let adminTab = 'users';

  if (type === 'SELLER' || role === 'SELLER') {
    badgeText = '🏪 New Seller Registration / Application';
    badgeColor = '#D97706'; // Amber
    subject = `🏪 New Seller Registered: ${params.storeName || name} (${email})`;
    adminTab = 'sellers';
  } else if (type === 'AFFILIATE') {
    badgeText = '🤝 New Affiliate Application';
    badgeColor = '#059669'; // Emerald
    subject = `🤝 New Affiliate Application: ${name} (${email})`;
    adminTab = 'affiliates';
  }

  const nowStr = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const adminLink = `${appUrl}/admin-os?tab=${adminTab}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f1f5f9; padding: 24px 12px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(135deg, #1e3b8a 0%, #0f172a 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <span style="display: inline-block; background: ${badgeColor}; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
        ${badgeText}
      </span>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; color: #ffffff;">
        New Account Activity Alert
      </h1>
      <p style="margin: 8px 0 0; opacity: 0.85; font-size: 13px;">
        Notification for Mazen Hegazy
      </p>
    </div>

    <!-- Main Body -->
    <div style="padding: 28px 24px;">
      
      <p style="margin: 0 0 20px; font-size: 15px; color: #334155; line-height: 1.5;">
        A new account has just been registered on <strong>Brandy</strong> with the following details:
      </p>

      <!-- Account Summary Card -->
      <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0; width: 35%;">Name</td>
          <td style="padding: 12px 16px; font-weight: 700; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Email</td>
          <td style="padding: 12px 16px; font-weight: 600; color: #1e3b8a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">
            <a href="mailto:${email}" style="color: #1e3b8a; text-decoration: none;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Phone Number</td>
          <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 13px; border-bottom: 1px solid #e2e8f0;">Account Role</td>
          <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${role || type}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; color: #64748b; font-size: 13px;">Registered At</td>
          <td style="padding: 12px 16px; color: #475569; font-size: 13px;">${nowStr} (Cairo Time)</td>
        </tr>
      </table>

      ${
        params.storeName
          ? `
      <!-- Seller Specific Details -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          🏪 Store Information
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #78350f; font-weight: 600; width: 35%;">Store Name:</td>
            <td style="padding: 4px 0; color: #451a03; font-weight: 700;">${params.storeName}</td>
          </tr>
          ${
            params.sellerType
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600;">Business Type:</td><td style="padding: 4px 0; color: #451a03;">${params.sellerType}</td></tr>`
              : ''
          }
          ${
            params.taxNumber
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600;">Tax Number:</td><td style="padding: 4px 0; color: #451a03;">${params.taxNumber}</td></tr>`
              : ''
          }
          ${
            params.governorate
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600;">Location:</td><td style="padding: 4px 0; color: #451a03;">${params.city || ''}, ${params.governorate}</td></tr>`
              : ''
          }
          ${
            params.pickupStreet
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600;">Pickup Address:</td><td style="padding: 4px 0; color: #451a03;">${params.pickupStreet}</td></tr>`
              : ''
          }
          ${
            params.pickupPhone
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600;">Pickup Phone:</td><td style="padding: 4px 0; color: #451a03;">${params.pickupPhone}</td></tr>`
              : ''
          }
          ${
            params.description
              ? `<tr><td style="padding: 4px 0; color: #78350f; font-weight: 600; vertical-align: top;">Description:</td><td style="padding: 4px 0; color: #451a03;">${params.description}</td></tr>`
              : ''
          }
          ${
            params.facebookUrl || params.instagramUrl || params.tiktokUrl
              ? `<tr>
                  <td style="padding: 4px 0; color: #78350f; font-weight: 600;">Social Links:</td>
                  <td style="padding: 4px 0; color: #451a03;">
                    ${params.facebookUrl ? `<a href="${params.facebookUrl}" style="color:#1e3b8a;margin-right:8px;">Facebook</a>` : ''}
                    ${params.instagramUrl ? `<a href="${params.instagramUrl}" style="color:#1e3b8a;margin-right:8px;">Instagram</a>` : ''}
                    ${params.tiktokUrl ? `<a href="${params.tiktokUrl}" style="color:#1e3b8a;">TikTok</a>` : ''}
                  </td>
                </tr>`
              : ''
          }
        </table>
      </div>
      `
          : ''
      }

      ${
        params.affiliateCode || params.whatsapp
          ? `
      <!-- Affiliate Details -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          🤝 Affiliate Application Details
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${
            params.whatsapp
              ? `<tr><td style="padding: 4px 0; color: #166534; font-weight: 600; width: 35%;">WhatsApp:</td><td style="padding: 4px 0; color: #14532d; font-weight: 700;">${params.whatsapp}</td></tr>`
              : ''
          }
          ${
            params.socialLinks
              ? `<tr><td style="padding: 4px 0; color: #166534; font-weight: 600;">Social Media:</td><td style="padding: 4px 0; color: #14532d;">${params.socialLinks}</td></tr>`
              : ''
          }
          ${
            params.promotionMethod
              ? `<tr><td style="padding: 4px 0; color: #166534; font-weight: 600;">Promotion Method:</td><td style="padding: 4px 0; color: #14532d;">${params.promotionMethod}</td></tr>`
              : ''
          }
          ${
            params.notes
              ? `<tr><td style="padding: 4px 0; color: #166534; font-weight: 600; vertical-align: top;">Notes:</td><td style="padding: 4px 0; color: #14532d;">${params.notes}</td></tr>`
              : ''
          }
        </table>
      </div>
      `
          : ''
      }

      <!-- Admin CTA Button -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${adminLink}" style="display: inline-block; background: #1e3b8a; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(30, 59, 138, 0.25);">
          View in Admin OS →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0;">This is an automated administrative alert sent to ${PRIMARY_ADMIN_EMAIL}.</p>
      <p style="margin: 4px 0 0;">© 2026 Brandy. All rights reserved.</p>
    </div>

  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Sends an email notification to mazenhegazy6@gmail.com and creates in-app notifications for Admins
 * whenever a new customer, seller, or affiliate registers.
 */
export async function notifyAdminNewRegistration(
  params: NewRegistrationNotificationParams
): Promise<void> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brandyy.shop';
    const { subject, html } = generateAdminRegistrationEmailHtml(params, appUrl);

    // List of admin recipient emails
    const recipientEmails = new Set<string>([PRIMARY_ADMIN_EMAIL]);

    // Also check if custom notification email is configured in admin settings
    try {
      const customAdminEmail = await getSetting<string>('ADMIN_NOTIFICATION_EMAIL').catch(() => '');
      if (customAdminEmail && customAdminEmail.includes('@')) {
        recipientEmails.add(customAdminEmail.trim().toLowerCase());
      }
    } catch {
      /* ignore */
    }

    // 1. Send Email Notification to mazenhegazy6@gmail.com (and any secondary admin)
    const emailPromises = Array.from(recipientEmails).map(to =>
      sendEmail({
        to,
        subject,
        html,
      }).catch(err => {
        console.error(`[admin-registration-alerts] Failed to send email to ${to}:`, err);
      })
    );

    // 2. Create in-app system notification for Admin users in DB
    const adminNotificationPromise = (async () => {
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN', deletedAt: null },
          select: { id: true },
        });

        if (adminUsers.length > 0) {
          const adminIds = adminUsers.map(a => a.id);
          const notificationTitle =
            params.type === 'SELLER'
              ? `New Seller Registration: ${params.storeName || params.name}`
              : params.type === 'AFFILIATE'
                ? `New Affiliate Application: ${params.name}`
                : `New Customer Registered: ${params.name}`;

          const notificationMsg = `${params.name} (${params.email}) has registered as ${params.role || params.type}.`;
          const notificationLink =
            params.type === 'SELLER'
              ? '/admin-os?tab=sellers'
              : params.type === 'AFFILIATE'
                ? '/admin-os?tab=affiliates'
                : '/admin-os?tab=users';

          await notifyMultiple(adminIds, {
            title: notificationTitle,
            message: notificationMsg,
            link: notificationLink,
            save: true,
          });
        }
      } catch (dbErr) {
        console.error('[admin-registration-alerts] Failed to create in-app notification:', dbErr);
      }
    })();

    // Run both email and in-app notifications concurrently
    await Promise.allSettled([...emailPromises, adminNotificationPromise]);
  } catch (err) {
    console.error('[admin-registration-alerts] Error notifying admin of new registration:', err);
  }
}
