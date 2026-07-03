# Performance Testing

## Purpose

Define performance testing patterns for load testing, stress testing, and benchmarking.

**Last Verified**: June 2026

---

## Testing Tools

| Tool | Use Case | Language |
|---|---|---|
| k6 | Load testing, stress testing | JavaScript |
| Artillery | Load testing | YAML/JavaScript |
| Playwright | Performance budgets | TypeScript |
| Lighthouse | Frontend performance | JavaScript |

---

## Load Testing with k6

### Installation

```bash
# macOS
brew install k6

# Docker
docker run -i grafana/k6 run - <script.js
```

### Basic Load Test

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Authenticated Load Test

```javascript
// tests/performance/authenticated-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
};

export function setup() {
  const loginRes = http.post('http://localhost:3000/api/auth/login', JSON.stringify({
    email: 'loadtest@example.com',
    password: 'password',
  }), { headers: { 'Content-Type': 'application/json' } });
  
  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Test various endpoints
  const usersRes = http.get('http://localhost:3000/api/users', { headers });
  check(usersRes, { 'users status 200': (r) => r.status === 200 });

  const ordersRes = http.get('http://localhost:3000/api/orders', { headers });
  check(ordersRes, { 'orders status 200': (r) => r.status === 200 });

  sleep(1);
}
```

### Stress Test

```javascript
// tests/performance/stress-test.js
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};
```

---

## Performance Budgets

### Frontend Budgets

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Performance budgets
    actionTimeout: 5000,
    navigationTimeout: 10000,
  },
});
```

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      http://localhost:3000/
      http://localhost:3000/dashboard
    budgetPath: ./lighthouse-budget.json
```

```json
// lighthouse-budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 2000 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "total-blocking-time", "budget": 300 }
    ],
    "resourceSizes": [
      { "resourceType": "total", "budget": 300 },
      { "resourceType": "script", "budget": 150 },
      { "resourceType": "stylesheet", "budget": 50 }
    ]
  }
]
```

---

## Database Performance

### Query Benchmarking

```typescript
// Benchmark database queries
describe('Query Performance', () => {
  it('should list users within 100ms', async () => {
    const start = performance.now();
    await prisma.user.findMany({ take: 100 });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  it('should handle N+1 prevention', async () => {
    const start = performance.now();
    const orders = await prisma.order.findMany({
      include: { user: true, items: true },
      take: 50,
    });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
  });
});
```

---

## API Performance

### Response Time Tests

```typescript
// tests/performance/api.bench.spec.ts
import { bench, describe } from 'vitest';

describe('API Performance', () => {
  bench('GET /users', async () => {
    await request(app).get('/users').set('Authorization', `Bearer ${token}`);
  });

  bench('POST /users', async () => {
    await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'bench@example.com', name: 'Bench' });
  });
});
```

---

## Performance Targets

### Response Time Targets

| Endpoint Type | Target | Critical |
|---|---|---|
| Simple read | <100ms | <200ms |
| Complex read | <200ms | <500ms |
| Write operations | <300ms | <1000ms |
| File uploads | <2s | <5s |

### Throughput Targets

| Scale | Requests/sec | Concurrent Users |
|---|---|---|
| Small | 100 | 50 |
| Medium | 1000 | 500 |
| Large | 10000 | 5000 |

### Frontend Performance Targets

| Metric | Target | Critical |
|---|---|---|
| First Contentful Paint | <1.5s | <3s |
| Largest Contentful Paint | <2.5s | <4s |
| Cumulative Layout Shift | <0.1 | <0.25 |
| Total Blocking Time | <200ms | <600ms |
| Time to Interactive | <3s | <6s |

---

## CI Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6am
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/performance/load-test.js
      - uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results/
```

---

## Anti-Patterns

- **No performance testing**: Always test before scaling
- **Testing in production**: Use dedicated environments
- **Ignoring p95/p99**: Averages hide problems
- **No baselines**: Track performance over time
- **Testing only happy path**: Test error scenarios too
- **No budgets**: Set and enforce performance budgets

---

## Verification Checklist

- [ ] k6 configured for load testing
- [ ] Performance budgets defined
- [ ] Response time targets set
- [ ] Database query benchmarks exist
- [ ] Frontend performance budgets set
- [ ] CI integration configured
- [ ] Baseline performance documented
