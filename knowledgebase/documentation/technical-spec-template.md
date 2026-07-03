# Technical Specification Template

## Purpose

Template for defining technical implementation details for features or systems.

**Last Verified**: June 2026

---

## Template

```markdown
# Technical Spec: {Feature Name}

**Author**: {Name}
**Date**: {Date}
**PRD**: {Link to PRD}
**Status**: {Draft / Review / Approved / Implementing}

---

## Summary

{Brief description of what will be built}

## Architecture

### System Context
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │ ──▶ │ Backend  │ ──▶ │ Database │
└──────────┘     └──────────┘     └──────────┘
```

### Component Diagram
{Describe the components involved and how they interact}

### Data Flow
```
User Action → API Request → Validation → Business Logic → Database → Response
```

## Database Changes

### Schema Changes

```sql
-- New table
CREATE TABLE {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {column} {type} NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_{table}_{column} ON {table_name}({column});
```

### Migration Strategy
{Describe how the migration will be handled - zero downtime, data backfill, etc.}

### Rollback Plan
{How to rollback if needed}

## API Changes

### New Endpoints

#### {METHOD} {path}

**Description**: {What this endpoint does}

**Authentication**: Required (JWT)

**Authorization**: {Role/permission required}

**Request**:
```json
{
  "field": "value"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "uuid",
    "field": "value"
  }
}
```

**Errors**:
| Status | Code | Description |
|---|---|---|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing auth |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |

## Backend Implementation

### Modules Affected
| Module | Changes |
|---|---|
| {module} | {description of changes} |

### New Services

```typescript
@Injectable()
export class {ServiceName} {
  constructor(
    private readonly {repo}: {RepoName},
  ) {}

  async {method}(dto: {DtoName}): Promise<{ReturnType}> {
    // Implementation approach
  }
}
```

### New DTOs

```typescript
export class {DtoName} {
  @IsString()
  @IsNotEmpty()
  field: string;
}
```

### Background Jobs
{Describe any background jobs needed}

| Queue | Job | Trigger | Description |
|---|---|---|---|
| {queue} | {job} | {trigger} | {description} |

## Frontend Implementation

### Pages Affected
| Page | Changes |
|---|---|
| {page} | {description} |

### New Components

```typescript
// {ComponentName}
// Purpose: {what it does}
// Props: {what props it takes}
// State: {what state it manages}
```

### API Integration

```typescript
// API client methods needed
api.{method}('{path}', {data})
```

## Testing Strategy

### Unit Tests
| Component | Test Cases |
|---|---|
| {Service} | Create, validate, error cases |

### Integration Tests
| Scenario | Description |
|---|---|
| {Scenario} | {what to test} |

### E2E Tests
| Flow | Steps |
|---|---|
| {Flow} | {step by step} |

## Security Considerations

- [ ] Input validation on all endpoints
- [ ] Authentication required
- [ ] Authorization checked
- [ ] Tenant isolation maintained
- [ ] Sensitive data not logged
- [ ] Rate limiting configured

## Performance Considerations

- [ ] Database queries optimized
- [ ] Indexes added for new queries
- [ ] Caching strategy defined
- [ ] Pagination implemented

## Deployment Plan

### Steps
1. {Step 1}
2. {Step 2}
3. {Step 3}

### Feature Flag
{If applicable, describe feature flag strategy}

### Rollback
{How to rollback if issues arise}

## Monitoring

### Metrics
| Metric | Threshold | Alert |
|---|---|---|
| Error rate | >1% | Page |
| Latency p95 | >500ms | Warn |

### Logs
{What to log and at what level}

## Open Questions

- [ ] {Question 1}
- [ ] {Question 2}

## Timeline

| Task | Duration | Owner |
|---|---|---|
| Database migration | 1 day | {name} |
| Backend implementation | 3 days | {name} |
| Frontend implementation | 2 days | {name} |
| Testing | 2 days | {name} |
```

---

## How to Use

1. Reference the PRD for requirements
2. Fill in all technical details
3. Get review from technical lead
4. Update as implementation progresses
5. Keep in sync with actual implementation
