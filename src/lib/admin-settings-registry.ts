// ============================================================================
// Admin Settings Registry — single source of truth for everything the admin
// can toggle, edit, or configure. The Settings tab in Admin OS auto-renders
// from this catalog, the validation runs from this catalog, and the
// `getSetting()` / `setSetting()` helpers respect the types declared here.
//
// To add a new controllable value:
//   1. Add a row below in the right category.
//   2. Run `npm run typecheck` — if you typo the key elsewhere, TS will flag.
//   3. (Optional) seed a default by adding it to `prisma/seed.ts`.
//
// The catalog ALONE doesn't write rows. Settings live in the SystemSettings
// table; if a key is asked for and not found, we fall back to `defaultValue`
// here. This means new settings ship with sensible defaults the moment a
// build deploys, even before the admin opens the panel.
// ============================================================================

import { prisma } from './prisma';

export type SettingType =
  | 'toggle' // boolean
  | 'text' // free-text string
  | 'number' // numeric (int or float, no distinction here — schema decides)
  | 'select' // string with explicit choices
  | 'url' // string but rendered as URL input + validated
  | 'secret' // string, masked in UI, encrypted at rest if BANK_ACCOUNT_SECRET set
  | 'json' // arbitrary JSON blob (object or array)
  | 'color' // hex / hsl color
  | 'longtext'; // textarea

export type SettingCategory =
  | 'store'
  | 'contact'
  | 'social'
  | 'tax'
  | 'shipping'
  | 'payment'
  | 'plugins'
  | 'email'
  | 'reviews'
  | 'loyalty'
  | 'cart'
  | 'orders'
  | 'security'
  | 'seo'
  | 'maintenance';

export interface SettingDefinition<T = unknown> {
  key: string;
  category: SettingCategory;
  type: SettingType;
  label: string;
  labelAr?: string;
  description?: string;
  defaultValue: T;
  // Only for `select` type — the dropdown choices.
  choices?: Array<{ value: string; label: string }>;
  // Optional client-side validators (regex for text, [min, max] for numbers).
  pattern?: string;
  range?: [number, number];
  // Free-form group within a category (renders as a sub-card in the UI).
  group?: string;
  // If true, hide the value behind a "show" toggle in the UI (passwords,
  // API keys). Implies the value will never be logged or echoed back.
  sensitive?: boolean;
  // Whether this setting's value belongs in the public window.__BRAND
  // bootstrap. Keep this conservative — anything sensitive must NEVER be
  // shipped to the browser.
  exposeToClient?: boolean;
}

// ─── Categories metadata (rendered as the left-side tree in Settings) ─────
export const SETTING_CATEGORIES: Array<{
  slug: SettingCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    slug: 'store',
    label: 'Store / Brand',
    icon: '🏪',
    description: 'Store name, logo, colors, fonts',
  },
  {
    slug: 'contact',
    label: 'Contact / Legal',
    icon: '📇',
    description: 'Contact email/phone, tax registration, legal entity',
  },
  {
    slug: 'social',
    label: 'Social Links',
    icon: '🔗',
    description: 'Facebook, Instagram, TikTok, Twitter, YouTube, LinkedIn',
  },
  {
    slug: 'tax',
    label: 'Tax',
    icon: '💵',
    description: 'VAT rate, label, inclusive/exclusive pricing',
  },
  {
    slug: 'shipping',
    label: 'Shipping',
    icon: '🚚',
    description: 'Per-governorate rates, free-shipping threshold, couriers',
  },
  {
    slug: 'payment',
    label: 'Payment Methods',
    icon: '💳',
    description: 'COD, Stripe, PaySky, Paymob, Fawry, wallet — turn each on/off',
  },
  {
    slug: 'plugins',
    label: 'Plugins / Tracking',
    icon: '🧩',
    description: 'GA4, GTM, Pixel, Crisp, Tawk, Hotjar, Sentry — third-party IDs',
  },
  {
    slug: 'email',
    label: 'Email & SMS',
    icon: '📧',
    description: 'Provider, sender identity, transactional toggles, SMS provider',
  },
  {
    slug: 'reviews',
    label: 'Reviews & Q&A',
    icon: '⭐',
    description: 'Auto-publish, moderation queue, blocked words',
  },
  {
    slug: 'loyalty',
    label: 'Loyalty / Rewards',
    icon: '🏆',
    description: 'Points per EGP, redemption rate, signup/birthday bonuses',
  },
  {
    slug: 'cart',
    label: 'Cart / Checkout',
    icon: '🛒',
    description: 'Guest checkout, abandoned-cart, max items, qty caps',
  },
  {
    slug: 'orders',
    label: 'Orders / Returns',
    icon: '📦',
    description: 'Auto-confirm, cancel/return windows, escrow days, commission',
  },
  {
    slug: 'security',
    label: 'Security / Privacy',
    icon: '🔐',
    description: 'Rate limits, login lockout, 2FA, GDPR banner, password policy',
  },
  {
    slug: 'seo',
    label: 'SEO / Indexing',
    icon: '🔍',
    description: 'Robots, default meta, sitemap, canonical domain',
  },
  {
    slug: 'maintenance',
    label: 'Maintenance',
    icon: '🛠️',
    description: 'Maintenance mode, read-only mode, feature flags',
  },
];

