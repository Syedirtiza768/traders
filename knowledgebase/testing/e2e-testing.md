# End-to-End Testing

## Purpose

Define E2E testing patterns using Playwright for testing complete user flows.

**Last Verified**: June 2026
**Playwright Version**: v1.52+

---

## Setup

### Installation

```bash
pnpm add -D @playwright/test
npx playwright install
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Patterns

### Page Object Model

```typescript
// pages/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Authentication Flow Test

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'password123');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('user@example.com', 'wrong');

    await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

### CRUD Operations Test

```typescript
// tests/e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard');
  });

  test('should create a new user', async ({ page }) => {
    await page.goto('/users');
    await page.getByRole('button', { name: 'Add User' }).click();

    await page.getByLabel('Name').fill('John Doe');
    await page.getByLabel('Email').fill('john@example.com');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByText('User created')).toBeVisible();
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should edit a user', async ({ page }) => {
    await page.goto('/users');
    await page.getByText('John Doe').click();
    await page.getByRole('button', { name: 'Edit' }).click();

    await page.getByLabel('Name').fill('Jane Doe');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Jane Doe')).toBeVisible();
  });

  test('should delete a user', async ({ page }) => {
    await page.goto('/users');
    await page.getByText('John Doe').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('User deleted')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();
  });
});
```

### Multi-Tenant Test

```typescript
// tests/e2e/multi-tenancy.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Tenancy', () => {
  test('should isolate tenant data', async ({ page }) => {
    // Login as tenant A
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@tenant-a.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.goto('/orders');
    const tenantAOrders = await page.getByTestId('order-row').count();

    // Logout
    await page.getByRole('button', { name: 'Logout' }).click();

    // Login as tenant B
    await page.getByLabel('Email').fill('admin@tenant-b.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.goto('/orders');
    const tenantBOrders = await page.getByTestId('order-row').count();

    // Verify different data
    expect(tenantAOrders).not.toBe(tenantBOrders);
  });
});
```

---

## API Testing with Playwright

```typescript
// tests/e2e/api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: 'user@example.com', password: 'password' },
    });
    const body = await response.json();
    token = body.accessToken;
  });

  test('should list users', async ({ request }) => {
    const response = await request.get('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
  });

  test('should reject unauthenticated requests', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.status()).toBe(401);
  });
});
```

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      
      - run: pnpm test:e2e
      
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Best Practices

### Test Isolation

- Each test should be independent
- Use `test.beforeEach` for setup
- Clean up test data after each test
- Don't rely on test execution order

### Selectors

```typescript
// Good: Role-based selectors
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email');
page.getByText('Welcome');

// Good: Test ID
page.getByTestId('submit-button');

// Avoid: CSS selectors (fragile)
page.locator('.btn-primary');
page.locator('#submit');
```

### Waiting

```typescript
// Good: Wait for specific state
await expect(page.getByText('Success')).toBeVisible();

// Good: Wait for navigation
await page.waitForURL('/dashboard');

// Avoid: Arbitrary timeouts
await page.waitForTimeout(3000);
```

---

## Anti-Patterns

- **Brittle selectors**: Use roles, labels, test IDs
- **Hard-coded waits**: Use Playwright auto-waiting
- **Dependent tests**: Each test should be independent
- **Testing implementation**: Test behavior, not internals
- **No cleanup**: Clean up test data
- **No screenshots on failure**: Configure screenshot/video capture

---

## Verification Checklist

- [ ] Playwright configured
- [ ] Page objects created for key pages
- [ ] Auth flow tests
- [ ] CRUD operation tests
- [ ] Multi-tenant isolation tests
- [ ] API tests
- [ ] CI integration configured
- [ ] Screenshots/video on failure configured
