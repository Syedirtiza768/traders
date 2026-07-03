# Recommended Default Technology Stack

## Purpose

Define a default, project-agnostic technology stack for modern enterprise applications. Each choice is justified with tradeoffs and alternatives.

**Last Verified**: June 2026

---

## Stack Overview

| Layer | Recommended | Version | Alternatives |
|---|---|---|---|
| Frontend Framework | Next.js (App Router) | v16.x | Remix, Nuxt, SvelteKit |
| UI Library | React | v19.x | Vue 3, Svelte 5, Solid |
| Component Library | shadcn/ui | Latest | Radix, Mantine, Ant Design |
| CSS Framework | Tailwind CSS | v4.x | CSS Modules, Panda CSS |
| Backend Framework | NestJS | v11.x | Fastify, Hono, Express |
| Language | TypeScript | v6.x | - |
| Runtime | Node.js | v24 LTS | Bun, Deno |
| Database | PostgreSQL | v18 | MySQL 8, SQLite |
| ORM | Prisma | v7.x | Drizzle, TypeORM, Knex |
| Query Builder | Drizzle | v0.30+ | Kysely, Knex |
| Authentication | Custom JWT + Passport | - | NextAuth, Clerk, Auth0 |
| Authorization | CASL / custom RBAC | - | Oso, Cerbos |
| Validation | Zod | Latest | class-validator, io-ts |
| API Documentation | OpenAPI 3.1 + Swagger | - | GraphQL Schema, tRPC |
| Testing | Vitest | v3+ | Jest |
| E2E Testing | Playwright | v1.52+ | Cypress |
| Queue System | BullMQ + Redis | v5.x | Temporal, AWS SQS |
| Cache | Redis | v7+ | Memcached, Valkey |
| File Storage | S3-compatible (MinIO/AWS) | - | Cloudflare R2, Azure Blob |
| Email | Resend / AWS SES | - | SendGrid, Postmark |
| Observability | OpenTelemetry + Grafana | - | Datadog, New Relic |
| Logging | Pino | Latest | Winston, Bunyan |
| CI/CD | GitHub Actions | - | GitLab CI, CircleCI |
| Monorepo | Turborepo | Latest | Nx |
| Package Manager | pnpm | Latest | npm, yarn |
| Code Quality | Biome + ESLint | Latest | Prettier |
| IaC | Terraform / OpenTofu | Latest | Pulumi, AWS CDK |
| Container | Docker + Docker Compose | v28 | Podman |
| Orchestration | Kubernetes | v1.36 | Docker Swarm, ECS |
| Reverse Proxy | Nginx / Caddy | Latest | Traefik |
| CDN | Cloudflare | - | AWS CloudFront, Fastly |
| Documentation | Markdown + MDX | - | Notion, GitBook |

---

## Detailed Recommendations

### Frontend: Next.js (App Router)

**Why**: Next.js 16 with App Router is the most mature React framework for enterprise applications. Server Components reduce client-side JavaScript. Server Actions simplify mutations. Turbopack provides fast builds. Vercel provides excellent deployment DX.

**When to use**: 
- SaaS applications with SEO requirements
- Applications needing SSR/SSG/PPR
- Teams wanting opinionated structure
- Applications with complex routing needs

**When NOT to use**:
- Pure SPAs with no SEO needs (consider Vite + React)
- Mobile apps (use React Native)
- Extremely simple static sites (use Astro)

**Alternatives**:
- **Remix**: Better progressive enhancement, simpler mental model
- **SvelteKit**: Better performance for small teams, smaller bundle
- **Astro**: Best for content-heavy sites

**Tradeoffs**:
- Vercel ecosystem lock-in (mitigated by Build Adapters API in v16.2)
- Rapid release cycle requires frequent updates
- Learning curve for Server Components paradigm
- Node.js 20.9+ minimum requirement

**Production concerns**: Monitor Turbopack stability. Cache Components (PPR) is stable but opt-in. Use proxy.ts instead of middleware.ts.

---

### Backend: NestJS

**Why**: NestJS 11 is the enterprise standard for Node.js. Provides structured architecture, dependency injection, modular design, and rich ecosystem. Official courses cover DDD, Hexagonal, and Clean Architecture patterns.

**When to use**:
- Enterprise applications requiring structured architecture
- Teams transitioning from Java/C#/Spring backgrounds
- Applications needing clear module boundaries
- APIs with complex business logic

**When NOT to use**:
- Simple CRUD APIs (use Fastify or Hono)
- Serverless functions (use framework-agnostic handlers)
- Real-time-heavy applications (consider Socket.io directly)

**Alternatives**:
- **Fastify**: Lighter, faster, less opinionated
- **Hono**: Ultra-lightweight, edge-ready
- **Express**: Legacy, minimal structure

**Tradeoffs**:
- More boilerplate than lightweight frameworks
- Learning curve for DI and decorators
- TypeScript strongly recommended (not required)

**Production concerns**: Use @nestjs/bullmq (not @nestjs/bull). Bull is in maintenance mode.

---

### Database: PostgreSQL

**Why**: Most capable open-source relational database. Excellent for complex queries, JSONB support, full-text search, row-level security, and extensions ecosystem. Strong multi-tenancy support.

**When to use**:
- Any application with relational data
- Applications needing JSONB flexibility
- Multi-tenant applications
- Applications requiring full-text search
- Applications needing PostGIS for geospatial data

**When NOT to use**:
- Simple key-value caching (use Redis)
- Time-series heavy workloads (use TimescaleDB extension or ClickHouse)
- Document-only workloads without relations (use MongoDB)

