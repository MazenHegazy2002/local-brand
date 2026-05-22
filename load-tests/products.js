/**
 * k6 load test — Product listing & detail API
 *
 * Tests:
 *   GET /api/products                  (paginated listing)
 *   GET /api/products?category=xxx     (category filter)
 *   GET /api/products?q=xxx            (search)
 *   GET /api/products/[id]             (product detail)
 *   GET /api/flash-sales               (flash-sale feed)
 *
 * Run:
 *   k6 run load-tests/products.js
 *   BASE_URL=https://staging.brandy.eg k6 run load-tests/products.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PRODUCT_ID = __ENV.PRODUCT_ID || 'test-product-id';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate('errors');
const listingLatency = new Trend('listing_latency', true);
const detailLatency = new Trend('detail_latency', true);
const flashSaleLatency = new Trend('flash_sale_latency', true);

// ─── Thresholds ───────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // ramp-up
    { duration: '2m', target: 50 }, // steady load
    { duration: '30s', target: 100 }, // spike
    { duration: '1m', target: 50 }, // recovery
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% errors
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    errors: ['rate<0.01'],
    listing_latency: ['p(95)<1500'],
    detail_latency: ['p(95)<1000'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function get(path, tags = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    tags,
  });
}

// ─── Test Scenarios ───────────────────────────────────────────────────────────

/** Paginated product listing */
function testListing() {
  const page = Math.ceil(Math.random() * 5);
  const res = get(`/api/products?page=${page}&limit=20`, { name: 'listing' });
  listingLatency.add(res.timings.duration);
  const ok = check(res, {
    'listing 200': r => r.status === 200,
    'listing has products': r => {
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
}

/** Category filter */
function testCategoryFilter() {
  const categories = ['fashion', 'home-decor', 'accessories', 'beauty'];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const res = get(`/api/products?category=${cat}&limit=20`, { name: 'category' });
  const ok = check(res, {
    'category 200': r => r.status === 200,
  });
  errorRate.add(!ok);
}

/** Full-text search */
function testSearch() {
  const terms = ['قميص', 'dress', 'handmade', 'leather', 'cotton'];
  const q = encodeURIComponent(terms[Math.floor(Math.random() * terms.length)]);
  const res = get(`/api/products?q=${q}&limit=10`, { name: 'search' });
  const ok = check(res, {
    'search 200': r => r.status === 200,
  });
  errorRate.add(!ok);
}

/** Product detail */
function testProductDetail() {
  const res = get(`/api/products/${PRODUCT_ID}`, { name: 'detail' });
  detailLatency.add(res.timings.duration);
  const ok = check(res, {
    'detail 200 or 404': r => r.status === 200 || r.status === 404,
  });
  errorRate.add(!ok);
}

/** Flash-sale feed */
function testFlashSales() {
  const res = get('/api/flash-sales', { name: 'flash_sales' });
  flashSaleLatency.add(res.timings.duration);
  const ok = check(res, {
    'flash-sales 200': r => r.status === 200,
  });
  errorRate.add(!ok);
}

// ─── Main VU Loop ─────────────────────────────────────────────────────────────
export default function productsScenario() {
  // Weighted scenario mix mimicking real traffic
  const roll = Math.random();
  if (roll < 0.4) {
    testListing();
  } else if (roll < 0.65) {
    testCategoryFilter();
  } else if (roll < 0.8) {
    testSearch();
  } else if (roll < 0.95) {
    testProductDetail();
  } else {
    testFlashSales();
  }

  sleep(Math.random() * 2 + 0.5); // 0.5–2.5 s think time
}
