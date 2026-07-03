# Security Review

## Purpose

Systematically evaluate system security across authentication, authorization, data protection, and attack vectors to identify vulnerabilities and ensure compliance.

## Inputs

- System architecture
- Data classification
- Compliance requirements
- Threat landscape
- User access patterns
- Integration points

## Expected Outputs

- Security assessment report
- Vulnerability inventory
- Risk prioritization
- Remediation recommendations
- Compliance gaps
- Security roadmap

## Decision Process

### 1. Asset Identification

**Asset Categories**

| Category | Examples | Classification |
|----------|----------|----------------|
| Data | PII, financial, health | Public, Internal, Confidential, Restricted |
| Systems | Applications, databases | Critical, Important, Standard |
| Infrastructure | Servers, networks | Critical, Important, Standard |
| Credentials | Keys, passwords, certificates | Critical |

**Data Classification**:
```
Public: No impact if disclosed
Internal: Limited impact if disclosed
Confidential: Significant impact if disclosed
Restricted: Severe impact if disclosed
```

### 2. Threat Modeling

**STRIDE Framework**

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Spoofing | Impersonating user/service | Authentication |
| Tampering | Modifying data | Integrity controls |
| Repudiation | Denying actions | Audit logging |
| Information Disclosure | Unauthorized access | Authorization, encryption |
| Denial of Service | Disrupting service | Rate limiting, redundancy |
| Elevation of Privilege | Gaining unauthorized access | Authorization, least privilege |

**Threat Modeling Process**:
1. Diagram the system
2. Identify trust boundaries
3. Identify entry points
4. Identify assets
5. Apply STRIDE to each component
6. Document threats
7. Prioritize and mitigate

**Trust Boundaries**:
```
┌─────────────────────────────────────┐
│           Public Internet           │
└─────────────────┬───────────────────┘
                  │ Trust Boundary
┌─────────────────┴───────────────────┐
│           DMZ / Edge                │
│  ┌─────────────┐  ┌─────────────┐   │
│  │   WAF       │  │  Load Bal.  │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────┬───────────────────┘
                  │ Trust Boundary
┌─────────────────┴───────────────────┐
│        Application Tier             │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  App Server │  │  App Server │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────┬───────────────────┘
                  │ Trust Boundary
┌─────────────────┴───────────────────┐
│           Data Tier                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  Database   │  │   Cache     │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

### 3. Authentication Review

**Authentication Methods**

| Method | Use Case | Security Level |
|--------|----------|----------------|
| Password | User authentication | Medium (with MFA) |
| API Key | Service-to-service | Medium |
| OAuth 2.0 | Third-party authorization | High |
| mTLS | Service-to-service | High |
| Certificate | Service authentication | High |

**Authentication Checklist**:
- [ ] Strong password policy enforced
- [ ] Multi-factor authentication available
- [ ] Account lockout after failed attempts
- [ ] Secure password recovery
- [ ] Session management secure
- [ ] Token expiration configured
- [ ] Secure token storage

**Session Security**:
```
Session Configuration:
├── Session timeout: 30 min inactive
├── Absolute timeout: 8 hours
├── Secure cookie flag: enabled
├── HttpOnly cookie flag: enabled
├── SameSite cookie attribute: Strict
└── Session ID: Cryptographically random
```

### 4. Authorization Review

**Authorization Models**

| Model | Description | Use Case |
|-------|-------------|----------|
| RBAC | Role-based access | Enterprise applications |
| ABAC | Attribute-based access | Fine-grained control |
| ACL | Access control lists | Resource-level control |
| PBAC | Policy-based access | Complex authorization |

**Authorization Principles**:
- Least privilege: Minimum necessary access
- Defense in depth: Multiple layers
- Fail secure: Deny by default
- Separation of duties: No single point of control

**Authorization Checklist**:
- [ ] Principle of least privilege applied
- [ ] Role definitions reviewed
- [ ] Permission boundaries defined
- [ ] Admin access restricted
- [ ] Regular access reviews scheduled
- [ ] Privileged access management

### 5. Data Protection

**Encryption at Rest**

| Data Type | Encryption | Key Management |
|-----------|------------|----------------|
| Database | AES-256 | KMS |
| Files | AES-256 | KMS |
| Backups | AES-256 | KMS |
| Logs | AES-256 | KMS |

**Encryption in Transit**

| Protocol | Use Case | Configuration |
|----------|----------|---------------|
| TLS 1.3 | HTTPS | Strong ciphers only |
| mTLS | Service-to-service | Client certificates |
| SSH | Server access | Key-based auth |

**Data Protection Checklist**:
- [ ] Encryption at rest enabled
- [ ] Encryption in transit enforced
- [ ] Key rotation implemented
- [ ] Key access audited
- [ ] Data classification applied
- [ ] Data retention policies defined
- [ ] Data deletion procedures documented

### 6. Input Validation

**Input Validation Rules**:
```
Validation Layers:
├── Client-side: UX improvement (not security)
├── API gateway: Basic validation
├── Application: Business validation
└── Database: Constraint validation

