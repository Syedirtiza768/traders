# Gap Analysis Protocol

## Purpose

Define how to perform gap analysis between frontend and backend implementations, database schema and code, and API contracts and consumers.

**Last Verified**: June 2026

---

## Frontend-Backend Gap Analysis

### Goal

Identify mismatches between what the frontend expects and what the backend provides.

### Process

```
1. Map all frontend API calls
2. Map all backend API endpoints
3. Compare request/response shapes
4. Identify gaps
```

### Step 1: Extract Frontend API Calls

```bash
# Find all fetch/axios/api calls in frontend
grep -rn "fetch(" app/ components/ lib/
grep -rn "api\.(get|post|put|patch|delete)" app/ components/ lib/
grep -rn "useQuery\|useMutation" app/ components/
```

### Step 2: Extract Backend Endpoints

```bash
# Find all controller methods
grep -rn "@Get\|@Post\|@Put\|@Patch\|@Delete" src/modules/
```

### Step 3: Compare

| Frontend Call | Backend Endpoint | Status |
|---|---|---|
| GET /api/users | GET /users | Match |
| POST /api/users | POST /users | Match |
| GET /api/reports | - | Missing backend |
| - | DELETE /users/:id | Missing frontend |

### Step 4: Document Gaps

```markdown
## Frontend-Backend Gaps

### Missing Backend Endpoints
- GET /api/reports - Frontend calls this but no backend endpoint exists

### Missing Frontend Integration
- DELETE /users/:id - Backend has this but no UI implements it

### Shape Mismatches
- POST /api/users: Frontend sends `name`, backend expects `firstName` + `lastName`
```

---

## Database-Code Alignment Check

### Goal

Ensure the database schema matches what the code expects.

### Process

```
1. Read database schema (Prisma schema or SQL)
2. Read code that accesses the database
3. Compare field names, types, and relationships
4. Identify gaps
```

### Step 1: Extract Schema Fields

```typescript
// From Prisma schema
model User {
  id        String   @id
  email     String   @unique
  name      String
  role      String   @default("user")
  createdAt DateTime @default(now())
}
```

### Step 2: Extract Code Usage

```bash
# Find all field references
grep -rn "\.email\|\.name\|\.role" src/modules/users/
grep -rn "select.*email\|include.*orders" src/modules/users/
```

### Step 3: Compare

| Schema Field | Code Usage | Status |
|---|---|---|
| id | findById, delete | Match |
| email | findByEmail, create | Match |
| name | create, update | Match |
| role | findAll filter | Match |
| - | findByName | Code uses field not in schema |

### Step 4: Document Gaps

```markdown
## Database-Code Gaps

### Missing Fields
- Code references `user.phone` but schema has no `phone` field

### Unused Fields
- Schema has `metadata` JSONB but code never accesses it

### Type Mismatches
- Schema: `total Decimal`, Code: treats as number without precision
```

---

## API Contract Verification

### Goal

Verify that API responses match what consumers expect.

### Process

```
1. Read API endpoint implementation
2. Read OpenAPI/Swagger documentation (if exists)
3. Read frontend API client/types
4. Compare all three
```

### Verification Matrix

| Endpoint | Backend Returns | Documentation Says | Frontend Expects | Status |
|---|---|---|---|---|
| GET /users | {data: User[]} | {data: User[]} | {data: User[]} | Match |
| POST /users | {id, email} | {id, email, name} | {id, email} | Doc mismatch |

---

## Permission Gap Analysis

### Goal

Ensure all API endpoints have proper authorization.

### Process

```
1. List all API endpoints
2. Check each for authentication guard
3. Check each for authorization (roles/permissions)
4. Identify unprotected endpoints
```

### Checklist

| Endpoint | Auth Guard | Role Check | Status |
|---|---|---|---|
| POST /auth/login | None (public) | None | OK |
| GET /users | JwtAuthGuard | Admin | OK |
| DELETE /users/:id | - | - | Missing auth |
| GET /reports | JwtAuthGuard | - | Missing role check |

---

## Error Handling Gap Analysis

### Goal

Ensure all error cases are handled properly.

### Process

```
1. Identify all error-prone operations (DB queries, API calls, file ops)
2. Check each for error handling
3. Verify error responses are consistent
4. Identify unhandled error cases
```

### Checklist

| Operation | Error Handled | Error Response | Status |
|---|---|---|---|
| DB query | try/catch | 500 with message | OK |
| File upload | Missing | Unhandled | Gap |
| External API | try/catch | 502 with message | OK |

---

## Report Template

```markdown
# Gap Analysis Report

**Date**: {date}
**Scope**: {what was analyzed}

## Summary
- Total items analyzed: {count}
- Gaps found: {count}
- Critical gaps: {count}

## Gaps Found

### Critical
1. {Description of critical gap}
   - Location: {file/endpoint}
   - Impact: {what could go wrong}
   - Recommendation: {how to fix}

### Important
1. {Description}

### Minor
1. {Description}

## Recommendations
1. {Prioritized list of actions}
```

---

## Anti-Patterns

- **Incomplete analysis**: Check all endpoints, not just some
- **Ignoring type mismatches**: Small type differences cause runtime errors
- **Not checking permissions**: Every endpoint needs auth
- **Skipping error handling**: Unhandled errors crash apps
- **Not documenting findings**: Document gaps for tracking
