# Brandy Load Tests (k6)

These scripts use [k6](https://k6.io) to stress-test the core API endpoints.

## Prerequisites

```bash
# macOS
brew install k6

# Ubuntu / Debian
sudo gpg -k
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Windows (Chocolatey)
choco install k6

# Docker (no install needed)
docker run --rm -i grafana/k6 run - < load-tests/products.js
```

## Running Tests

```bash
# Quick smoke test (1 VU, 30s)
k6 run load-tests/products.js

# Full soak against staging
BASE_URL=https://staging.brandy.eg k6 run \
  --vus 50 --duration 5m \
  load-tests/products.js

# Checkout ramp test
BASE_URL=https://staging.brandy.eg \
BUYER_SESSION_TOKEN="your-next-auth-session-token" \
k6 run load-tests/checkout.js

# Generate HTML report
k6 run --out json=results.json load-tests/products.js
k6 report results.json   # requires k6 cloud or k6 reporter plugin
```

## Environment Variables

| Variable              | Default                 | Description                                                    |
| --------------------- | ----------------------- | -------------------------------------------------------------- |
| `BASE_URL`            | `http://localhost:3000` | Target base URL                                                |
| `BUYER_SESSION_TOKEN` | —                       | `next-auth.session-token` cookie value for authenticated flows |
| `PRODUCT_ID`          | `test-product-id`       | A real product ID in the target DB                             |
| `SELLER_ID`           | —                       | A real seller ID for seller-specific routes                    |

## Thresholds

All scripts define k6 thresholds. A test is considered **PASSING** when:

- `http_req_failed` < 1%
- `http_req_duration` (p95) < 2000 ms
- `http_req_duration` (p99) < 5000 ms

Adjust in each script under `export const options`.
