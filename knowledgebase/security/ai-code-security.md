# AI Code Security

## Purpose

Define security practices for AI-generated code and AI-assisted development.

**Last Verified**: June 2026

---

## Risks of AI-Generated Code

| Risk | Description | Mitigation |
|---|---|---|
| Hallucinated APIs | AI invents non-existent functions | Always verify API exists |
| Outdated patterns | AI uses deprecated approaches | Check current documentation |
| Missing validation | AI omits input validation | Review all input handling |
| Insecure defaults | AI uses insecure configurations | Security review checklist |
| Exposed secrets | AI includes hard-coded values | Scan for secrets |
| SQL injection | AI uses string concatenation | Use parameterized queries |
| Missing auth | AI omits authorization checks | Verify auth on all endpoints |

---

## Review Checklist for AI Code

### Authentication & Authorization

- [ ] All endpoints have authentication
- [ ] Resource ownership verified
- [ ] Role checks implemented
- [ ] No bypassed auth guards

### Input Validation

- [ ] All user input validated
- [ ] Schema validation (Zod) used
- [ ] File uploads validated
- [ ] SQL injection prevented

### Data Security

- [ ] No hard-coded secrets
- [ ] Sensitive data not logged
- [ ] Passwords properly hashed
- [ ] PII handled securely

### Error Handling

- [ ] Internal errors not exposed
- [ ] Error messages generic in production
- [ ] No stack traces in responses

### Dependencies

- [ ] Dependencies verified to exist
- [ ] No deprecated packages
- [ ] Versions pinned appropriately

---

## Verification Protocol

### Before Merging AI Code

1. **Static Analysis**: Run ESLint, TypeScript strict mode
2. **Dependency Check**: Verify all imports exist
3. **Security Scan**: Run SAST tools
4. **Manual Review**: Human review required for:
   - Authentication/authorization code
   - Data access code
   - File handling
   - External API calls
   - Configuration changes

### Testing AI Code

```typescript
// Test that security controls work
describe('Security', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('should reject unauthorized access', async () => {
    const res = await request(app)
      .delete('/api/users/other-user-id')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('should validate input', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'invalid' });
    expect(res.status).toBe(400);
  });
});
```

---

## Prompt Security

### Preventing Prompt Injection

```typescript
// Sanitize user input before including in prompts
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/```/g, '')
    .slice(0, 1000); // Limit length
}
```

### Data Minimization

- Only include necessary context in prompts
- Never include credentials or tokens
- Redact PII from prompt data

---

## Anti-Patterns

- **Blindly merging AI code**: Always review
- **Trusting AI for security code**: Human review required
- **Missing tests for AI code**: Test all AI-generated code
- **Not verifying dependencies**: Check packages exist
- **Ignoring AI warnings**: Address security suggestions

---

## Verification Checklist

- [ ] All AI code reviewed by human
- [ ] Security checklist applied
- [ ] Static analysis passed
- [ ] Dependencies verified
- [ ] Tests written for AI code
- [ ] No hard-coded secrets
- [ ] Auth/authz verified
