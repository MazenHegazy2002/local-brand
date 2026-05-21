// Canonical list of every third-party integration the platform supports.
// The PluginsTab in Admin OS uses this for the catalog (left rail), and
// the `Plugin` Prisma row for per-integration enabled state + secrets.
//
// Anything you add here automatically becomes installable from the admin UI.
// Any new fields per plugin are declared via `fields: PluginField[]`.

export type PluginCategory =
  | 'PAYMENT'
  | 'ANALYTICS'
  | 'CHAT'
  | 'EMAIL'
  | 'STORAGE'
  | 'PUSH'
  | 'SHIPPING'
  | 'SMS'
  | 'ADS'
  | 'OTHER';

export interface PluginField {
  key: string;
  label: string;
  description?: string;
  type: 'text' | 'secret' | 'url' | 'toggle' | 'select';
  required?: boolean;
  choices?: Array<{ value: string; label: string }>;
}

export interface PluginDefinition {
  slug: string;
  name: string;
  category: PluginCategory;
  vendor: string;
  description: string;
  // Public icon URL (or relative /static path).
  icon: string;
  docsUrl?: string;
  // Whether this plugin's secrets/IDs live in env-vars (legacy) or DB.
  // Most integrations support both — DB takes precedence.
  fields: PluginField[];
  // Names of corresponding env-vars (Devin's existing env-driven plugin
  // approach). Used to show "Already configured via environment" hint.
  envVars?: string[];
}