// ============================================================================
// THE CATALOG
// ============================================================================
// Every controllable platform value lives here, period. The Settings tab in
// Admin OS auto-generates form fields from this list.
// ============================================================================
export const SETTINGS_REGISTRY: SettingDefinition[] = [
  // ── 1. Store / Brand ─────────────────────────────────────────────────────
  {
    key: 'STORE_NAME',
    category: 'store',
    type: 'text',
    label: 'Store name',
    defaultValue: 'Brandy',
    exposeToClient: true,
    description: 'Used in browser tab, emails, and the navbar logo wordmark.',
  },
  {
    key: 'STORE_TAGLINE',
    category: 'store',
    type: 'text',
    label: 'Tagline',
    defaultValue: 'Egyptian fashion marketplace',
    exposeToClient: true,
  },
  {
    key: 'STORE_LOGO_URL',
    category: 'store',
    type: 'url',
    label: 'Logo URL (light)',
    defaultValue: '',
    exposeToClient: true,
    description: 'Shown on light backgrounds (navbar, white headers).',
  },
  {
    key: 'STORE_LOGO_DARK_URL',
    category: 'store',
    type: 'url',
    label: 'Logo URL (dark)',
    defaultValue: '',
    exposeToClient: true,
    description: 'Shown on dark/photo backgrounds (footer, hero overlays).',
  },
  {
    key: 'FAVICON_URL',
    category: 'store',
    type: 'url',
    label: 'Favicon URL',
    defaultValue: '/favicon.ico',
    exposeToClient: true,
  },
  {
    key: 'OG_IMAGE_URL',
    category: 'store',
    type: 'url',
    label: 'Default Open Graph image',
    defaultValue: '',
    description: 'Used when sharing pages on social — 1200×630 recommended.',
  },
  {
    key: 'STORE_DESCRIPTION',
    category: 'store',
    type: 'longtext',
    label: 'Default meta description',
    defaultValue: '',
    description: '155-character summary shown in Google search results.',
  },
  {
    key: 'STORE_KEYWORDS',
    category: 'store',
    type: 'text',
    label: 'Default meta keywords',
    defaultValue: 'egypt, fashion, marketplace, brands',
  },
  {
    key: 'BRAND_PRIMARY_COLOR',
    category: 'store',
    type: 'color',
    label: 'Primary color',
    defaultValue: '#534AB7',
    exposeToClient: true,
    group: 'Theme',
    description: 'CTAs, links, primary buttons.',
  },
  {
    key: 'BRAND_ACCENT_COLOR',
    category: 'store',
    type: 'color',
    label: 'Accent color',
    defaultValue: '#7F77DD',
    exposeToClient: true,
    group: 'Theme',
  },
  {
    key: 'BRAND_FONT_FAMILY',
    category: 'store',
    type: 'select',
    label: 'Font family',
    defaultValue: 'Cairo',
    exposeToClient: true,
    group: 'Theme',
    choices: [
      { value: 'Cairo', label: 'Cairo (Arabic-first)' },
      { value: 'Inter', label: 'Inter (Latin)' },
      { value: 'Geist', label: 'Geist (mono)' },
      { value: 'system', label: 'System default' },
    ],
  },
  {
    key: 'BRAND_RADIUS',
    category: 'store',
    type: 'number',
    label: 'Border radius (px)',
    defaultValue: 8,
    exposeToClient: true,
    group: 'Theme',
    range: [0, 32],
  },
  {
    key: 'STORE_CURRENCY',
    category: 'store',
    type: 'select',
    label: 'Base currency',
    defaultValue: 'EGP',
    exposeToClient: true,
    choices: [
      { value: 'EGP', label: 'Egyptian Pound (EGP)' },
      { value: 'USD', label: 'US Dollar (USD)' },
      { value: 'EUR', label: 'Euro (EUR)' },
      { value: 'SAR', label: 'Saudi Riyal (SAR)' },
      { value: 'AED', label: 'UAE Dirham (AED)' },
    ],
  },
  {
    key: 'HOMEPAGE_BEST_SELLERS_CAT',
    category: 'store',
    type: 'text',
    label: 'Best Sellers Category Slug',
    defaultValue: '',
    exposeToClient: true,
    group: 'Homepage Categories',
    description:
      'The category slug whose products will be displayed in the Bestsellers section on the homepage. Leave empty to use featured products.',
  },
  {
    key: 'HOMEPAGE_NEW_ARRIVALS_CAT',
    category: 'store',
    type: 'text',
    label: 'New Arrivals Category Slug',
    defaultValue: '',
    exposeToClient: true,
    group: 'Homepage Categories',
    description:
      'The category slug whose products will be displayed in the New Arrivals section. Leave empty to use recent products.',
  },
  {
    key: 'HOMEPAGE_RECOMMENDED_CAT',
    category: 'store',
    type: 'text',
    label: 'Recommended Category Slug',
    defaultValue: '',
    exposeToClient: true,
    group: 'Homepage Categories',
    description:
      'The category slug whose products will be displayed in the Recommended section. Leave empty to use mixed products.',
  },

  // ── 2. Contact / Legal ──────────────────────────────────────────────────
  {
    key: 'CONTACT_EMAIL',
    category: 'contact',
    type: 'text',
    label: 'Public contact email',
    defaultValue: 'support@brandy.com',
    exposeToClient: true,
  },
  {
    key: 'CONTACT_PHONE',
    category: 'contact',
    type: 'text',
    label: 'Public contact phone',
    defaultValue: '+201234567890',
    exposeToClient: true,
  },
  {
    key: 'CONTACT_WHATSAPP',
    category: 'contact',
    type: 'text',
    label: 'WhatsApp number',
    defaultValue: '',
    exposeToClient: true,
    description: 'If set, footer shows a green WhatsApp button.',
  },
  {
    key: 'BUSINESS_ADDRESS',
    category: 'contact',
    type: 'longtext',
    label: 'Business address',
    defaultValue: '',
    exposeToClient: true,
    description: 'Shown in invoices and the public Contact page.',
  },
  {
    key: 'TAX_REGISTRATION_NUMBER',
    category: 'contact',
    type: 'text',
    label: 'Tax registration number',
    defaultValue: '',
    description: 'Egyptian ETA tax registration; required on legal invoices.',
  },
  {
    key: 'COMMERCIAL_REGISTER_NO',
    category: 'contact',
    type: 'text',
    label: 'Commercial register number',
    defaultValue: '',
    description: 'السجل التجاري',
  },
  {
    key: 'LEGAL_ENTITY_NAME',
    category: 'contact',
    type: 'text',
    label: 'Legal entity name',
    defaultValue: '',
    description: 'Printed on invoices.',
  },

  // ── 3. Social ───────────────────────────────────────────────────────────
  {
    key: 'SOCIAL_FACEBOOK',
    category: 'social',
    type: 'url',
    label: 'Facebook URL',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SOCIAL_INSTAGRAM',
    category: 'social',
    type: 'url',
    label: 'Instagram URL',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SOCIAL_TIKTOK',
    category: 'social',
    type: 'url',
    label: 'TikTok URL',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SOCIAL_TWITTER',
    category: 'social',
    type: 'url',
    label: 'Twitter / X',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SOCIAL_YOUTUBE',
    category: 'social',
    type: 'url',
    label: 'YouTube URL',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SOCIAL_LINKEDIN',
    category: 'social',
    type: 'url',
    label: 'LinkedIn URL',
    defaultValue: '',
    exposeToClient: true,
  },

  // ── 4. Tax ──────────────────────────────────────────────────────────────
  {
    key: 'VAT_ENABLED',
    category: 'tax',
    type: 'toggle',
    label: 'Charge VAT',
    defaultValue: true,
    description: 'Master switch; turn off for tax-free testing.',
  },
  {
    key: 'VAT_RATE',
    category: 'tax',
    type: 'number',
    label: 'VAT rate (decimal)',
    defaultValue: 0.14,
    range: [0, 1],
    description: 'e.g. 0.14 for 14%.',
  },
  {
    key: 'VAT_LABEL',
    category: 'tax',
    type: 'text',
    label: 'VAT label (English)',
    defaultValue: 'VAT',
  },
  {
    key: 'VAT_LABEL_AR',
    category: 'tax',
    type: 'text',
    label: 'VAT label (Arabic)',
    defaultValue: 'ضريبة القيمة المضافة',
  },
  {
    key: 'VAT_INCLUSIVE',
    category: 'tax',
    type: 'toggle',
    label: 'Prices include VAT',
    defaultValue: false,
    description: 'When on, listed prices already include VAT.',
  },

  // ── 5. Shipping ─────────────────────────────────────────────────────────
  {
    key: 'FREE_SHIPPING_ENABLED',
    category: 'shipping',
    type: 'toggle',
    label: 'Offer free shipping above threshold',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'FREE_SHIPPING_THRESHOLD',
    category: 'shipping',
    type: 'number',
    label: 'Free-shipping threshold (EGP)',
    defaultValue: 1000,
    exposeToClient: true,
    range: [0, 100000],
  },
  {
    key: 'DEFAULT_SHIPPING_RATE',
    category: 'shipping',
    type: 'number',
    label: 'Default shipping rate (EGP)',
    defaultValue: 60,
    range: [0, 1000],
    description: "Used when a buyer's governorate isn't mapped.",
  },
  {
    key: 'ALLOWED_COUNTRIES',
    category: 'shipping',
    type: 'text',
    label: 'Allowed countries (comma-sep)',
    defaultValue: 'Egypt',
  },
  {
    key: 'COURIERS_JSON',
    category: 'shipping',
    type: 'json',
    label: 'Couriers (JSON array)',
    defaultValue: ['Aramex', 'Bosta', 'Mylerz', 'DHL', 'Egypt Post'],
  },

  // ── 6. Payment methods ──────────────────────────────────────────────────
  {
    key: 'PAY_COD_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'Cash on Delivery',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'PAY_COD_FEE',
    category: 'payment',
    type: 'number',
    label: 'COD fee (EGP)',
    defaultValue: 0,
    range: [0, 200],
  },
  {
    key: 'PAY_STRIPE_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'Stripe',
    defaultValue: false,
    exposeToClient: true,
    description: 'Requires STRIPE_SECRET_KEY env.',
  },
  {
    key: 'PAY_PAYSKY_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'PaySky',
    defaultValue: false,
    exposeToClient: true,
    description: 'Requires PAYSKY_* env.',
  },
  {
    key: 'PAY_PAYMOB_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'Paymob',
    defaultValue: false,
    exposeToClient: true,
  },
  {
    key: 'PAY_FAWRY_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'Fawry',
    defaultValue: false,
    exposeToClient: true,
  },
  {
    key: 'PAY_WALLET_ENABLED',
    category: 'payment',
    type: 'toggle',
    label: 'Mobile wallet',
    defaultValue: false,
    exposeToClient: true,
    description: 'Vodafone Cash / Orange Money / Etisalat Cash.',
  },
  {
    key: 'MIN_ORDER_AMOUNT',
    category: 'payment',
    type: 'number',
    label: 'Minimum order (EGP)',
    defaultValue: 50,
    range: [0, 10000],
  },
  {
    key: 'MAX_ORDER_AMOUNT',
    category: 'payment',
    type: 'number',
    label: 'Maximum order (EGP)',
    defaultValue: 100000,
    range: [0, 10000000],
  },

  // ── 7. Plugins / tracking ───────────────────────────────────────────────
  {
    key: 'GA_ID',
    category: 'plugins',
    type: 'text',
    label: 'Google Analytics 4 measurement ID',
    defaultValue: '',
    exposeToClient: true,
    description: 'Format: G-XXXXXXXXXX',
  },
  {
    key: 'GTM_ID',
    category: 'plugins',
    type: 'text',
    label: 'Google Tag Manager ID',
    defaultValue: '',
    exposeToClient: true,
    description: 'Format: GTM-XXXXXXX',
  },
  {
    key: 'META_PIXEL_ID',
    category: 'plugins',
    type: 'text',
    label: 'Meta (Facebook) Pixel ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'TIKTOK_PIXEL_ID',
    category: 'plugins',
    type: 'text',
    label: 'TikTok Pixel ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SNAPCHAT_PIXEL_ID',
    category: 'plugins',
    type: 'text',
    label: 'Snapchat Pixel ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'LINKEDIN_INSIGHT_TAG',
    category: 'plugins',
    type: 'text',
    label: 'LinkedIn Insight Tag',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'HOTJAR_ID',
    category: 'plugins',
    type: 'text',
    label: 'Hotjar Site ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'CRISP_WEBSITE_ID',
    category: 'plugins',
    type: 'text',
    label: 'Crisp Website ID',
    defaultValue: '',
    exposeToClient: true,
    description: 'Live chat widget.',
  },
  {
    key: 'TAWK_PROPERTY_ID',
    category: 'plugins',
    type: 'text',
    label: 'Tawk.to Property ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'TAWK_WIDGET_ID',
    category: 'plugins',
    type: 'text',
    label: 'Tawk.to Widget ID',
    defaultValue: '',
    exposeToClient: true,
  },
  {
    key: 'SENTRY_DSN',
    category: 'plugins',
    type: 'secret',
    label: 'Sentry DSN',
    defaultValue: '',
    sensitive: true,
    description: 'Errors are reported to Sentry when this is set.',
  },
  {
    key: 'MIXPANEL_TOKEN',
    category: 'plugins',
    type: 'secret',
    label: 'Mixpanel project token',
    defaultValue: '',
    sensitive: true,
  },
  {
    key: 'MAILCHIMP_API_KEY',
    category: 'plugins',
    type: 'secret',
    label: 'Mailchimp API key',
    defaultValue: '',
    sensitive: true,
  },

  // ── 8. Email / SMS ──────────────────────────────────────────────────────
  {
    key: 'EMAIL_ENABLED',
    category: 'email',
    type: 'toggle',
    label: 'Send transactional emails',
    defaultValue: true,
    description: 'Master kill-switch for ALL outgoing email.',
  },
  {
    key: 'EMAIL_FROM',
    category: 'email',
    type: 'text',
    label: 'From address',
    defaultValue: 'noreply@brandy.com',
  },
  {
    key: 'EMAIL_FROM_NAME',
    category: 'email',
    type: 'text',
    label: 'From name',
    defaultValue: 'Brandy',
  },
  {
    key: 'EMAIL_REPLY_TO',
    category: 'email',
    type: 'text',
    label: 'Reply-To address',
    defaultValue: 'support@brandy.com',
  },
  {
    key: 'EMAIL_PROVIDER',
    category: 'email',
    type: 'select',
    label: 'Email provider',
    defaultValue: 'resend',
    choices: [
      { value: 'resend', label: 'Resend' },
      { value: 'sendgrid', label: 'SendGrid' },
      { value: 'smtp', label: 'Custom SMTP' },
    ],
  },
  {
    key: 'RESEND_API_KEY',
    category: 'email',
    type: 'secret',
    label: 'Resend API key',
    defaultValue: '',
    sensitive: true,
  },
  { key: 'SMTP_HOST', category: 'email', type: 'text', label: 'SMTP host', defaultValue: '' },
  {
    key: 'SMTP_PORT',
    category: 'email',
    type: 'number',
    label: 'SMTP port',
    defaultValue: 587,
    range: [1, 65535],
  },
  { key: 'SMTP_USER', category: 'email', type: 'text', label: 'SMTP username', defaultValue: '' },
  {
    key: 'SMTP_PASS',
    category: 'email',
    type: 'secret',
    label: 'SMTP password',
    defaultValue: '',
    sensitive: true,
  },
  {
    key: 'PUSH_ENABLED',
    category: 'email',
    type: 'toggle',
    label: 'Web Push notifications',
    defaultValue: true,
    group: 'Push & SMS',
  },
  {
    key: 'SMS_ENABLED',
    category: 'email',
    type: 'toggle',
    label: 'Send SMS messages',
    defaultValue: false,
    group: 'Push & SMS',
  },
  {
    key: 'SMS_PROVIDER',
    category: 'email',
    type: 'select',
    label: 'SMS provider',
    defaultValue: 'twilio',
    group: 'Push & SMS',
    choices: [
      { value: 'twilio', label: 'Twilio' },
      { value: 'vonage', label: 'Vonage' },
      { value: 'unifonic', label: 'Unifonic (Egypt)' },
    ],
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    category: 'email',
    type: 'text',
    label: 'Twilio Account SID',
    defaultValue: '',
    group: 'Push & SMS',
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    category: 'email',
    type: 'secret',
    label: 'Twilio Auth Token',
    defaultValue: '',
    sensitive: true,
    group: 'Push & SMS',
  },
  {
    key: 'TWILIO_FROM_NUMBER',
    category: 'email',
    type: 'text',
    label: 'Twilio From number',
    defaultValue: '',
    group: 'Push & SMS',
  },

  // ── 9. Reviews & Q&A ────────────────────────────────────────────────────
  {
    key: 'REVIEWS_ENABLED',
    category: 'reviews',
    type: 'toggle',
    label: 'Allow product reviews',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'REVIEWS_AUTO_PUBLISH',
    category: 'reviews',
    type: 'toggle',
    label: 'Auto-publish reviews',
    defaultValue: true,
    description: 'When off, reviews queue for admin moderation.',
  },
  {
    key: 'REVIEWS_REQUIRE_PURCHASE',
    category: 'reviews',
    type: 'toggle',
    label: 'Only verified buyers can review',
    defaultValue: true,
  },
  {
    key: 'REVIEWS_MIN_LENGTH',
    category: 'reviews',
    type: 'number',
    label: 'Minimum comment length',
    defaultValue: 0,
    range: [0, 200],
  },
  {
    key: 'REVIEWS_MAX_LENGTH',
    category: 'reviews',
    type: 'number',
    label: 'Maximum comment length',
    defaultValue: 2000,
    range: [50, 10000],
  },
  {
    key: 'REVIEWS_BLOCKED_WORDS',
    category: 'reviews',
    type: 'json',
    label: 'Blocked words (JSON array)',
    defaultValue: [] as string[],
    description: 'Reviews containing any of these are auto-flagged for moderation.',
  },
  {
    key: 'QA_ENABLED',
    category: 'reviews',
    type: 'toggle',
    label: 'Enable product Q&A',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'QA_AUTO_PUBLISH',
    category: 'reviews',
    type: 'toggle',
    label: 'Auto-publish answers',
    defaultValue: false,
  },
  {
    key: 'QA_GUEST_QUESTIONS',
    category: 'reviews',
    type: 'toggle',
    label: 'Allow guests to ask questions',
    defaultValue: false,
  },

  // ── 10. Loyalty ─────────────────────────────────────────────────────────
  {
    key: 'LOYALTY_ENABLED',
    category: 'loyalty',
    type: 'toggle',
    label: 'Enable loyalty program',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'LOYALTY_POINTS_PER_EGP',
    category: 'loyalty',
    type: 'number',
    label: 'Points earned per EGP spent',
    defaultValue: 1,
    range: [0, 100],
  },
  {
    key: 'LOYALTY_REDEMPTION_RATE',
    category: 'loyalty',
    type: 'number',
    label: 'Redemption rate (EGP per point)',
    defaultValue: 0.01,
    range: [0, 1],
  },
  {
    key: 'LOYALTY_MIN_REDEEM',
    category: 'loyalty',
    type: 'number',
    label: 'Min points to redeem',
    defaultValue: 100,
    range: [0, 10000],
  },
  {
    key: 'LOYALTY_SIGNUP_BONUS',
    category: 'loyalty',
    type: 'number',
    label: 'Signup bonus (points)',
    defaultValue: 50,
    range: [0, 10000],
  },
  {
    key: 'LOYALTY_REFERRAL_BONUS',
    category: 'loyalty',
    type: 'number',
    label: 'Referral bonus (points)',
    defaultValue: 100,
    range: [0, 10000],
  },
  {
    key: 'LOYALTY_REVIEW_BONUS',
    category: 'loyalty',
    type: 'number',
    label: 'Review bonus (points)',
    defaultValue: 10,
    range: [0, 1000],
  },
  {
    key: 'LOYALTY_BIRTHDAY_BONUS',
    category: 'loyalty',
    type: 'number',
    label: 'Birthday bonus (points)',
    defaultValue: 200,
    range: [0, 10000],
  },

  // ── 11. Cart / Checkout ─────────────────────────────────────────────────
  {
    key: 'CART_GUEST_CHECKOUT',
    category: 'cart',
    type: 'toggle',
    label: 'Allow guest checkout',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'CART_REQUIRE_PHONE',
    category: 'cart',
    type: 'toggle',
    label: 'Require phone number',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'CART_AUTO_SAVE',
    category: 'cart',
    type: 'toggle',
    label: 'Persist guest carts (Redis)',
    defaultValue: true,
  },
  {
    key: 'ABANDONED_CART_EMAIL',
    category: 'cart',
    type: 'toggle',
    label: 'Send abandoned-cart emails',
    defaultValue: true,
  },
  {
    key: 'ABANDONED_CART_DELAY_HOURS',
    category: 'cart',
    type: 'number',
    label: 'Hours to wait before email',
    defaultValue: 24,
    range: [1, 168],
  },
  {
    key: 'MAX_CART_ITEMS',
    category: 'cart',
    type: 'number',
    label: 'Max items in cart',
    defaultValue: 50,
    range: [1, 1000],
  },
  {
    key: 'MAX_QTY_PER_ITEM',
    category: 'cart',
    type: 'number',
    label: 'Max quantity per item',
    defaultValue: 99,
    range: [1, 9999],
  },
  {
    key: 'CART_RESERVATION_MINUTES',
    category: 'cart',
    type: 'number',
    label: 'Stock reservation (minutes)',
    defaultValue: 0,
    range: [0, 1440],
    description: '0 = no reservation (faster checkout).',
  },

  // ── 12. Orders / Returns ────────────────────────────────────────────────
  {
    key: 'ORDER_AUTO_CONFIRM',
    category: 'orders',
    type: 'toggle',
    label: 'Auto-confirm new orders',
    defaultValue: false,
  },
  {
    key: 'ORDER_CANCEL_WINDOW_HOURS',
    category: 'orders',
    type: 'number',
    label: 'Buyer cancel window (hours)',
    defaultValue: 24,
    range: [0, 720],
  },
  {
    key: 'RETURN_WINDOW_DAYS',
    category: 'orders',
    type: 'number',
    label: 'Return window (days post-delivery)',
    defaultValue: 14,
    range: [0, 90],
  },
  {
    key: 'RETURN_RESTOCK_FEE',
    category: 'orders',
    type: 'number',
    label: 'Restock fee (% of refund)',
    defaultValue: 0,
    range: [0, 50],
  },
  {
    key: 'RETURN_REQUIRES_PHOTO',
    category: 'orders',
    type: 'toggle',
    label: 'Require photo on RMA',
    defaultValue: true,
  },
  {
    key: 'ESCROW_DAYS',
    category: 'orders',
    type: 'number',
    label: 'Seller escrow hold (days)',
    defaultValue: 14,
    range: [0, 60],
  },
  {
    key: 'DEFAULT_COMMISSION_RATE',
    category: 'orders',
    type: 'number',
    label: 'Default platform commission (decimal)',
    defaultValue: 0.15,
    range: [0, 1],
  },

  // ── 13. Security / Privacy ──────────────────────────────────────────────
  {
    key: 'TWO_FACTOR_ENABLED',
    category: 'security',
    type: 'toggle',
    label: 'Require 2FA for admin/sellers',
    defaultValue: false,
  },
  {
    key: 'FORCE_HTTPS',
    category: 'security',
    type: 'toggle',
    label: 'Force HTTPS',
    defaultValue: true,
  },
  {
    key: 'RATE_LIMIT_WINDOW_MIN',
    category: 'security',
    type: 'number',
    label: 'Rate-limit window (minutes)',
    defaultValue: 1,
    range: [1, 60],
  },
  {
    key: 'RATE_LIMIT_MAX_REQ',
    category: 'security',
    type: 'number',
    label: 'Max requests per window',
    defaultValue: 60,
    range: [1, 10000],
  },
  {
    key: 'LOGIN_ATTEMPT_LIMIT',
    category: 'security',
    type: 'number',
    label: 'Login attempts before lockout',
    defaultValue: 5,
    range: [1, 100],
  },
  {
    key: 'LOGIN_LOCKOUT_MIN',
    category: 'security',
    type: 'number',
    label: 'Lockout duration (minutes)',
    defaultValue: 15,
    range: [1, 1440],
  },
  {
    key: 'PASSWORD_MIN_LENGTH',
    category: 'security',
    type: 'number',
    label: 'Min password length',
    defaultValue: 8,
    range: [6, 64],
  },
  {
    key: 'SESSION_TIMEOUT_MIN',
    category: 'security',
    type: 'number',
    label: 'Session timeout (minutes)',
    defaultValue: 1440,
    range: [5, 10080],
  },
  {
    key: 'ALLOW_GUEST_ORDERS',
    category: 'security',
    type: 'toggle',
    label: 'Allow guest orders',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'GDPR_BANNER',
    category: 'security',
    type: 'toggle',
    label: 'Show cookie consent banner',
    defaultValue: true,
    exposeToClient: true,
  },
  {
    key: 'GDPR_PRIVACY_URL',
    category: 'security',
    type: 'text',
    label: 'Privacy policy URL',
    defaultValue: '/privacy',
    exposeToClient: true,
  },

  // ── 14. SEO ─────────────────────────────────────────────────────────────
  {
    key: 'SEO_INDEXING',
    category: 'seo',
    type: 'toggle',
    label: 'Allow search engines to index',
    defaultValue: true,
    description: 'Off = robots noindex,nofollow on every page.',
  },
  {
    key: 'SEO_DEFAULT_TITLE',
    category: 'seo',
    type: 'text',
    label: 'Default page title',
    defaultValue: 'Brandy — Egyptian Marketplace',
  },
  {
    key: 'SEO_DEFAULT_DESCRIPTION',
    category: 'seo',
    type: 'longtext',
    label: 'Default meta description',
    defaultValue: '',
  },
  {
    key: 'SEO_DEFAULT_OG_IMAGE',
    category: 'seo',
    type: 'url',
    label: 'Default OG image URL',
    defaultValue: '',
  },
  {
    key: 'SITEMAP_ENABLED',
    category: 'seo',
    type: 'toggle',
    label: 'Generate /sitemap.xml',
    defaultValue: true,
  },
  {
    key: 'ROBOTS_TXT',
    category: 'seo',
    type: 'longtext',
    label: 'Custom robots.txt (optional)',
    defaultValue: '',
  },
  {
    key: 'CANONICAL_DOMAIN',
    category: 'seo',
    type: 'url',
    label: 'Canonical domain',
    defaultValue: 'https://brandy.com',
  },

  // ── 15. Maintenance ─────────────────────────────────────────────────────
  {
    key: 'MAINTENANCE_MODE',
    category: 'maintenance',
    type: 'toggle',
    label: 'Maintenance mode',
    defaultValue: false,
    description: 'Site shows a "we\'ll be back" page to non-admins.',
  },
  {
    key: 'MAINTENANCE_MESSAGE',
    category: 'maintenance',
    type: 'longtext',
    label: 'Maintenance message',
    defaultValue: "We're making the site even better. Back in a few minutes.",
  },
  {
    key: 'MAINTENANCE_ALLOW_ADMIN',
    category: 'maintenance',
    type: 'toggle',
    label: 'Admins can still access',
    defaultValue: true,
  },
  {
    key: 'READ_ONLY_MODE',
    category: 'maintenance',
    type: 'toggle',
    label: 'Read-only mode (browse but no checkout)',
    defaultValue: false,
  },
  {
    key: 'FEATURE_FLAGS_JSON',
    category: 'maintenance',
    type: 'json',
    label: 'Feature flags',
    defaultValue: {} as Record<string, boolean>,
    description: 'Per-feature kill switches consumed by `isFeatureEnabled()`.',
  },
];

