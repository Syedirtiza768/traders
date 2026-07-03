# Latest Research Index

## Purpose

Document all sources researched, versions verified, and dates of verification for the knowledgebase.

**Last Updated**: June 28, 2026

---

## Technology Versions Verified

### Backend Frameworks

| Technology | Version | Source | Verified |
|---|---|---|---|
| NestJS | v11.1.27 | npmjs.com/package/@nestjs/core | June 2026 |
| Node.js | v24 LTS (Krypton), v26 Current | nodejs.org/en/blog/release/v26.0.0 | June 2026 |
| TypeScript | v6.0 stable, v7.0 RC (Go-based) | devblogs.microsoft.com/typescript | June 2026 |

### Frontend Frameworks

| Technology | Version | Source | Verified |
|---|---|---|---|
| Next.js | v16.2.9 | nextjs.org/docs/app/guides/upgrading/version-16 | June 2026 |
| React | v19.2.7 | react.dev/versions | June 2026 |
| Tailwind CSS | v4.3 | tailwindcss.com/blog/tailwindcss-v4 | June 2026 |

### Databases and ORMs

| Technology | Version | Source | Verified |
|---|---|---|---|
| PostgreSQL | v17 stable, v18 stable, v19 beta | postgresql.org/support/versioning | June 2026 |
| Prisma | v7.3.0 | prisma.io/changelog | June 2026 |
| Drizzle ORM | v0.30+ | orm.drizzle.team/docs/latest-releases | June 2026 |

### Testing

| Technology | Version | Source | Verified |
|---|---|---|---|
| Vitest | v3+ | vitest.dev | June 2026 |
| Playwright | v1.52+ | playwright.dev/docs/release-notes | June 2026 |

### Infrastructure

| Technology | Version | Source | Verified |
|---|---|---|---|
| Docker | v28 | brillicaservices.com | June 2026 |
| Kubernetes | v1.36 | kubernetes.io/releases | June 2026 |
| BullMQ | v5.66.5 | docs.bullmq.io/changelog | June 2026 |

### Security

| Technology | Version | Source | Verified |
|---|---|---|---|
| OWASP Top 10 | 2025 Edition (8th) | owasp.org/Top10/2025 | June 2026 |

---

## Key Findings from Research

### NestJS v11

- **Source**: tirnav.com/blog/nestjs-11-whats-new, docs.nestjs.com
- NestJS 11 is the enterprise standard for Node.js backend development
- Reduced boilerplate, competitive with lighter frameworks like Hono/Fastify
- Official courses on architecture: N-Tier, Hexagonal, DDD
- @nestjs/bullmq for queue processing (Bull is in maintenance mode)
- Official recommendation: BullMQ over Bull for new projects

### Next.js v16

- **Source**: nextjs.org/docs/app/guides/upgrading/version-16
- Turbopack stable and default (no --turbopack flag needed)
- Async Request APIs fully enforced (sync access removed)
- React 19.2 with View Transitions, useEffectEvent, Activity
- React Compiler support stable (opt-in via reactCompiler: true)
- Partial Prerendering via cacheComponents: true (stable)
- middleware renamed to proxy (Node.js runtime only)
- revalidateTag requires cacheLife profile (breaking)
- New updateTag API for read-your-writes semantics
- New refresh API for client router refresh from Server Actions
- cacheLife and cacheTag stable (no unstable_ prefix)
- AMP support removed
- next lint removed (use ESLint/Biome directly)
- Runtime configuration removed (use env vars)
- Build Adapters API stable in 16.2
- Node.js 20.9+ minimum
- ESLint Flat Config default

### React v19

- **Source**: react.dev/versions
- React 19.2.7 is latest stable
- View Transitions API
- useEffectEvent for non-reactive logic in Effects
- Activity component for background rendering
- React Compiler 1.0 released (auto-memoization)
- Server Components mature
- Server Actions stable

### PostgreSQL

- **Source**: postgresql.org/support/versioning
- v17 and v18 are current stable releases
- v19 beta released June 2026, GA planned September 2026
- Recommended for new projects: v18

### TypeScript

- **Source**: devblogs.microsoft.com/typescript, devnewsletter.com
- TypeScript 6.0 released March 2026 (transitional)
- TypeScript 7.0 RC released, GA mid-2026
- v7.0 uses Go-based compiler (10x+ faster builds)
- v6.0 is last release on old codebase
- Recommended for production: v6.0 until v7.0 GA

### OWASP Top 10:2025

- **Source**: owasp.org/Top10/2025
- 8th installment, released late 2025
- New categories: A03:2025 Software Supply Chain Failures, A10:2025 Mishandling of Exceptional Conditions
- SSRF rolled into Broken Access Control
- Security Misconfiguration moved up to #2
- Supply Chain Failures expanded from Vulnerable Components
- 248 CWEs across 10 categories (up from ~400 in 2021)
- Focus on root cause over symptoms

### Vitest vs Jest

- **Source**: sitepoint.com/vitest-vs-jest-2026, ecosire.com
- Vitest is 10x faster than Jest on large suites
- Native ESM support
- Jest-compatible API (easy migration)
- Recommended for all new projects

### Tailwind CSS v4

- **Source**: tailwindcss.com/blog/tailwindcss-v4
- CSS-first configuration (no tailwind.config.js)
- 5x faster full builds
- One import setup
- v4.3 is latest stable

---

## Sources Consulted

### Official Documentation

