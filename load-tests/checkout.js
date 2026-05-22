/**
 * k6 load test — Checkout & Order flow (authenticated)
 *
 * Flow per VU:
 *   1. Add item to cart (guest or authenticated)
 *   2. GET /api/cart
 *   3. POST /api/checkout  (creates order + returns payment intent)
 *   4. Simulate payment webhook (SKIP in prod — for staging only)
 *   5. GET /api/orders/[id]  (verify order status)
 *
 * Prerequisites:
 *   - Set BUYER_SESSION_TOKEN to a valid next-auth.session-token cookie
 *   - Set PRODUCT_ID + VARIANT_ID to real IDs in the target DB
 *   - Set ADDRESS_ID to a real saved address for the buyer
 *
 * Run:
 *   BASE_URL=https://staging.brandy.eg \
 *   BUYER_SESSION_TOKEN=xxx \
 *   PRODUCT_ID=xxx VARIANT_ID=xxx ADDRESS_ID=xxx \
 *   k6 run load-tests/checkout.js
 */

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SESSION = __ENV.BUYER_SESSION_TOKEN || '';
const PRODUCT_ID = __ENV.PRODUCT_ID || 'test-product-id';
const VARIANT_ID = __ENV.VARIANT_ID || '';
const ADDRESS_ID = __ENV.ADDRESS_ID || '';

// ─── Custom Metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate('errors');
const checkoutLatency = new Trend('checkout_latency', true);
const ordersCreated = new Counter('orders_created');
const checkoutFailures = new Counter('checkout_failures');

// ─── Thresholds ───────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 5 }, // gentle ramp — checkout is expensive
    { duration: '2m', target: 20 },
    { duration: '30s', target: 30 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'], // checkout allows slightly higher error budget
    checkout_latency: ['p(95)<5000'],
    errors: ['rate<0.02'],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function headers(extra = {}) {
  const h = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
  if (SESSION) {
    h.Cookie = `next-auth.session-token=${SESSION}`;
  }
  return h;
}

function post(path, body, tags = {}) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: headers(),
    tags,
  });
}

function get(path, tags = {}) {
  return http.get(`${BASE_URL}${path}`, {
    headers: headers(),
    tags,
  });
}

// ─── Scenario Steps ───────────────────────────────────────────────────────────

/** Step 1: Add item to cart */
function addToCart() {
  const body = {
    productId: PRODUCT_ID,
    variantId: VARIANT_ID || undefined,
    quantity: 1,
  };
  const res = post('/api/cart', body, { name: 'add_to_cart' });
  const ok = check(res, {
    'add_to_cart 200': r => r.status === 200 || r.status === 201,
  });
  errorRate.add(!ok);
  return ok;
}

/** Step 2: View cart */
function viewCart() {
  const res = get('/api/cart', { name: 'view_cart' });
  const ok = check(res, {
    'cart 200': r => r.status === 200,
    'cart not empty': r => {
      try {
        const data = JSON.parse(r.body);
        return (data.items || data.cart?.items || []).length > 0;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
  return ok;
}

/** Step 3: Initiate checkout */
function initiateCheckout() {
  const body = {
    addressId: ADDRESS_ID || undefined,
    paymentMethod: 'cod', // use COD so no real payment gateway is hit
    idempotencyKey: `k6-${__VU}-${Date.now()}`,
  };
  const res = post('/api/checkout', body, { name: 'checkout' });
  checkoutLatency.add(res.timings.duration);

  const ok = check(res, {
    'checkout 200 or 201': r => r.status === 200 || r.status === 201,
  });

  if (!ok) {
    checkoutFailures.add(1);
    errorRate.add(1);
    return null;
  }

  ordersCreated.add(1);

  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

/** Step 4: Verify order was created */
function verifyOrder(orderId) {
  if (!orderId) return;
  const res = get(`/api/orders/${orderId}`, { name: 'verify_order' });
  const ok = check(res, {
    'order exists': r => r.status === 200,
    'order has id': r => {
      try {
        return !!JSON.parse(r.body).id;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
}

// ─── Main VU Loop ─────────────────────────────────────────────────────────────
export default function () {
  if (!addToCart()) {
    sleep(1);
    return;
  }
  sleep(0.3);

  if (!viewCart()) {
    sleep(1);
    return;
  }
  sleep(0.5);

  const result = initiateCheckout();
  if (!result) {
    sleep(2);
    return;
  }
  sleep(0.3);

  const orderId = result.orderId || result.id;
  verifyOrder(orderId);

  sleep(Math.random() * 3 + 1); // 1–4 s think time
}