// ============================================================================
// Public API
// ============================================================================

/** Quick lookup by key — typed, throws if the key isn't registered. */
export function getDefinition(key: string): SettingDefinition {
  const def = SETTINGS_REGISTRY.find(s => s.key === key);
  if (!def) throw new Error(`[admin-settings] Unknown setting key: ${key}`);
  return def;
}

/** Filter for the UI's left-side category nav. */
export function getSettingsByCategory(cat: SettingCategory): SettingDefinition[] {
  return SETTINGS_REGISTRY.filter(s => s.category === cat);
}

/** Subset that's safe to ship to the browser via window.__BRAND boot data. */
export function getClientExposedKeys(): string[] {
  return SETTINGS_REGISTRY.filter(s => s.exposeToClient).map(s => s.key);
}

/**
 * Coerce a serialized SystemSettings.value (always a string) into the typed
 * value declared in the registry. Centralized so we never have to guess
 * what "true" means in different parts of the codebase.
 */
export function coerceValue(def: SettingDefinition, raw: string | null | undefined): unknown {
  if (raw === null || raw === undefined || raw === '') return def.defaultValue;
  switch (def.type) {
    case 'toggle':
      return raw === 'true' || raw === '1';
    case 'number':
      return Number(raw);
    case 'json':
      try {
        return JSON.parse(raw);
      } catch {
        return def.defaultValue;
      }
    default:
      return raw;
  }
}

