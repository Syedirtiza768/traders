# Documentation Synchronization Protocol

## Purpose

Define how to keep documentation synchronized with implementation across a codebase.

**Last Verified**: June 2026

---

## Problem

Documentation drifts from implementation over time:
- API docs don't match actual endpoints
- README setup instructions are outdated
- Architecture diagrams don't reflect current structure
- Environment variable docs are incomplete

---

## Sync Protocol

### When to Sync

- After adding new API endpoints
- After changing database schema
- After modifying environment variables
- After architecture changes
- After dependency updates
- On a regular schedule (monthly minimum)

### What to Sync

| Document | Syncs With | Frequency |
|---|---|---|
| API Documentation | Controller/Route files | Every API change |
| Database Docs | Prisma schema/migrations | Every schema change |
| README | Project structure, commands | Monthly |
| Environment Docs | .env.example, config files | Every config change |
| Architecture Docs | Module structure | Quarterly |

---

## API Documentation Sync

### Process

```
1. Read all controller/route files
2. Extract endpoint definitions
3. Compare with OpenAPI/Swagger spec
4. Update documentation
5. Verify examples work
```

### Verification

```bash
# Generate OpenAPI spec from code
npx @nestjs/swagger swagger-spec

# Compare with existing docs
diff existing-spec.json generated-spec.json
```

### Checklist

- [ ] All endpoints documented
- [ ] Request/response schemas accurate
- [ ] Authentication requirements documented
- [ ] Error responses documented
- [ ] Examples are valid and working

---

## Database Documentation Sync

### Process

```
1. Read prisma/schema.prisma
2. Extract all models and fields
3. Compare with database docs
4. Update documentation
5. Verify relationships documented
```

### Checklist

- [ ] All tables documented
- [ ] All columns documented with types
- [ ] Relationships documented
- [ ] Indexes documented
- [ ] Constraints documented

---

## README Sync

### Process

```
1. Read current README
2. Verify setup instructions work
3. Verify commands are correct
4. Verify prerequisites are accurate
5. Update as needed
```

### Checklist

- [ ] Prerequisites accurate
- [ ] Installation steps work
- [ ] Development commands correct
- [ ] Environment variables documented
- [ ] Project structure accurate
- [ ] Deployment instructions current

---

## Environment Variable Sync

### Process

```
1. Read all config files
2. Extract all process.env references
3. Compare with .env.example
4. Add missing variables
5. Remove unused variables
6. Document each variable
```

### Verification

```bash
# Find all env references
grep -rn "process\.env\." src/ app/

# Compare with .env.example
diff <(sort .env.example) <(sort .env)
```

### Checklist

- [ ] All required variables in .env.example
- [ ] Each variable has a comment explaining purpose
- [ ] Default values documented
- [ ] Sensitive values marked

---

## Sync Report Template

```markdown
# Documentation Sync Report

**Date**: {date}
**Scope**: {what was synced}

## Changes Made

### API Documentation
- Added: {new endpoints}
- Updated: {changed endpoints}
- Removed: {deleted endpoints}

### Database Documentation
- Added: {new tables/columns}
- Updated: {changed tables/columns}

### README
- Updated: {sections updated}

### Environment Variables
- Added: {new variables}
- Removed: {unused variables}

## Issues Found
- {List any issues discovered}

## Actions Required
- {List any manual actions needed}
```

---

## Automation

### Pre-commit Hooks

```bash
# .husky/pre-commit
pnpm typecheck
pnpm lint
# If these pass, documentation is likely in sync
```

### CI Checks

```yaml
# Check OpenAPI spec is up to date
- name: Check API Docs
  run: |
    npx @nestjs/swagger swagger-spec
    git diff --exit-code docs/openapi.json
```

---

## Anti-Patterns

- **Never syncing**: Schedule regular sync reviews
- **Syncing without verifying**: Always verify docs match code
- **Incomplete sync**: Check all areas, not just some
- **Not tracking changes**: Document what was synced
- **Manual-only sync**: Automate where possible
