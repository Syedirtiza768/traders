# Contract Testing

## Purpose

Define contract testing patterns for verifying API contracts between frontend and backend.

**Last Verified**: June 2026

---

## What is Contract Testing

Contract testing verifies that API providers and consumers agree on the API structure. It catches breaking changes before they reach production.

```
┌──────────┐     Contract     ┌──────────┐
│ Frontend │ ◀──────────────▶ │ Backend  │
│ (Consumer)│                 │ (Provider)│
└──────────┘                  └──────────┘
```

---

## Approaches

### 1. Shared Types (TypeScript)

The simplest approach for TypeScript monorepos.

```typescript
// packages/shared/types/api.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
```

### 2. OpenAPI Specification

Generate types from OpenAPI spec.

```typescript
// Generate types from OpenAPI
npx openapi-typescript http://localhost:3000/api/docs-json -o types/api.d.ts

// Use generated types in frontend
import type { paths } from '@/types/api';

type UsersResponse = paths['/api/v1/users']['get']['responses']['200']['content']['application/json'];
```

### 3. Zod Schemas (Shared Validation)

Share validation schemas between frontend and backend.

```typescript
// packages/shared/schemas/user.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  createdAt: z.string().datetime(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type User = z.infer<typeof userSchema>;
```

---

## Implementation

### Backend: Validate Output

```typescript
// NestJS interceptor to validate response shape
@Injectable()
export class ResponseValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Validate response matches expected schema
        const result = userSchema.safeParse(data);
        if (!result.success) {
          logger.error('Response validation failed', result.error);
        }
        return data;
      }),
    );
  }
}
```

### Frontend: Validate Input

```typescript
// Validate API responses on the client
async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  // Validate response shape
  const result = z.array(userSchema).safeParse(data.data);
  if (!result.success) {
    console.error('API response validation failed', result.error);
    throw new Error('Invalid API response');
  }
  
  return result.data;
}
```

### Test: Contract Verification

```typescript
// tests/contract/api.contract.spec.ts
import { userSchema, createUserSchema } from '@shared/schemas/user';
import { api } from '../helpers/api';

describe('Users API Contract', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  describe('GET /users', () => {
    it('should return valid user array', async () => {
      const response = await api.get('/users', { token });
      
      expect(response.status).toBe(200);
      
      const result = z.object({
        data: z.array(userSchema),
        pagination: z.object({
          page: z.number(),
          perPage: z.number(),
          total: z.number(),
          totalPages: z.number(),
        }),
      }).safeParse(response.body);
      
      expect(result.success).toBe(true);
    });
  });

  describe('POST /users', () => {
    it('should accept valid create input', async () => {
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(true);

      const response = await api.post('/users', { body: input, token });
      expect(response.status).toBe(201);
      
      const userResult = userSchema.safeParse(response.body.data);
      expect(userResult.success).toBe(true);
    });

    it('should reject invalid input', async () => {
      const response = await api.post('/users', {
        body: { email: 'invalid' },
        token,
      });
      
      expect(response.status).toBe(400);
    });
  });
});
```

---

## Breaking Change Detection

### CI Check

```yaml
# .github/workflows/contract.yml
name: Contract Tests

on:
  pull_request:
    branches: [main]

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      
      # Generate OpenAPI spec
      - run: pnpm run generate:openapi
      
      # Compare with previous spec
      - name: Check for breaking changes
        run: |
          npx openapi-diff previous-spec.json current-spec.json
```

### Manual Review Checklist

When changing API endpoints:

- [ ] Response shape unchanged OR consumers updated
- [ ] New fields are optional OR default values provided
- [ ] Removed fields have deprecation period
- [ ] Status codes unchanged
- [ ] Error format unchanged

---

## Anti-Patterns

- **No contract testing**: Breaking changes reach production
- **Type-only contracts**: Validate at runtime too
- **Ignoring validation errors**: Fix validation failures
- **No CI integration**: Contracts should be tested in CI
- **Backend-only testing**: Both provider and consumer should test

---

## Verification Checklist

- [ ] Shared types/schemas defined
- [ ] Backend validates output shape
- [ ] Frontend validates input shape
- [ ] Contract tests in CI
- [ ] Breaking change detection configured
- [ ] API documentation generated from schemas
