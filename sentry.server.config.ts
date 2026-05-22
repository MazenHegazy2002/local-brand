// Sentry — Node.js server-side SDK configuration.
// Runs in the Next.js server runtime (API routes, Server Components, etc.).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Capture all server-side errors plus a 10% transaction sample.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Attach stack traces to caught exceptions (not just unhandled ones).
    attachStacktrace: true,

    // Sanitise request data that might contain PII.
    beforeSend(event) {
      // Redact passwords / secrets in request body if captured.
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        for (const key of Object.keys(data)) {
          if (/password|secret|token|key/i.test(key)) {
            data[key] = '[REDACTED]';
          }
        }
      }
      return event;
    },
  });
}
