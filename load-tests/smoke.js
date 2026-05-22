/**
 * k6 smoke test — Quick pass/fail check of critical routes
 *
 * Runs 1 VU for 1 iteration. Used in CI pipelines to verify a deployment
 * before promoting to production.
 *
 * Run:
 *   BASE_URL=https://staging.brandy.eg k6 run load-tests/smoke.js
 *
 * Exit code: 0 = all checks passed, non-zero = at least one failed.
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // ALL checks must pass
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const routes = [
    { path: '/api/health', name: 'health' },
    { path: '/api/products?limit=5', name: 'products_list' },
    { path: '/api/flash-sales', name: 'flash_sales' },
    { path: '/api/categories', name: 'categories' },
    { path: '/', name: 'homepage' },
    { path: '/legal', name: 'legal_index' },
    { path: '/legal/privacy-policy', name: 'legal_privacy' },
  ];

  for (const { path, name } of routes) {
    const res = http.get(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json, text/html' },
      tags: { name },
    });

    check(res, {
      [`${name} not 5xx`]: r => r.status < 500,
      [`${name} responds fast`]: r => r.timings.duration < 3000,
    });
  }
}
