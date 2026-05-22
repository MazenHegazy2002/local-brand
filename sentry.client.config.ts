// Sentry — Browser SDK configuration.
// Loaded automatically by Next.js when @sentry/nextjs is installed.
// Set NEXT_PUBLIC_SENTRY_DSN (or SENTRY_DSN) in your environment to enable.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Sample rate: capture 10% of transactions in production, 100% in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session-replay: record 10% of sessions, 100% on error.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],

    // Only report errors from our own domain; ignore browser-extension noise.
    allowUrls: [/lolozozo\.shop/, /brandy-egypt\.com/, /localhost/],

    // Scrub PII from breadcrumbs/events before they leave the browser.
    beforeSend(event) {
      // Strip credit-card-like numbers
      const json = JSON.stringify(event);
      const sanitised = json.replace(/\b\d{13,16}\b/g, '[REDACTED]');
      return JSON.parse(sanitised);
    },
  });
}
