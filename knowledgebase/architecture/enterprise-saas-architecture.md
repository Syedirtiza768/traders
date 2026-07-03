# Enterprise SaaS Architecture

## Purpose

Define architecture patterns specific to multi-tenant SaaS applications serving enterprise customers.

**Last Verified**: June 2026

---

## SaaS Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SaaS Platform                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Customer     │  │ Admin        │  │ Public       │      │
│  │ Portal       │  │ Portal       │  │ Website      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     API Gateway                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Rate     │  │ Auth     │  │ Tenant   │  │ Routing  │   │
│  │ Limiting │  │ Validate │  │ Resolve  │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     Backend Services                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Tenant   │  │ User     │  │ Billing  │  │ Feature  │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Auth     │  │ Notif.   │  │ File     │  │ Audit    │   │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │  Redis   │  │    S3    │  │  Search  │   │
│  │(per-     │  │ (cache)  │  │ (files)  │  │(elastic) │   │
│  │ tenant)  │  │          │  │          │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Models

### Shared Database, Shared Schema

**Approach**: All tenants share the same database and tables. Tenant isolation via tenant_id column.

**Pros**:
- Simplest to manage
- Lowest infrastructure cost
- Easy cross-tenant analytics
- Single migration set

**Cons**:
- Risk of data leakage if tenant_id not properly filtered
- Noisy neighbor problems
- Harder to meet compliance requirements (HIPAA, SOC 2)
- Cannot customize schema per tenant

**When to use**: SMB SaaS, <1000 tenants, no strict compliance requirements.

### Shared Database, Separate Schemas

**Approach**: Each tenant gets their own schema within the same database.

**Pros**:
- Better isolation than shared schema
- Per-tenant schema customization possible
- Easier backup/restore per tenant
- Good compliance posture

**Cons**:
- More complex migrations (must run per schema)
- Connection pool pressure with many schemas
- Harder cross-tenant queries
- PostgreSQL schema limits

**When to use**: Mid-market SaaS, 100-10000 tenants, moderate compliance requirements.

### Separate Database per Tenant

**Approach**: Each tenant gets their own database instance.

**Pros**:
- Strongest isolation
- Per-tenant backup/restore
- No noisy neighbor
- Best compliance posture
- Independent scaling possible

**Cons**:
- Highest infrastructure cost
- Complex connection management
- Complex migrations
- Harder cross-tenant analytics

**When to use**: Enterprise SaaS, <100 tenants, strict compliance (HIPAA, SOC 2), large tenants.

### Hybrid (Recommended for Enterprise SaaS)

**Approach**: Shared database for small tenants, dedicated database for enterprise tenants.

**Pros**:
- Cost-effective for small tenants
- Strong isolation for enterprise tenants
- Flexible pricing tiers
- Graduated compliance posture

**Cons**:
- Most complex to implement
- Must maintain multiple code paths
- Migration complexity

**When to use**: Mixed customer base, tiered pricing, varied compliance needs.

---

## Tenant Resolution

### Subdomain-Based

```
tenant-name.app.com
```

**Implementation**:
- Extract tenant from subdomain in proxy/middleware
- Resolve tenant ID from subdomain
- Attach tenant context to request

**Best for**: Customer-facing portals.

### Header-Based

```
X-Tenant-ID: tenant-uuid
```

**Implementation**:
- Validate tenant ID in authentication
- Attach tenant context to request

**Best for**: API-only services.

