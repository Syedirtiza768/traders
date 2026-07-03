# Enterprise Engineering Knowledgebase

## Purpose

A permanent, project-agnostic engineering reference for building modern enterprise-grade full-stack applications. This knowledgebase reflects the latest stable best practices, current official recommendations, modern architecture patterns, and state-of-the-art approaches as of **June 2026**.

## Scope

This knowledgebase is designed to be:

- **Project-agnostic**: Reusable across SaaS platforms, CRMs, ERPs, marketplaces, internal tools, automation systems, data-heavy systems, and enterprise portals
- **Technology-current**: Based on verified research of latest stable versions and official documentation
- **Practical**: Focused on production-ready patterns, not theoretical ideals
- **Dual-audience**: Useful for both human developers and AI coding agents
- **Opinionated**: Clear recommendations with documented tradeoffs

## Technology Versions Verified (June 2026)

| Technology | Latest Stable | Status |
|---|---|---|
| NestJS | v11.x | Stable, enterprise standard |
| Next.js | v16.2 | Stable, App Router mature |
| React | v19.2 | Stable, Compiler 1.0 released |
| PostgreSQL | v17 (v18 stable, v19 beta) | Stable, v18 recommended for new projects |
| TypeScript | v6.0 (v7.0 RC) | v6.0 stable, v7.0 Go-based compiler mid-2026 |
| Node.js | v24 LTS / v26 Current | v24 LTS recommended for production |
| Prisma | v7.3 | Stable, Rust-free client |
| Drizzle ORM | v0.30+ | Stable, codec rework |
| BullMQ | v5.66 | Stable, actively maintained |
| Tailwind CSS | v4.3 | Stable, CSS-first config |
| Vitest | v3+ | Stable, 10x faster than Jest |
| Playwright | v1.52+ | Stable, E2E standard |
| Docker | v28 | Stable |
| Kubernetes | v1.36 | Stable |
| OWASP Top 10 | 2025 Edition | Current |

## File Structure

```
knowledgebase/
  README.md                          # This file
  latest-research-index.md           # Research sources and verification dates
  recommended-stack.md               # Default technology stack recommendation
  technology-decision-matrix.md      # Technology comparison matrix

  architecture/
    full-stack-architecture.md       # End-to-end architecture guidance
    enterprise-saas-architecture.md  # SaaS-specific patterns
    modular-monolith.md              # Modular monolith architecture
    microservices.md                 # Microservices patterns
    event-driven-architecture.md     # Event-driven patterns
    clean-architecture.md            # Clean Architecture
    hexagonal-architecture.md        # Hexagonal/Ports & Adapters
    multi-tenancy.md                 # Multi-tenancy patterns

  backend/
    nestjs-modern-standards.md       # NestJS v11 best practices
    nodejs-modern-standards.md       # Node.js v24 LTS patterns
    api-design.md                    # REST, GraphQL, gRPC design
    authentication-authorization.md  # Auth patterns and implementation
    background-jobs-queues.md        # BullMQ, job processing
    realtime-websockets.md           # WebSocket and real-time patterns

  frontend/
    nextjs-modern-standards.md       # Next.js v16 App Router patterns
    react-modern-standards.md        # React v19 patterns
    frontend-architecture.md         # Frontend architecture principles
    design-system.md                 # Design system with shadcn/ui + Tailwind
    state-management.md              # State management patterns
    accessibility.md                 # Accessibility standards

  database/
    postgresql-modern-standards.md   # PostgreSQL v18 patterns
    database-design.md               # Schema design principles
    migrations.md                    # Migration strategies
    indexing-performance.md          # Indexing and query optimization
    multi-tenant-data-modeling.md    # Multi-tenant data patterns
    backup-restore.md                # Backup and disaster recovery

  security/
    security-standards.md            # Overall security framework
    owasp-checklist.md               # OWASP Top 10:2025 checklist
    auth-security.md                 # Authentication security
    api-security.md                  # API security patterns
    infrastructure-security.md       # Infrastructure security
    ai-code-security.md              # AI-generated code security

  devops/
    devops-deployment.md             # Deployment strategies
    docker.md                        # Container best practices
    ci-cd.md                         # CI/CD pipeline design
    cloud-deployment.md              # AWS, Azure, GCP patterns
    observability.md                 # Logging, metrics, tracing
    disaster-recovery.md             # DR planning
    vps-deployment.md                # Small-scale VPS deployment

  testing/
    testing-quality.md               # Testing strategy overview
    backend-testing.md               # NestJS and Node.js testing
    frontend-testing.md              # React and Next.js testing
    e2e-testing.md                   # End-to-end testing with Playwright
    contract-testing.md              # API contract testing
    performance-testing.md           # Load and performance testing
    security-testing.md              # Security testing practices

  ai-agents/
    ai-agent-workflows.md            # AI agent codebase workflows
    repository-master-context.md     # Repository context documents
    coding-agent-operating-protocol.md # Standard AI agent protocol
    gap-analysis-protocol.md         # Frontend-backend gap analysis
    documentation-sync-protocol.md   # Documentation synchronization
    code-review-protocol.md          # AI code review protocol

  documentation/
    documentation-standards.md       # Documentation standards
    prd-template.md                  # Product Requirements Document
    technical-spec-template.md       # Technical Specification
    adr-template.md                  # Architecture Decision Record
    runbook-template.md              # Operational Runbook
    handoff-template.md              # Operational Handoff Document
    incident-report-template.md      # Incident Report

  checklists/
    production-readiness.md          # Production readiness checklist
    enterprise-readiness.md          # Enterprise readiness checklist
    saas-readiness.md                # SaaS readiness checklist
    security-readiness.md            # Security readiness checklist
    ai-agent-readiness.md            # AI agent readiness checklist
    deployment-readiness.md          # Deployment readiness checklist
```

**Total files**: 69 Markdown files across 10 directories

## How to Use

### For Human Developers

1. Start with `recommended-stack.md` for technology choices
2. Reference architecture docs when designing systems
3. Use backend/frontend docs for implementation patterns
4. Consult security docs before deployment
5. Use checklists before production releases
6. Use templates for documentation

### For AI Coding Agents

1. Read `ai-agents/coding-agent-operating-protocol.md` first
2. Use `ai-agents/repository-master-context.md` template for new repos
3. Reference technology-specific docs when working on code
4. Use gap-analysis and documentation-sync protocols
5. Consult checklists before claiming completion

## Maintenance

- **Review cycle**: Quarterly review recommended
- **Update triggers**: Major framework releases, security advisories, architecture shifts
- **Last comprehensive review**: June 2026
- **Next recommended review**: September 2026

## Sources

See `latest-research-index.md` for complete source documentation.
