# Coding Agent Operating Protocol

## Purpose

Standard operating protocol for AI coding agents working with any codebase. Follow this protocol for every task.

**Last Verified**: June 2026

---

## Protocol Overview

```
┌─────────────┐
│  Receive     │
│  Task        │
└──────┬──────┘
       │
┌──────▼──────┐
│  Understand  │ → Read context, explore codebase
│  Context     │
└──────┬──────┘
       │
┌──────▼──────┐
│  Plan        │ → Identify affected files, approach
│  Approach    │
└──────┬──────┘
       │
┌──────▼──────┐
│  Read        │ → Read ALL files before modifying
│  First       │
└──────┬──────┘
       │
┌──────▼──────┐
│  Implement   │ → Make minimal, focused changes
│  Changes     │
└──────┬──────┘
       │
┌──────▼──────┐
│  Verify      │ → Type check, lint, test
│  Changes     │
└──────┬──────┘
       │
┌──────▼──────┐
│  Report      │ → Summarize changes and results
│  Results     │
└─────────────┘
```

---

## Phase 1: Understand Context

### Checklist

- [ ] Read task description carefully
- [ ] Read repository context document (CONTEXT.md, README.md)
- [ ] Identify the technology stack
- [ ] Understand the project structure
- [ ] Identify relevant modules/packages

### Actions

```
1. Read README.md and any CONTEXT.md
2. List top-level directory structure
3. Identify package.json dependencies
4. Read relevant configuration files (tsconfig, next.config, nest-cli)
```

---

## Phase 2: Plan Approach

### Checklist

- [ ] Identify all files that need to be read
- [ ] Identify all files that need to be modified
- [ ] Identify all files that need to be created
- [ ] Identify potential side effects
- [ ] Identify testing requirements

### Actions

```
1. List affected files
2. Determine change approach
3. Identify risks
4. Plan verification steps
```

---

## Phase 3: Read First

### Rules

1. **NEVER modify a file you haven't read**
2. **Read all files that will be modified**
3. **Read files that import modified files**
4. **Read related test files**
5. **Understand existing patterns before writing new code**

### Actions

```
1. Read each file that will be modified
2. Read each file that imports the modified file
3. Read related test files
4. Note existing patterns and conventions
```

---

## Phase 4: Implement Changes

### Rules

1. **Make minimal changes** - Only change what's needed
2. **Follow existing patterns** - Match the codebase style
3. **Preserve contracts** - Don't break public APIs
4. **Add types** - Use TypeScript strictly
5. **Handle errors** - Don't ignore error cases

### Actions

```
1. Implement changes following existing patterns
2. Add/update types as needed
3. Add/update validation as needed
4. Add/update error handling as needed
```

---

## Phase 5: Verify Changes

### Required Checks

```bash
# Type checking
pnpm typecheck  # or: npx tsc --noEmit

# Linting
pnpm lint       # or: npx eslint . --ext .ts,.tsx

# Unit tests (affected)
pnpm test       # or: npx vitest run

# Build (if applicable)
pnpm build
```

### Verification Matrix

| Change Type | TypeCheck | Lint | Unit Test | Build | E2E |
|---|---|---|---|---|---|
| New function | Required | Required | Required | - | - |
| New API endpoint | Required | Required | Required | Required | Recommended |
| New component | Required | Required | Required | - | Recommended |
| Bug fix | Required | Required | Required | Required | Recommended |
| Refactor | Required | Required | Required | Required | Required |
| Config change | Required | Required | - | Required | Recommended |

### Actions

```
1. Run type checking
2. Run linting
3. Run relevant tests
4. Run build (if applicable)
5. Fix any issues found
```

---

## Phase 6: Report Results

### Report Template

```markdown
## Changes Made

### Files Modified
- `path/to/file.ts` - {description of change}
- `path/to/other.ts` - {description of change}

### Files Created
- `path/to/new.ts` - {description}

### Verification
- [x] Type checking passed
- [x] Linting passed
- [x] Tests passed (X new tests added)
- [x] Build successful

### Assumptions
- {List any assumptions made}

### Concerns
- {List any concerns or risks}

### Follow-up
- {Suggest any follow-up actions}
```

---

## Decision Framework

### When to Ask for Clarification

- Requirements are ambiguous
- Multiple valid approaches exist
- Changes could break existing functionality
- Security implications are unclear
- Database schema changes are needed

### When to Proceed Autonomously

- Requirements are clear
- Pattern is established in codebase
- Changes are isolated
- No breaking changes
- Tests guide the approach

### When to Refuse

- Request would introduce security vulnerabilities
- Request would delete data without confirmation
- Request would break production without rollback plan
- Request is clearly harmful

---

## Special Protocols

### Database Changes

```
1. Read existing schema (prisma/schema.prisma)
2. Design schema change
3. Create migration
4. Update ORM models
5. Update affected queries
6. Test migration on dev database
7. Document rollback procedure
```

### API Changes

```
1. Read existing API endpoints
2. Design new endpoint/change
3. Implement with proper validation
4. Add OpenAPI documentation
5. Update API client (if exists)
6. Write tests
7. Verify backward compatibility
```

### Authentication Changes

```
1. Read existing auth implementation
2. Understand token flow
3. Implement changes carefully
4. Test auth flow end-to-end
5. Verify no auth bypass possible
6. Document security implications
```

---

## Error Handling Protocol

### When Verification Fails

```
1. Read the error message carefully
2. Identify the root cause
3. Fix the issue
4. Re-run verification
5. If stuck after 3 attempts, report the issue
```

### When Tests Fail

```
1. Read the test failure message
2. Determine if the test or the code is wrong
3. Fix appropriately
4. Re-run tests
5. If the test was correct, your change broke something
```

---

## Anti-Patterns

- **Modifying unread files**: Always read first
- **Skipping verification**: Always run checks
- **Over-reporting**: Be concise
- **Under-reporting**: Include key details
- **Guessing APIs**: Verify functions exist
- **Ignoring tests**: Tests are guardrails
- **Breaking contracts**: Preserve public interfaces
- **Silent failures**: Report all issues

---

## Verification Checklist

- [ ] Task understood correctly
- [ ] Codebase context understood
- [ ] All affected files identified
- [ ] All files read before modification
- [ ] Changes follow existing patterns
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Tests pass
- [ ] Build succeeds (if applicable)
- [ ] Results reported clearly