/** Reverse of coerceValue — turn a typed value back into the storage string. */
export function serializeValue(def: SettingDefinition, value: unknown): string {
  switch (def.type) {
    case 'toggle':
      return value ? 'true' : 'false';
    case 'json':
      return JSON.stringify(value ?? def.defaultValue);
    default:
      return String(value ?? '');
  }
}

// ============================================================================
// Runtime accessor with caching + audit
// ============================================================================
// We cache the entire SystemSettings table in module scope; one DB hit per
// process. Reads after the first are O(1). Writes invalidate the cache.
//
// In serverless / edge runtimes where the process is short-lived, the
// per-invocation cost is still bounded to one query — well under our request
// budget for any one route.

let cache: Map<string, string> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function loadCache(): Promise<Map<string, string>> {
  const fresh = !cache || Date.now() - cacheLoadedAt > CACHE_TTL_MS;
  if (!fresh) return cache!;
  try {
    const rows = await prisma.systemSettings.findMany();
    cache = new Map(rows.map(r => [r.key, r.value]));
    cacheLoadedAt = Date.now();
  } catch (err) {
    // DB down? Honor every default — never crash a request because settings
    // failed to load.
    console.error('[admin-settings] failed to load cache:', err);
    cache = new Map();
  }
  return cache;
}