export const PLUGIN_REGISTRY: PluginDefinition[] = [
  // ── PAYMENT ─────────────────────────────────────────────────────────
  {
    slug: 'stripe',
    name: 'Stripe',
    category: 'PAYMENT',
    vendor: 'Stripe Inc.',
    description: 'Card payments via Stripe Checkout + webhooks. Required for international orders.',
    icon: '/plugins/stripe.svg',
    docsUrl: 'https://stripe.com/docs',
    envVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
    fields: [
      { key: 'publishableKey', label: 'Publishable key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret key', type: 'secret', required: true },
      { key: 'webhookSecret', label: 'Webhook signing secret', type: 'secret', required: true },
    ],
  },
  {
    slug: 'paysky',
    name: 'PaySky',
    category: 'PAYMENT',
    vendor: 'PaySky Egypt',
    description:
      'Egyptian card processor with 3DS + tokenization. Lower FX cost than Stripe for EGP.',
    icon: '/plugins/paysky.svg',
    envVars: ['PAYSKY_MERCHANT_ID', 'PAYSKY_TERMINAL_ID', 'PAYSKY_MERCHANT_SECRET'],
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'terminalId', label: 'Terminal ID', type: 'text', required: true },
      { key: 'merchantSecret', label: 'Merchant secret', type: 'secret', required: true },
    ],
  },
  {
    slug: 'paymob',
    name: 'Paymob',
    category: 'PAYMENT',
    vendor: 'Paymob',
    description: 'Cards + mobile wallet (Vodafone Cash, Orange Money) for the MENA region.',
    icon: '/plugins/paymob.svg',
    envVars: ['PAYMOB_API_KEY', 'PAYMOB_INTEGRATION_ID', 'PAYMOB_HMAC_SECRET'],
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'integrationId', label: 'Integration ID', type: 'text', required: true },
      { key: 'hmacSecret', label: 'HMAC secret', type: 'secret', required: true },
    ],
  },
  {
    slug: 'fawry',
    name: 'Fawry',
    category: 'PAYMENT',
    vendor: 'Fawry',
    description: 'Cash payment via Fawry retail kiosks (50,000+ across Egypt).',
    icon: '/plugins/fawry.svg',
    envVars: ['FAWRY_MERCHANT_CODE', 'FAWRY_SECURITY_KEY'],
    fields: [
      { key: 'merchantCode', label: 'Merchant code', type: 'text', required: true },
      { key: 'securityKey', label: 'Security key', type: 'secret', required: true },
    ],
  },

  // ── ANALYTICS ───────────────────────────────────────────────────────
  {
    slug: 'ga4',
    name: 'Google Analytics 4',
    category: 'ANALYTICS',
    vendor: 'Google',
    description: 'Page views, conversions, e-commerce events. Free tier covers most stores.',
    icon: '/plugins/ga.svg',
    envVars: ['NEXT_PUBLIC_GA_ID'],
    fields: [
      {
        key: 'measurementId',
        label: 'Measurement ID',
        type: 'text',
        required: true,
        description: 'Format: G-XXXXXXXXXX',
      },
    ],
  },
  {
    slug: 'gtm',
    name: 'Google Tag Manager',
    category: 'ANALYTICS',
    vendor: 'Google',
    description:
      'Umbrella tag manager. Use this if you have multiple trackers — saves CSP changes.',
    icon: '/plugins/gtm.svg',
    envVars: ['NEXT_PUBLIC_GTM_ID'],
    fields: [
      {
        key: 'containerId',
        label: 'Container ID',
        type: 'text',
        required: true,
        description: 'Format: GTM-XXXXXXX',
      },
    ],
  },
  {
    slug: 'meta-pixel',
    name: 'Meta (Facebook) Pixel',
    category: 'ADS',
    vendor: 'Meta',
    description: 'Facebook + Instagram ad tracking, conversions API for retargeting.',
    icon: '/plugins/meta.svg',
    envVars: ['NEXT_PUBLIC_META_PIXEL_ID'],
    fields: [{ key: 'pixelId', label: 'Pixel ID', type: 'text', required: true }],
  },
  {
    slug: 'tiktok-pixel',
    name: 'TikTok Pixel',
    category: 'ADS',
    vendor: 'TikTok',
    description: 'TikTok ad attribution + conversion tracking.',
    icon: '/plugins/tiktok.svg',
    fields: [{ key: 'pixelId', label: 'Pixel ID', type: 'text', required: true }],
  },
  {
    slug: 'snapchat-pixel',
    name: 'Snapchat Pixel',
    category: 'ADS',
    vendor: 'Snap Inc.',
    description: 'Snap ads tracking and audience building.',
    icon: '/plugins/snap.svg',
    fields: [{ key: 'pixelId', label: 'Pixel ID', type: 'text', required: true }],
  },
  {
    slug: 'hotjar',
    name: 'Hotjar',
    category: 'ANALYTICS',
    vendor: 'Hotjar',
    description: 'Session replay, heatmaps, user feedback polls.',
    icon: '/plugins/hotjar.svg',
    envVars: ['NEXT_PUBLIC_HOTJAR_ID'],
    fields: [{ key: 'siteId', label: 'Site ID', type: 'text', required: true }],
  },
  {
    slug: 'mixpanel',
    name: 'Mixpanel',
    category: 'ANALYTICS',
    vendor: 'Mixpanel',
    description: 'Product analytics — funnels, retention, cohort analysis.',
    icon: '/plugins/mixpanel.svg',
    fields: [{ key: 'projectToken', label: 'Project token', type: 'secret', required: true }],
  },
  {
    slug: 'sentry',
    name: 'Sentry',
    category: 'OTHER',
    vendor: 'Sentry',
    description: 'Error monitoring + performance traces.',
    icon: '/plugins/sentry.svg',
    fields: [{ key: 'dsn', label: 'DSN', type: 'secret', required: true }],
  },

  // ── CHAT ────────────────────────────────────────────────────────────
  {
    slug: 'crisp',
    name: 'Crisp',
    category: 'CHAT',
    vendor: 'Crisp',
    description: 'Live chat widget with mobile app, knowledge base, and email follow-up.',
    icon: '/plugins/crisp.svg',
    envVars: ['NEXT_PUBLIC_CRISP_WEBSITE_ID'],
    fields: [{ key: 'websiteId', label: 'Website ID', type: 'text', required: true }],
  },
  {
    slug: 'tawk',
    name: 'Tawk.to',
    category: 'CHAT',
    vendor: 'Tawk',
    description: 'Free unlimited live chat. Lighter alternative to Intercom.',
    icon: '/plugins/tawk.svg',
    envVars: ['NEXT_PUBLIC_TAWK_PROPERTY_ID', 'NEXT_PUBLIC_TAWK_WIDGET_ID'],
    fields: [
      { key: 'propertyId', label: 'Property ID', type: 'text', required: true },
      { key: 'widgetId', label: 'Widget ID', type: 'text', required: true },
    ],
  },
  {
    slug: 'whatsapp-business',
    name: 'WhatsApp Business',
    category: 'CHAT',
    vendor: 'Meta',
    description: 'Click-to-chat WhatsApp button on every product/order page.',
    icon: '/plugins/whatsapp.svg',
    fields: [
      {
        key: 'phoneE164',
        label: 'Phone (E.164)',
        type: 'text',
        required: true,
        description: 'e.g. +201234567890',
      },
      { key: 'defaultMessage', label: 'Default message', type: 'text' },
    ],
  },

  // ── EMAIL ───────────────────────────────────────────────────────────
  {
    slug: 'resend',
    name: 'Resend',
    category: 'EMAIL',
    vendor: 'Resend',
    description: 'Transactional email API. Reliable + cheap, great for confirmations.',
    icon: '/plugins/resend.svg',
    envVars: ['RESEND_API_KEY'],
    fields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  },
  {
    slug: 'sendgrid',
    name: 'SendGrid',
    category: 'EMAIL',
    vendor: 'Twilio',
    description: 'Transactional + marketing email at scale. Alternative to Resend.',
    icon: '/plugins/sendgrid.svg',
    fields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  },
  {
    slug: 'mailchimp',
    name: 'Mailchimp',
    category: 'EMAIL',
    vendor: 'Intuit',
    description: 'Newsletter + automation. Sync customers to a list, drip campaigns.',
    icon: '/plugins/mailchimp.svg',
    fields: [
      { key: 'apiKey', label: 'API key', type: 'secret', required: true },
      { key: 'audienceId', label: 'Audience ID', type: 'text' },
    ],
  },
  {
    slug: 'klaviyo',
    name: 'Klaviyo',
    category: 'EMAIL',
    vendor: 'Klaviyo',
    description: 'E-commerce email + SMS automation. Great for abandoned-cart flows.',
    icon: '/plugins/klaviyo.svg',
    fields: [
      { key: 'publicKey', label: 'Public API key', type: 'text', required: true },
      { key: 'privateKey', label: 'Private API key', type: 'secret', required: true },
    ],
  },

  // ── STORAGE ─────────────────────────────────────────────────────────
  {
    slug: 'vercel-blob',
    name: 'Vercel Blob',
    category: 'STORAGE',
    vendor: 'Vercel',
    description: 'Image hosting with global CDN. Default upload target.',
    icon: '/plugins/vercel.svg',
    envVars: ['BLOB_READ_WRITE_TOKEN'],
    fields: [{ key: 'token', label: 'Read/write token', type: 'secret', required: true }],
  },
  {
    slug: 'cloudinary',
    name: 'Cloudinary',
    category: 'STORAGE',
    vendor: 'Cloudinary',
    description: 'Image hosting + transformations + AI cropping.',
    icon: '/plugins/cloudinary.svg',
    envVars: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    fields: [
      { key: 'cloudName', label: 'Cloud name', type: 'text', required: true },
      { key: 'apiKey', label: 'API key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API secret', type: 'secret', required: true },
    ],
  },
  {
    slug: 's3',
    name: 'AWS S3',
    category: 'STORAGE',
    vendor: 'Amazon',
    description: 'S3-compatible storage (Wasabi, R2, MinIO all supported).',
    icon: '/plugins/aws.svg',
    fields: [
      { key: 'accessKeyId', label: 'Access key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret access key', type: 'secret', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
      { key: 'bucket', label: 'Bucket name', type: 'text', required: true },
      { key: 'endpoint', label: 'Custom endpoint', type: 'url' },
    ],
  },

  // ── PUSH ────────────────────────────────────────────────────────────
  {
    slug: 'web-push',
    name: 'Web Push',
    category: 'PUSH',
    vendor: 'Built-in',
    description: 'Browser push notifications (Chrome, Firefox, Safari iOS 16+).',
    icon: '/plugins/push.svg',
    envVars: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    fields: [
      { key: 'vapidPublicKey', label: 'VAPID public key', type: 'text', required: true },
      { key: 'vapidPrivateKey', label: 'VAPID private key', type: 'secret', required: true },
    ],
  },
  {
    slug: 'onesignal',
    name: 'OneSignal',
    category: 'PUSH',
    vendor: 'OneSignal',
    description: 'Web + mobile push from one dashboard. Free tier up to 10k subscribers.',
    icon: '/plugins/onesignal.svg',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'restApiKey', label: 'REST API key', type: 'secret', required: true },
    ],
  },

  // ── SMS ─────────────────────────────────────────────────────────────
  {
    slug: 'twilio',
    name: 'Twilio',
    category: 'SMS',
    vendor: 'Twilio',
    description: 'SMS + WhatsApp delivery API. Global coverage.',
    icon: '/plugins/twilio.svg',
    fields: [
      { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth token', type: 'secret', required: true },
      { key: 'fromNumber', label: 'From number', type: 'text', required: true },
    ],
  },
  {
    slug: 'unifonic',
    name: 'Unifonic',
    category: 'SMS',
    vendor: 'Unifonic',
    description: 'Egypt-focused SMS gateway with sender-ID approval.',
    icon: '/plugins/unifonic.svg',
    fields: [
      { key: 'appSid', label: 'App SID', type: 'text', required: true },
      { key: 'senderId', label: 'Sender ID', type: 'text', required: true },
    ],
  },

  // ── SHIPPING ────────────────────────────────────────────────────────
  {
    slug: 'aramex',
    name: 'Aramex',
    category: 'SHIPPING',
    vendor: 'Aramex',
    description: 'Auto-create AWBs + tracking events.',
    icon: '/plugins/aramex.svg',
    fields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'secret', required: true },
      { key: 'accountNumber', label: 'Account number', type: 'text', required: true },
    ],
  },
  {
    slug: 'bosta',
    name: 'Bosta',
    category: 'SHIPPING',
    vendor: 'Bosta',
    description: 'Egyptian last-mile delivery. AWB API + COD remittance.',
    icon: '/plugins/bosta.svg',
    fields: [{ key: 'apiKey', label: 'API key', type: 'secret', required: true }],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────
export function getPlugin(slug: string): PluginDefinition | undefined {
  return PLUGIN_REGISTRY.find(p => p.slug === slug);
}

export function getPluginsByCategory(cat: PluginCategory): PluginDefinition[] {
  return PLUGIN_REGISTRY.filter(p => p.category === cat);
}

export const PLUGIN_CATEGORIES: Array<{
  slug: PluginCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    slug: 'PAYMENT',
    label: 'Payments',
    icon: '💳',
    description: 'Card processors and cash networks',
  },
  { slug: 'SHIPPING', label: 'Shipping', icon: '🚚', description: 'Couriers and AWB creation' },
  {
    slug: 'ANALYTICS',
    label: 'Analytics',
    icon: '📊',
    description: 'Page views, conversions, session replay',
  },
  {
    slug: 'ADS',
    label: 'Ads & pixels',
    icon: '🎯',
    description: 'Tracking pixels for ad platforms',
  },
  { slug: 'CHAT', label: 'Live chat', icon: '💬', description: 'Customer chat widgets' },
  { slug: 'EMAIL', label: 'Email', icon: '📧', description: 'Transactional + marketing email' },
  { slug: 'SMS', label: 'SMS', icon: '📱', description: 'SMS + WhatsApp gateways' },
  { slug: 'PUSH', label: 'Push', icon: '🔔', description: 'Web and mobile push' },
  { slug: 'STORAGE', label: 'Storage', icon: '🗄️', description: 'Image and asset hosting' },
  { slug: 'OTHER', label: 'Other', icon: '🧩', description: 'Error tracking, search, etc.' },
];
