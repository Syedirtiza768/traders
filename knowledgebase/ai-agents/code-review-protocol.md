# AI Code Review Protocol

## Purpose

Define how AI agents should review code for quality, security, and correctness.

**Last Verified**: June 2026

---

## Review Dimensions

### 1. Correctness

- Does the code do what it's supposed to?
- Are edge cases handled?
- Are error cases handled?
- Are null/undefined cases handled?

### 2. Security

- Are inputs validated?
- Is authentication required?
- Is authorization checked?
- Are secrets protected?
- Is SQL injection prevented?
- Is XSS prevented?

### 3. Performance

- Are there N+1 queries?
- Is caching used appropriately?
- Are large datasets paginated?
- Are expensive operations backgrounded?

### 4. Maintainability

- Is the code readable?
- Does it follow existing patterns?
- Is it properly typed?
- Are names descriptive?

### 5. Testing

- Are there tests?
- Do tests cover edge cases?
- Are tests isolated?
- Are mocks appropriate?

---

## Review Checklist

### Authentication & Authorization

- [ ] All endpoints have auth guards
- [ ] Resource ownership is verified
- [ ] Role checks are implemented
- [ ] No auth bypass possible

### Input Validation

- [ ] All user input is validated
- [ ] Schema validation (Zod) is used
- [ ] File uploads are validated
- [ ] SQL injection is prevented (parameterized queries)

### Data Access

- [ ] Queries are scoped to tenant (if multi-tenant)
- [ ] No SELECT * queries
- [ ] Indexes are used for filtered queries
- [ ] N+1 queries are avoided

### Error Handling

- [ ] All error cases are handled
- [ ] Error messages are generic in production
- [ ] Internal errors are logged
- [ ] Stack traces are not exposed

### API Design

- [ ] RESTful conventions followed
- [ ] Consistent response format
- [ ] Proper status codes
- [ ] Pagination on collections

### Code Quality

- [ ] TypeScript strict mode
- [ ] No `any` types (unless justified)
- [ ] Consistent naming conventions
- [ ] No dead code

### Testing

- [ ] Unit tests for business logic
- [ ] Integration tests for data access
- [ ] Edge cases covered
- [ ] Error cases covered

---

## Security Review

### Critical Issues (Must Fix)

- SQL injection vulnerability
- Authentication bypass
- Hard-coded secrets
- Exposed sensitive data
- Missing authorization checks
- Command injection
- Path traversal

### Important Issues (Should Fix)

- Missing input validation
- Missing rate limiting
- Verbose error messages
- Missing security headers
- Insecure dependencies
- Missing CORS configuration

### Minor Issues (Consider Fixing)

- Missing logging
- Inconsistent error format
- Missing pagination
- Suboptimal query

---

## Review Output Format

```markdown
## Code Review

### Summary
{Brief summary of the review}

### Critical Issues
1. **{Issue}** - `path/to/file.ts:{line}`
   - Problem: {description}
   - Impact: {what could go wrong}
   - Fix: {how to fix}

### Important Issues
1. **{Issue}** - `path/to/file.ts:{line}`
   - Problem: {description}
   - Recommendation: {suggestion}

### Minor Issues
1. **{Issue}** - `path/to/file.ts:{line}`
   - Suggestion: {improvement}

### Positive Notes
- {What was done well}
- {Good patterns observed}

### Verdict
- [ ] Approve
- [ ] Approve with minor changes
- [ ] Request changes
- [ ] Block (critical issues)
```

---

## Automated Checks

### Before Manual Review

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Security audit
pnpm audit

# Tests
pnpm test
```

### Static Analysis

```bash
# ESLint security rules
npx eslint --config .eslintrc.security.js src/

# Dependency check
npx better-npm-audit audit
```

---

## Anti-Patterns

- **Rubber stamping**: Actually review, don't just approve
- **Nitpicking style**: Focus on substance, not formatting
- **Ignoring security**: Security issues are always critical
- **Not checking tests**: Verify tests exist and are meaningful
- **Missing context**: Understand the PR's purpose before reviewing