/**
 * Read a setting by key with full type safety. Returns `defaultValue` from
 * the registry if no row exists.
 *
 * @example
 *   const vat = await getSetting<number>('VAT_RATE');           // 0.14
 *   const flags = await getSetting<Record<string, boolean>>('FEATURE_FLAGS_JSON');
 */
export async function getSetting<T>(key: string): Promise<T> {
  const def = getDefinition(key);
  const c = await loadCache();
  return coerceValue(def, c.get(key) ?? null) as T;
}

/**
 * Bulk read — returns a typed object keyed by setting key. Useful for
 * bootstrapping the public window.__BRAND payload without N round trips.
 */
export async function getSettings<T extends Record<string, unknown>>(keys: string[]): Promise<T> {
  const c = await loadCache();
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const def = getDefinition(key);
    out[key] = coerceValue(def, c.get(key) ?? null);
  }
  return out as T;
}

/**
 * Persist a setting. Writes the SystemSettings row, invalidates the cache,
 * and (when an admin user is supplied) appends an AuditLog entry capturing
 * the before/after values.
 */
export async function setSetting(key: string, value: unknown, adminId?: string): Promise<void> {
  const def = getDefinition(key);
  const serialized = serializeValue(def, value);
  const before = (await loadCache()).get(key) ?? null;

  await prisma.systemSettings.upsert({
    where: { key },
    update: { value: serialized, description: def.description ?? null },
    create: { key, value: serialized, description: def.description ?? null },
  });

  if (adminId) {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'UPDATE_SETTING',
        targetId: key,
        details: JSON.stringify({
          key,
          before,
          after: def.sensitive ? '***' : serialized,
        }),
      },
    });
  }

  // Mirror selected flags into Redis so the edge middleware (proxy.ts)
  // can read them without pulling Prisma into the edge bundle. Currently
  // only the maintenance-mode flags need this — the rest are read in
  // Node-runtime API routes via getSetting().
  try {
    const { redis } = await import('./redis');
    if (key === 'MAINTENANCE_MODE') {
      await redis.set('settings:maintenance', value ? '1' : '0', 'EX', 600);
    }
    if (key === 'MAINTENANCE_ALLOW_ADMIN') {
      await redis.set('settings:maintenance:allowAdmin', value ? '1' : '0', 'EX', 600);
    }
  } catch {
    // Redis hiccup is non-fatal — the cache will catch up on the next write.
  }

  // Bust the cache so the next read sees the new value immediately.
  cache = null;
}

/** Force-reload on next access — useful in tests + after a bulk import. */
export function invalidateSettingsCache(): void {
  cache = null;
}