### JWT Claim-Based

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "roles": ["admin"]
}
```

**Implementation**:
- Extract tenant from JWT claims
- Validate user belongs to tenant
- Attach tenant context to request

**Best for**: Single sign-on, multi-tenant API.

---

## Core SaaS Features

### Tenant Management

- Tenant provisioning and deprovisioning
- Tenant configuration and customization
- Tenant data isolation and security
- Tenant usage tracking and metering

### User Management

- User invitation and onboarding
- Role-based access control per tenant
- Team management within tenant
- User activity tracking

### Billing and Subscription

- Subscription plan management
- Usage-based billing
- Invoice generation
- Payment processing (Stripe)
- Plan upgrade/downgrade
- Trial management
- Grace period handling

### Feature Flags

- Per-tenant feature flags
- Plan-based feature gating
- Gradual rollout
- A/B testing support

### Audit Logging

- All data mutations logged
- User action tracking
- IP address and user agent logging
- Compliance-ready audit trail
- Retention policy management

---

## API Design for SaaS

### Tenant-Scoped Endpoints

```
GET /api/v1/tenants/{tenantId}/users
POST /api/v1/tenants/{tenantId}/projects
```

### Implicit Tenant Resolution

```
GET /api/v1/users    (tenant from JWT)
POST /api/v1/projects (tenant from JWT)
```

**Recommendation**: Use implicit tenant resolution from JWT for cleaner APIs. Reserve explicit tenant endpoints for admin/impersonation.

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "tenant_id": "...",
    "request_id": "...",
    "timestamp": "..."
  }
}
```

### Pagination

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## Infrastructure Architecture

### Production Topology

```
Internet → CDN → Load Balancer → App Servers (N+1)
                                      ↓
                              ┌───────┴───────┐
                              │               │
                         PostgreSQL       Redis Cluster
                         (Primary +       (Cache + Sessions)
                          Replicas)
                              │
                         ┌────┴────┐
                         │         │
                    pgBouncer   pgBouncer
                    (Read)      (Write)
```

### Environment Strategy

| Environment | Purpose | Data | Access |
|---|---|---|---|
| Development | Local development | Seed data | Developers |
| Staging | Pre-production testing | Anonymized prod data | QA + Developers |
| Production | Live system | Real data | Operations |
| Preview | PR preview deployments | Test data | Developers |

---

## Compliance Architecture

### SOC 2 Requirements

- Access controls (RBAC, MFA)
- Audit logging (all data access)
- Encryption at rest and in transit
- Incident response procedures
- Change management process
- Vendor management
- Business continuity planning

### GDPR Requirements

- Data minimization
- Purpose limitation
- Storage limitation
- Data portability
- Right to erasure
- Consent management
- Data processing agreements

### HIPAA Requirements

- PHI encryption at rest and in transit
- Access controls with audit logging
- Business associate agreements
- Breach notification procedures
- Risk assessment documentation

---

## Scaling Patterns

### Horizontal Scaling

- Stateless API servers behind load balancer
- Database read replicas for read-heavy workloads
- Redis cluster for caching and sessions
- Queue workers scaled independently

### Vertical Scaling

- Database primary for write-heavy workloads
- File storage for large documents

### Auto-Scaling

- CPU/memory-based scaling for API servers
- Queue depth-based scaling for workers
- Connection pool monitoring for database

---

## Anti-Patterns

- **Storing tenant data without tenant_id**: Always include tenant context
- **Cross-tenant queries without explicit admin check**: Always verify permissions
- **Shared sessions across tenants**: Always scope sessions to tenant
- **Hard-coded tenant limits**: Use configuration or database
- **Missing tenant cleanup**: Implement data retention policies
- **Ignoring noisy neighbor**: Implement rate limiting per tenant
- **Single point of failure**: Design for redundancy at every layer

---

## Verification Checklist

- [ ] Tenant resolution implemented (subdomain/header/JWT)
- [ ] Tenant data isolation verified
- [ ] RBAC per tenant implemented
- [ ] Billing integration implemented
- [ ] Feature flags implemented
- [ ] Audit logging implemented
- [ ] Rate limiting per tenant configured
- [ ] Data retention policies defined
- [ ] Backup per tenant possible
- [ ] Compliance requirements documented
- [ ] Scaling strategy defined
- [ ] Monitoring per tenant available
