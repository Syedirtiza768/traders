# OWASP Top 10:2025 Checklist

## Purpose

Map security practices to the OWASP Top 10:2025 risks.

**Last Verified**: June 2026
**OWASP Version**: 2025 (8th Edition)

---

## A01:2025 - Broken Access Control

**Description**: Restrictions on what authenticated users are allowed to do are not properly enforced.

### Checklist

- [ ] Deny by default - require explicit grants
- [ ] CORS configured properly
- [ ] IDOR protection - validate resource ownership
- [ ] JWT access control on every request
- [ ] File access controls implemented
- [ ] Directory listing disabled
- [ ] Admin functions restricted to admin users
- [ ] Rate limiting on sensitive endpoints

### Implementation

```typescript
// Always check resource ownership
async function getOrder(orderId: string, userId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundException();
  if (order.userId !== userId) throw new ForbiddenException();
  return order;
}
```

---

## A02:2025 - Security Misconfiguration

**Description**: Missing security hardening, improperly configured permissions, or unnecessary features enabled.

### Checklist

- [ ] Remove default credentials
- [ ] Disable debug mode in production
- [ ] Remove unnecessary features/ports
- [ ] Security headers configured
- [ ] Error messages don't reveal internals
- [ ] Security patches applied
- [ ] Cloud storage permissions correct
- [ ] TLS configured properly

---

## A03:2025 - Software Supply Chain Failures

**Description**: Compromises within software dependencies, build systems, or distribution infrastructure.

### Checklist

- [ ] Dependencies audited regularly
- [ ] Lock files committed (pnpm-lock.yaml)
- [ ] No untrusted packages
- [ ] Package integrity verified
- [ ] CI/CD pipeline secured
- [ ] Dependency scanning in CI
- [ ] Container images from trusted sources

### Implementation

```bash
# Audit dependencies
pnpm audit

# Check for vulnerabilities
npm audit

# Lock file committed
git add pnpm-lock.yaml
```

---

## A04:2025 - Cryptographic Failures

**Description**: Failures related to cryptography which often leads to data exposure.

### Checklist

- [ ] Data encrypted in transit (TLS)
- [ ] Data encrypted at rest
- [ ] Passwords hashed with Argon2/bcrypt
- [ ] No weak algorithms (MD5, SHA1)
- [ ] Keys properly managed
- [ ] Sensitive data not in URLs
- [ ] PII identified and protected

---

## A05:2025 - Injection

**Description**: User-supplied data is not validated, filtered, or sanitized.

### Checklist

- [ ] SQL injection: Use parameterized queries/ORM
- [ ] XSS: Escape output, use CSP
- [ ] Command injection: No shell commands with user input
- [ ] LDAP injection: Sanitize LDAP queries
- [ ] Template injection: Sanitize template inputs

### Implementation

```typescript
// SQL injection prevention (Prisma)
const users = await prisma.user.findMany({
  where: { email: userInput }, // Parameterized
});

// XSS prevention (React)
<div>{userInput}</div> {/* Auto-escaped by React */}

// Command injection prevention
// Never: exec(`convert ${userInput} output.png`)
// Use: execFile('convert', [userInput, 'output.png'])
```

---

## A06:2025 - Insecure Design

**Description**: Missing or ineffective security controls at the design level.

### Checklist

- [ ] Threat modeling performed
- [ ] Security requirements defined
- [ ] Secure design patterns used
- [ ] Security testing throughout SDLC
- [ ] Abuse cases considered
- [ ] Rate limiting designed in
- [ ] Tenant isolation designed in

---

## A07:2025 - Authentication Failures

**Description**: Weak authentication mechanisms allowing credential stuffing, brute force, etc.

### Checklist

- [ ] Strong password policy enforced
- [ ] MFA available for sensitive operations
- [ ] Rate limiting on login attempts
- [ ] Generic error messages (don't reveal user existence)
- [ ] Secure password recovery
- [ ] Session management secure
- [ ] Default credentials changed

### Implementation

```typescript
// Generic error message
if (!user || !await verify(password, user.password)) {
  throw new UnauthorizedException('Invalid credentials'); // Don't say which is wrong
}
```

---

## A08:2025 - Software or Data Integrity Failures

**Description**: Failures to maintain trust boundaries and verify integrity of software/data.

### Checklist

- [ ] Dependencies verified (lock files)
- [ ] CI/CD pipeline secured
- [ ] Auto-update mechanisms verified
- [ ] Deserialization protection
- [ ] Data integrity checks
- [ ] CDN integrity (SRI)

---

## A09:2025 - Security Logging & Alerting Failures

**Description**: Insufficient logging and alerting for security events.

### Checklist

- [ ] Login attempts logged (success/failure)
- [ ] Access control failures logged
- [ ] Input validation failures logged
- [ ] Audit trail maintained
- [ ] Logs don't contain sensitive data
- [ ] Alerting configured for anomalies
- [ ] Log integrity protected

---

## A10:2025 - Mishandling of Exceptional Conditions

**Description**: Improper error handling, logical errors, failing open.

### Checklist

- [ ] Exception handling in all code paths
- [ ] Fail closed (deny on error, not allow)
- [ ] Error messages don't reveal internals
- [ ] Graceful degradation
- [ ] Timeout handling
- [ ] Circuit breakers for external services

### Implementation

```typescript
// Fail closed
try {
  const allowed = await checkPermission(userId, resource);
  if (!allowed) throw new ForbiddenException();
} catch (error) {
  // On error, deny access (fail closed)
  throw new ForbiddenException();
}
```

---

## Verification

| Category | Automated | Manual | Frequency |
|---|---|---|---|
| A01 Access Control | Unit tests | Code review | Every PR |
| A02 Misconfiguration | Linting | Audit | Monthly |
| A03 Supply Chain | pnpm audit | Dependency review | Weekly |
| A04 Cryptographic | SAST | Code review | Every PR |
| A05 Injection | SAST, DAST | Code review | Every PR |
| A06 Insecure Design | - | Threat modeling | Quarterly |
| A07 Authentication | Unit tests | Penetration test | Quarterly |
| A08 Integrity | CI checks | Audit | Monthly |
| A09 Logging | Log analysis | Audit | Monthly |
| A10 Exceptions | Error monitoring | Code review | Every PR |