**Alternatives**:
- **MySQL 8**: Simpler, wider hosting support
- **SQLite**: Embedded, single-file, zero-config
- **CockroachDB**: Distributed SQL

**Tradeoffs**:
- More complex than MySQL for simple use cases
- Requires connection pooling for production
- Replication setup more complex than MySQL

**Production concerns**: Use connection pooling (pgBouncer or built-in). Plan for point-in-time recovery. Use read replicas for read-heavy workloads.

---

### ORM: Prisma + Drizzle

**Recommended approach**: Use Prisma for schema management and migrations, Drizzle for query building when Prisma's query API is insufficient.

**Prisma Why**: Type-safe client generation, excellent migration system, broad database support, strong ecosystem. v7 is Rust-free with improved performance.

**Drizzle Why**: SQL-like query builder, excellent TypeScript inference, zero runtime overhead, great for complex queries.

**When to use Prisma**:
- Standard CRUD operations
- Schema-first development
- Team prefers generated types
- Multi-database support needed

**When to use Drizzle**:
- Complex SQL queries needed
- Performance-critical queries
- Team prefers SQL-like syntax
- Fine-grained query control needed

**When NOT to use ORM**:
- Extremely performance-critical queries (use raw SQL)
- Complex analytical queries (use raw SQL)
- Bulk operations (use raw SQL or Prisma's raw methods)

**Production concerns**: Prisma v7 removed Rust engine. Use compilerBuild: 'small' for production. Monitor Prisma Next (v8) development.

---

### Validation: Zod

**Why**: TypeScript-first schema validation. Composable, type-inferable, works across frontend and backend. De facto standard in TypeScript ecosystem.

**When to use**: All TypeScript applications for input validation, API contract validation, environment variable validation.

**Alternatives**:
- **class-validator**: NestJS integration, decorator-based
- **io-ts**: Functional approach, runtime type system
- **Valibot**: Smaller bundle size, similar API to Zod

---

### Testing: Vitest + Playwright

**Vitest Why**: 10x faster than Jest on large suites, native ESM support, Jest-compatible API, excellent TypeScript support.

**Playwright Why**: Cross-browser testing, auto-waiting, excellent debugging, CI-friendly, supports API testing.

**When to use Vitest**: All unit and integration tests.

**When to use Playwright**: E2E tests, cross-browser testing, visual regression testing.

**Alternatives**:
- **Jest**: Legacy, slower, but mature ecosystem
- **Cypress**: Good DX but single-tab limitation
- **Testing Library**: Use WITH Vitest for component testing

---

### Queue System: BullMQ

**Why**: Actively maintained, TypeScript-native, Redis-backed, rich feature set (priorities, delays, retries, rate limiting, job scheduling). Official NestJS integration.

**When to use**: Email sending, file processing, report generation, webhook delivery, scheduled tasks.

**When NOT to use**:
- Simple pub/sub (use Redis directly)
- Complex workflows (consider Temporal)
- Serverless environments (use AWS SQS or similar)

**Alternatives**:
- **Temporal**: Complex workflows, durable execution
- **AWS SQS**: Serverless, managed
- **RabbitMQ**: Enterprise message broker

---

### Observability: OpenTelemetry + Grafana

**Why**: OpenTelemetry is the vendor-neutral standard for observability. Grafana provides visualization, alerting, and log aggregation. Together they provide full observability without vendor lock-in.

**Components**:
- **Tracing**: OpenTelemetry SDK
- **Metrics**: OpenTelemetry + Prometheus
- **Logging**: Pino + Loki
- **Visualization**: Grafana
- **Alerting**: Grafana Alerting

**Alternatives**:
- **Datadog**: Fully managed, expensive at scale
- **New Relic**: APM-focused, generous free tier
- **Sentry**: Error tracking focused

---

### Monorepo: Turborepo

**Why**: Simple configuration, excellent caching, works with any package manager, minimal learning curve. Vercel-backed.

**When to use**: Teams with shared packages, frontend + backend in same repo, shared configurations.

**Alternatives**:
- **Nx**: More features, steeper learning curve, better for large teams
- **Lerna**: Legacy, use only if already adopted

---

### Package Manager: pnpm

**Why**: Fast, disk-efficient, strict dependency resolution, excellent monorepo support.

**When to use**: All new projects.

**Alternatives**:
- **npm**: Default, slower, less strict
- **yarn**: Berry (v4) is good but smaller ecosystem

---

### Code Quality: Biome + ESLint

**Biome Why**: Fast (written in Rust), replaces Prettier + ESLint for basic formatting and linting.

**ESLint Why**: Rich plugin ecosystem for framework-specific rules (Next.js, React, NestJS).

**Recommended approach**: Biome for formatting and basic linting, ESLint for framework-specific rules.

---

## Stack Variants

### Small Project / MVP

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Next.js Route Handlers + Server Actions |
| Database | PostgreSQL (Supabase/Neon) |
| ORM | Prisma |
| Auth | NextAuth / Clerk |
| Deploy | Vercel |

### Enterprise SaaS

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma + Drizzle |
| Auth | Custom JWT + Passport |
| Queue | BullMQ + Redis |
| Deploy | Kubernetes / Docker |

### Data-Heavy Application

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | NestJS |
| Database | PostgreSQL + read replicas |
| Query | Drizzle + raw SQL |
| Cache | Redis |
| Search | PostgreSQL FTS or Elasticsearch |
| Deploy | Docker + dedicated DB server |