Validation Types:
├── Type validation (string, number, etc.)
├── Format validation (email, date, etc.)
├── Range validation (min, max)
├── Length validation
├── Whitelist validation (allowed values)
└── Sanitization (remove dangerous chars)
```

**Common Vulnerabilities**:

| Vulnerability | Prevention |
|---------------|------------|
| SQL Injection | Parameterized queries |
| XSS | Output encoding, CSP |
| CSRF | Anti-CSRF tokens |
| Command Injection | Input validation, escaping |
| Path Traversal | Whitelist allowed paths |
| XXE | Disable external entities |

### 7. API Security

**API Security Controls**:
```
Authentication:
├── API keys for service-to-service
├── OAuth 2.0 for user authorization
└── JWT for stateless sessions

Rate Limiting:
├── Per-user limits
├── Per-IP limits
├── Per-endpoint limits
└── Graceful degradation

Input Validation:
├── Schema validation
├── Type checking
├── Size limits
└── Encoding validation

Output Encoding:
├── JSON encoding
├── XML encoding
└── Content-Type enforcement
```

**API Security Checklist**:
- [ ] Authentication required
- [ ] Authorization checked per endpoint
- [ ] Rate limiting implemented
- [ ] Input validation applied
- [ ] Output encoding applied
- [ ] Error messages sanitized
- [ ] Sensitive data not in URLs
- [ ] HTTPS enforced

### 8. Infrastructure Security

**Network Security**:
```
Network Controls:
├── Firewall rules (allowlist)
├── Network segmentation
├── VPN for admin access
├── Bastion hosts
└── DDoS protection
```

**Host Security**:
```
Host Hardening:
├── Minimal OS installation
├── Unnecessary services disabled
├── Security patches applied
├── Host-based firewall
├── Intrusion detection
└── File integrity monitoring
```

**Container Security**:
```
Container Controls:
├── Minimal base images
├── Vulnerability scanning
├── Read-only filesystem
├── Non-root user
├── Resource limits
└── Network policies
```

### 9. Dependency Security

**Dependency Management**:
```
Dependency Controls:
├── Dependency scanning (automated)
├── Vulnerability database updates
├── Patch management process
├── Dependency pinning
├── License compliance
└── Dependency audit
```

**Vulnerability Response**:
```
Critical: Patch within 24 hours
High: Patch within 7 days
Medium: Patch within 30 days
Low: Patch in next release
```

### 10. Logging and Monitoring

**Security Logging**:
```
Log Events:
├── Authentication events (success/failure)
├── Authorization failures
├── Privilege changes
├── Configuration changes
├── Data access (sensitive)
├── API access
└── Security events
```

**Log Protection**:
- Centralized logging
- Log integrity protection
- Access controls on logs
- Retention policies
- Anonymization where appropriate

**Security Monitoring**:
```
Alert Conditions:
├── Multiple failed logins
├── Privilege escalation
├── Unusual access patterns
├── Data exfiltration indicators
├── Vulnerability detection
└── Compliance violations
```

### 11. Compliance Review

**Common Compliance Frameworks**:

| Framework | Focus | Requirements |
|-----------|-------|--------------|
| PCI DSS | Payment data | Encryption, access control |
| HIPAA | Health data | Privacy, security |
| GDPR | Personal data | Consent, rights |
| SOC 2 | Service controls | Security, availability |
| ISO 27001 | Information security | ISMS |

**Compliance Checklist**:
- [ ] Applicable regulations identified
- [ ] Data processing documented
- [ ] Privacy impact assessment completed
- [ ] Security controls mapped to requirements
- [ ] Audit trail maintained
- [ ] Incident response plan documented
- [ ] Regular compliance audits scheduled

## Evaluation Criteria

### Security Maturity Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Authentication | Basic password | MFA available | MFA enforced |
| Authorization | Coarse-grained | Role-based | Fine-grained |
| Encryption | Some encryption | Encryption standard | Defense in depth |
| Monitoring | Logs only | Security alerts | SIEM, threat intel |
| Compliance | Ad-hoc | Documented | Automated |

## Trade-offs

### Security vs Usability

| Priority | Approach | Trade-off |
|----------|----------|-----------|
| High security | Strict controls | Lower usability |
| Balanced | Risk-based controls | Moderate usability |
| High usability | Minimal controls | Higher risk |

**Guidance**: Risk-based approach, secure by default

### Security vs Performance

| Approach | Security | Performance |
|----------|----------|-------------|
| Encryption everywhere | High | Lower |
| Selective encryption | Medium | Higher |

**Guidance**: Encrypt sensitive data, optimize where appropriate

## Validation Checklist

- [ ] Assets identified and classified
- [ ] Threat model created
- [ ] Authentication reviewed
- [ ] Authorization reviewed
- [ ] Data protection implemented
- [ ] Input validation applied
- [ ] API security implemented
- [ ] Infrastructure hardened
- [ ] Dependencies scanned
- [ ] Logging and monitoring configured
- [ ] Compliance requirements met

## Common Pitfalls

1. **Security by obscurity**: Relying on secrecy
2. **Trusting user input**: Not validating
3. **Over-permissive access**: Too broad permissions
4. **Missing encryption**: Data unprotected
5. **No monitoring**: Blind to attacks
6. **Outdated dependencies**: Known vulnerabilities
7. **Hardcoded secrets**: Credentials in code
8. **No incident plan**: Unprepared for breaches

## References

- Release It! (Nygard)
- Designing Data-Intensive Applications (Kleppmann)
- Building Microservices (Newman)
- OWASP Guidelines

## Related Capabilities

- Architecture Review
- API Design
- System Design
- Deployment Planning
- Resilience Engineering