1. **NestJS**: https://docs.nestjs.com
2. **Next.js**: https://nextjs.org/docs
3. **React**: https://react.dev
4. **PostgreSQL**: https://www.postgresql.org/docs/
5. **TypeScript**: https://www.typescriptlang.org/docs/
6. **Node.js**: https://nodejs.org/en/docs
7. **Prisma**: https://www.prisma.io/docs
8. **Drizzle ORM**: https://orm.drizzle.team/docs
9. **BullMQ**: https://docs.bullmq.io
10. **Tailwind CSS**: https://tailwindcss.com/docs
11. **Vitest**: https://vitest.dev
12. **Playwright**: https://playwright.dev/docs
13. **OWASP**: https://owasp.org/Top10/2025
14. **Kubernetes**: https://kubernetes.io/docs
15. **Docker**: https://docs.docker.com

### Release Notes and Changelogs

1. NestJS releases: https://github.com/nestjs/nest/releases
2. Next.js releases: https://github.com/vercel/next.js/releases
3. React versions: https://react.dev/versions
4. Prisma changelog: https://www.prisma.io/changelog
5. BullMQ changelog: https://docs.bullmq.io/changelog
6. TypeScript releases: https://github.com/microsoft/typescript/releases
7. Node.js releases: https://nodejs.org/en/about/previous-releases
8. Playwright release notes: https://playwright.dev/docs/release-notes
9. Kubernetes releases: https://kubernetes.io/releases/

### Analysis and Expert Sources

1. NestJS 11 analysis: https://tirnav.com/blog/nestjs-11-whats-new
2. Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
3. Vitest vs Jest 2026: https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/
4. OWASP 2025 analysis: https://about.gitlab.com/blog/2025-owasp-top-10-whats-changed-and-why-it-matters/
5. TypeScript 2026 state: https://devnewsletter.com/p/state-of-typescript-2026/
6. Prisma 7 announcement: https://www.prisma.io/blog/announcing-prisma-orm-7-0-0
7. Prisma Next (v8) roadmap: https://www.prisma.io/blog/the-next-evolution-of-prisma-orm
8. NestJS architecture patterns: https://medium.com/@sebastian.iwanczyszyn/building-maintainable-nestjs-apps-with-clean-architecture-056248f04cef

---

## June 2026 Knowledgebase Expansion

### New Sections Added

| Section | Files | Purpose |
|---|---|---|
| ai-agents/ | 6 files | AI coding agent workflows and protocols |
| documentation/ | 7 files | Documentation templates and standards |
| checklists/ | 6 files | Readiness checklists for production, enterprise, SaaS, security, AI, deployment |
| testing/ (expanded) | +4 files | E2E, contract, performance, security testing |

### AI Agents Section

- **ai-agent-workflows.md**: Standard workflows for understanding codebases, making changes, investigating bugs, implementing features, and refactoring
- **repository-master-context.md**: Template for creating comprehensive repository context documents for AI agents and new developers
- **coding-agent-operating-protocol.md**: Step-by-step operating protocol for AI coding agents (Understand → Plan → Read → Implement → Verify → Report)
- **gap-analysis-protocol.md**: Protocols for frontend-backend gap analysis, database-code alignment, API contract verification, and permission gap analysis
- **documentation-sync-protocol.md**: Protocols for keeping documentation synchronized with implementation
- **code-review-protocol.md**: AI code review protocol covering correctness, security, performance, maintainability, and testing

### Documentation Templates

- **documentation-standards.md**: Documentation principles, naming conventions, markdown standards, and file organization
- **prd-template.md**: Product Requirements Document template with user stories, requirements, and success metrics
- **technical-spec-template.md**: Technical specification template with architecture, database changes, API changes, and implementation details
- **adr-template.md**: Architecture Decision Record template with options considered, rationale, and consequences
- **runbook-template.md**: Operational runbook template with step-by-step procedures and troubleshooting
- **handoff-template.md**: Operational handoff template for transferring responsibility between teams
- **incident-report-template.md**: Incident report template with timeline, root cause analysis, and prevention measures

### Checklists

- **production-readiness.md**: Comprehensive production readiness checklist covering application, database, auth, API, security, performance, monitoring, testing, deployment, and documentation
- **enterprise-readiness.md**: Enterprise readiness checklist covering security, compliance, multi-tenancy, scalability, HA, DR, and billing
- **saas-readiness.md**: SaaS-specific readiness checklist covering tenant management, billing, feature flags, onboarding, and customer portal
- **security-readiness.md**: Security checklist mapped to OWASP Top 10:2025 with frontend, backend, database, infrastructure, and CI/CD sections
- **ai-agent-readiness.md**: Checklist for verifying codebases are ready for AI coding agents
- **deployment-readiness.md**: Deployment readiness checklist with pre-deployment, environment, security, performance, and post-deployment sections

### Testing Expansion

- **e2e-testing.md**: Playwright E2E testing patterns including page objects, auth flows, CRUD tests, multi-tenant tests, API tests, and CI integration
- **contract-testing.md**: API contract testing patterns using shared types, OpenAPI specs, and Zod schemas
- **performance-testing.md**: Performance testing with k6 load testing, Lighthouse CI, database benchmarks, and performance budgets
- **security-testing.md**: Security testing covering SAST, DAST, dependency auditing, container scanning, and security-specific test cases

---

## Areas Requiring Periodic Re-verification

- **TypeScript 7.0**: GA expected mid-2026, verify Go-based compiler stability
- **PostgreSQL 19**: GA expected September 2026
- **Next.js**: Rapid release cycle, verify minor version changes monthly
- **Prisma Next (v8)**: In development, verify when available
- **Node.js release schedule**: Changing to annual cycle starting v27
- **OWASP**: Updated every 3-4 years, next update ~2028-2029
- **Kubernetes**: 3 minor releases per year, verify support windows
- **React Compiler**: Opt-in, verify when it becomes default
