# Testing and Quality Assurance

## Purpose

Define testing strategy and quality assurance practices.

**Last Verified**: June 2026

---

## Testing Pyramid

```
        ┌───────────┐
        │    E2E    │  Few, slow, high confidence
        ├───────────┤
        │Integration│  Medium number, medium speed
        ├───────────┤
        │   Unit    │  Many, fast, focused
        └───────────┘
```

| Level | Percentage | Speed | Scope |
|---|---|---|---|
| Unit | 70% | <100ms | Single function/class |
| Integration | 20% | <1s | Multiple components |
| E2E | 10% | <30s | Full user flow |

---

## Testing Stack

| Tool | Use |
|---|---|
| Vitest | Unit and integration tests |
| Playwright | E2E tests |
| Testing Library | React component tests |
| supertest | API tests |
| k6 | Load testing |

---

## Test Types

### Unit Tests

```typescript
describe('OrderService', () => {
  it('should calculate total correctly', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(35);
  });

  it('should throw error for empty order', () => {
    expect(() => createOrder([])).toThrow('Order must have items');
  });
});
```

### Integration Tests

```typescript
describe('OrdersRepository', () => {
  it('should save and retrieve order', async () => {
    const order = await repository.create({ userId: '1', total: 100 });
    const found = await repository.findById(order.id);
    
    expect(found).toBeDefined();
    expect(found.total).toBe(100);
  });
});
```

### E2E Tests

```typescript
test('user can create order', async ({ page }) => {
  await page.goto('/orders/new');
  await page.fill('[name="product"]', 'Widget');
  await page.fill('[name="quantity"]', '2');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## Test Organization

```
src/
  modules/
    orders/
      __tests__/
        orders.service.spec.ts      # Unit
        orders.controller.spec.ts   # Unit
        orders.repository.spec.ts   # Integration

tests/
  integration/                       # Cross-module integration
  e2e/                              # End-to-end
    orders.spec.ts
```

---

## Mocking

### Mock External Services

```typescript
vi.mock('./email.service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(true),
  })),
}));
```

### Mock Database

```typescript
const mockPrisma = {
  order: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};
```

---

## Coverage

### Targets

| Metric | Target | Critical |
|---|---|---|
| Statements | 80% | Auth, payments |
| Branches | 75% | Error handling |
| Functions | 80% | Business logic |
| Lines | 80% | All |

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
- name: Test
  run: pnpm run test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v4
```

---

## Anti-Patterns

- **Testing implementation details**: Test behavior, not implementation
- **100% coverage obsession**: Focus on critical paths
- **Slow tests**: Mock external dependencies
- **Flaky tests**: Fix or remove them
- **No test isolation**: Each test should be independent
- **Shared test state**: Use fresh data per test

---

## Verification Checklist

- [ ] Testing stack configured (Vitest, Playwright)
- [ ] Unit tests for business logic
- [ ] Integration tests for data access
- [ ] E2E tests for critical flows
- [ ] Coverage thresholds set
- [ ] CI runs tests
- [ ] Test data strategy defined
