# Security Readiness Checklist

## Purpose

Comprehensive security checklist based on OWASP Top 10:2025 and modern security practices.

**Last Verified**: June 2026

---

## A01: Broken Access Control

- [ ] Deny by default - explicit grants only
- [ ] CORS configured with specific origins
- [ ] IDOR protection - resource ownership verified
- [ ] JWT validation on every request
- [ ] File access controls implemented
- [ ] Directory listing disabled
- [ ] Admin functions restricted to admin users
- [ ] Rate limiting on sensitive endpoints
- [ ] API authorization on all endpoints

## A02: Security Misconfiguration

- [ ] Default credentials removed
- [ ] Debug mode disabled in production
- [ ] Unnecessary features/ports disabled
- [ ] Security headers configured
- [ ] Error messages don't reveal internals
- [ ] Security patches applied
- [ ] Cloud storage permissions correct
- [ ] TLS configured properly (1.2+)

## A03: Software Supply Chain Failures

- [ ] Dependencies audited regularly
- [ ] Lock files committed
- [ ] No untrusted packages
- [ ] Package integrity verified
- [ ] CI/CD pipeline secured
- [ ] Dependency scanning in CI
- [ ] Container images from trusted sources
- [ ] SRI for CDN resources

## A04: Cryptographic Failures

- [ ] Data encrypted in transit (TLS)
- [ ] Data encrypted at rest
- [ ] Passwords hashed with Argon2/bcrypt
- [ ] No weak algorithms (MD5, SHA1)
- [ ] Keys properly managed
- [ ] Sensitive data not in URLs
- [ ] PII identified and protected

## A05: Injection

- [ ] SQL: Parameterized queries/ORM used
- [ ] XSS: Output escaped, CSP configured
- [ ] Command injection: No shell commands with user input
- [ ] Template injection: Inputs sanitized
- [ ] LDAP injection: Queries sanitized

## A06: Insecure Design

- [ ] Threat modeling performed
- [ ] Security requirements defined
- [ ] Secure design patterns used
- [ ] Security testing throughout SDLC
- [ ] Abuse cases considered
- [ ] Rate limiting designed in
- [ ] Tenant isolation designed in

## A07: Authentication Failures

- [ ] Strong password policy enforced
- [ ] MFA available for sensitive operations
- [ ] Rate limiting on login (5 attempts/15 min)
- [ ] Generic error messages
- [ ] Secure password recovery
- [ ] Session management secure
- [ ] Default credentials changed

## A08: Software or Data Integrity Failures

- [ ] Dependencies verified (lock files)
- [ ] CI/CD pipeline secured
- [ ] Auto-update mechanisms verified
- [ ] Deserialization protection
- [ ] Data integrity checks
- [ ] CDN integrity (SRI)

## A09: Security Logging & Alerting

- [ ] Login attempts logged (success/failure)
- [ ] Access control failures logged
- [ ] Input validation failures logged
- [ ] Audit trail maintained
- [ ] Logs don't contain sensitive data
- [ ] Alerting configured for anomalies
- [ ] Log integrity protected

## A10: Mishandling of Exceptional Conditions

- [ ] Exception handling in all code paths
- [ ] Fail closed (deny on error)
- [ ] Error messages don't reveal internals
- [ ] Graceful degradation
- [ ] Timeout handling
- [ ] Circuit breakers for external services

---

## Frontend Security

- [ ] XSS prevention (React auto-escaping)
- [ ] CSP headers configured
- [ ] Sensitive data not in DOM
- [ ] Secure cookie configuration
- [ ] HTTPS enforced
- [ ] Subresource integrity

## Backend Security

- [ ] Input validation (Zod)
- [ ] Output sanitization
- [ ] Rate limiting
- [ ] Request size limits
- [ ] File upload validation
- [ ] SSRF prevention
- [ ] Security headers (Helmet)

## Database Security

- [ ] Parameterized queries only
- [ ] Least privilege database user
- [ ] Row-level security (if multi-tenant)
- [ ] Encryption at rest
- [ ] Backup encryption
- [ ] Connection encryption

## Infrastructure Security

- [ ] Firewall configured
- [ ] Non-root containers
- [ ] Container image scanning
- [ ] Secrets in secure storage
- [ ] Network segmentation
- [ ] TLS everywhere

## CI/CD Security

- [ ] Secrets in CI/CD secrets
- [ ] Dependency scanning
- [ ] SAST configured
- [ ] Container scanning
- [ ] Signed commits (optional)
- [ ] Environment protection rules
