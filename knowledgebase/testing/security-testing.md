# Security Testing

## Purpose

Define security testing practices for identifying and preventing security vulnerabilities.

**Last Verified**: June 2026

---

## Testing Types

| Type | When | Tools |
|---|---|---|
| SAST | Every commit | ESLint security, Semgrep |
| DAST | Weekly/Before release | OWASP ZAP, Burp Suite |
| Dependency audit | Every build | pnpm audit, Snyk |
| Container scan | Every build | Trivy, Docker Scout |
| Penetration test | Quarterly | Manual/External firm |

---

## Static Application Security Testing (SAST)

### ESLint Security Plugin

```bash
pnpm add -D eslint-plugin-security
```

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: { security },
    rules: {
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-possible-timing-attacks': 'error',
    },
  },
];
```

### Semgrep

```bash
# Install
pip install semgrep

# Run
semgrep --config=p/typescript .
```

---

## Dependency Auditing

### pnpm Audit

```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically (when possible)
pnpm audit --fix
```

### Snyk

```bash
# Install
npm install -g snyk

# Test
snyk test

# Monitor
snyk monitor
```

### CI Integration

```yaml
# .github/workflows/security.yml
- name: Dependency Audit
  run: pnpm audit --audit-level=high

- name: Snyk Test
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Dynamic Application Security Testing (DAST)

### OWASP ZAP

```bash
# Docker
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:3000 \
  -r report.html
```

### API Security Testing

```typescript
// tests/security/api.security.spec.ts
import { test, expect } from '@playwright/test';

describe('API Security', () => {
  test('should reject requests without auth', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.status()).toBe(401);
  });

  test('should reject expired tokens', async ({ request }) => {
    const response = await request.get('/api/users', {
      headers: { Authorization: 'Bearer expired-token' },
    });
    expect(response.status()).toBe(401);
  });

  test('should prevent SQL injection', async ({ request }) => {
    const response = await request.get('/api/users?email=\' OR 1=1--');
    expect(response.status()).toBe(400);
  });

  test('should prevent XSS in responses', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
      },
    });
    
    if (response.ok()) {
      const body = await response.text();
      expect(body).not.toContain('<script>');
    }
  });

  test('should enforce rate limiting', async ({ request }) => {
    const requests = Array.from({ length: 101 }, () =>
      request.post('/api/auth/login', {
        data: { email: 'test@example.com', password: 'wrong' },
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBe(true);
  });

  test('should prevent IDOR', async ({ request }) => {
    // Login as user A
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'user-a@example.com', password: 'password' },
    });
    const token = (await loginRes.json()).accessToken;

    // Try to access user B's data
    const response = await request.get('/api/users/user-b-id', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBe(403);
  });
});
```

---

## Container Security

### Trivy

```bash
# Scan image
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Scan Dockerfile
trivy config Dockerfile
```

### Docker Scout

```bash
docker scout cves myapp:latest
```

### CI Integration

```yaml
- name: Container Scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: 'HIGH,CRITICAL'
    exit-code: '1'
```

---

## Authentication Testing

```typescript
describe('Authentication Security', () => {
  test('should not reveal user existence', async () => {
    const invalidEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'wrong' });
    
    const invalidPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'real@example.com', password: 'wrong' });

    // Same error message for both
    expect(invalidEmail.body.message).toBe(invalidPassword.body.message);
  });

  test('should enforce password policy', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: '123' });

    expect(response.status).toBe(400);
  });

  test('should hash passwords', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    
    // Password should not be stored in plain text
    expect(user.password).not.toBe('password123');
    // Should be a hash
    expect(user.password).toMatch(/^\$argon2/);
  });
});
```

---

## Authorization Testing

```typescript
describe('Authorization Security', () => {
  test('should enforce RBAC', async () => {
    // Regular user trying admin endpoint
    const response = await request(app)
      .delete('/users/some-id')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
  });

  test('should prevent privilege escalation', async () => {
    // User trying to update their own role
    const response = await request(app)
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(403);
  });
});
```

---

## Input Validation Testing

```typescript
describe('Input Validation', () => {
  test('should reject oversized payloads', async () => {
    const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
    
    const response = await request(app)
      .post('/api/data')
      .send({ data: largePayload });

    expect(response.status).toBe(413);
  });

  test('should reject invalid content types', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Content-Type', 'text/plain')
      .send('invalid');

    expect(response.status).toBe(400);
  });
});
```

---

## CI/CD Security Pipeline

```yaml
# .github/workflows/security.yml
name: Security

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - uses: github/codeql-action/analyze@v3

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp .
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp
          severity: 'HIGH,CRITICAL'
```

---

## Anti-Patterns

- **No security testing**: Always test security
- **Testing only happy path**: Test attack scenarios
- **Ignoring low-severity findings**: Fix them eventually
- **No CI integration**: Automate security checks
- **Skipping container scans**: Scan all images
- **No penetration testing**: Schedule regular pen tests

---

## Verification Checklist

- [ ] SAST configured (ESLint security, Semgrep)
- [ ] Dependency auditing in CI
- [ ] Container scanning in CI
- [ ] DAST configured (OWASP ZAP)
- [ ] Auth security tests
- [ ] Authorization security tests
- [ ] Input validation tests
- [ ] Rate limiting tests
- [ ] SQL injection tests
- [ ] XSS prevention tests
- [ ] Penetration test scheduled
