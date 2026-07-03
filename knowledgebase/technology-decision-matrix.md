# Technology Decision Matrix

## Purpose

Quick reference for technology decisions across common enterprise application requirements.

**Last Verified**: June 2026

---

## Architecture Decisions

### When to Choose Each Architecture

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| New SaaS product | Modular Monolith | Microservices (if >5 teams) | Big ball of mud |
| Enterprise with multiple teams | Microservices | Modular Monolith | Monolith without boundaries |
| Event-driven workflows | Event-Driven Architecture | CQRS + Event Sourcing | Synchronous chains |
| Complex business rules | Clean/Hexagonal Architecture | Domain-Driven Design | Anemic domain model |
| Simple CRUD API | Layered Architecture | - | Over-engineering |
| Real-time application | Event-Driven + WebSockets | SSE | Polling |

### Frontend Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| SEO-critical app | Next.js (SSR/SSG) | Nuxt, SvelteKit | SPA-only |
| Internal admin tool | Next.js (CSR) | Remix | Over-engineering SSR |
| Content-heavy site | Astro + React | Next.js SSG | Client-rendered |
| Dashboard/Analytics | Next.js + Client Components | - | Full SSR for dashboards |
| Mobile app | React Native | Flutter | WebView |
| Design system | shadcn/ui + Tailwind | Mantine, Radix | Custom from scratch |

### Backend Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| Enterprise API | NestJS | Fastify + plugins | Express (legacy) |
| Simple API | Fastify | Hono | NestJS (overhead) |
| Serverless functions | Hono | Fastify | NestJS (too heavy) |
| GraphQL API | NestJS + Apollo | Mercurius | REST for everything |
| Real-time API | NestJS + Socket.io | Socket.io directly | Polling |
| Microservice | NestJS + gRPC | Fastify | REST between services |

### Database Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| General purpose | PostgreSQL | MySQL 8 | SQLite (production) |
| Multi-tenant SaaS | PostgreSQL + schema isolation | Row-level security | Separate DB per tenant (small scale) |
| High read volume | PostgreSQL + read replicas | Redis cache | Single DB, no caching |
| Full-text search | PostgreSQL FTS | Elasticsearch | Application-level search |
| Time-series data | TimescaleDB (PG extension) | InfluxDB | Regular PG tables |
| Geospatial | PostGIS (PG extension) | - | Application-level calculations |
| Document store | PostgreSQL JSONB | MongoDB | Storing blobs in PG |

### ORM / Query Layer Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| Standard CRUD | Prisma | TypeORM | Raw SQL for everything |
| Complex queries | Drizzle | Kysely | Prisma for complex SQL |
| Schema management | Prisma Migrate | Drizzle Kit | Manual migrations |
| Performance-critical | Raw SQL | Drizzle | ORM overhead |
| Multi-database | Prisma | TypeORM | Single ORM for all |

### Testing Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| Unit testing | Vitest | Jest | No unit tests |
| Component testing | Vitest + Testing Library | - | Testing implementation details |
| E2E testing | Playwright | Cypress | Selenium (slow) |
| API testing | Vitest + supertest | Playwright API | Manual testing only |
| Load testing | k6 | Artillery | Manual load testing |
| Visual regression | Playwright | Chromatic | Manual visual checks |

### Deployment Decisions

| Scale | Recommended | Alternative | Avoid |
|---|---|---|---|
| Small / MVP | Vercel + Supabase | Railway, Render | Self-managed K8s |
| Startup SaaS | Docker + VPS | AWS ECS | Over-engineered infra |
| Enterprise | Kubernetes (EKS/GKE) | ECS | Single server |
| High-scale | Kubernetes + auto-scaling | ECS + Fargate | Manual scaling |

### Auth Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| Simple auth | NextAuth / Clerk | Auth0 | Custom from scratch |
| Enterprise SSO | Auth0 / Keycloak | Clerk | Custom SAML |
| Custom auth | JWT + Passport | Custom middleware | Storing passwords in plain text |
| Multi-tenant auth | JWT with tenant claims | Separate auth per tenant | Single tenant context |
| MFA | TOTP (authenticator app) | SMS (fallback only) | No MFA for sensitive ops |

### Caching Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| Session store | Redis | PostgreSQL | In-memory only |
| API response cache | Redis | CDN | No caching |
| Database query cache | Redis + Prisma middleware | PostgreSQL cache | Application-level only |
| Static assets | CDN (Cloudflare) | Nginx | App server serving static |
| Full-page cache | Next.js ISR/PPR | Varnish | No caching |

### File Storage Decisions

| Requirement | Recommended | Alternative | Avoid |
|---|---|---|---|
| General file storage | S3-compatible (AWS/MinIO) | Cloudflare R2 | Local filesystem |
| User uploads | S3 + presigned URLs | Uploadthing | Direct upload to app |
| Images | S3 + CDN + next/image | Cloudinary | Raw image serving |
| Documents | S3 + virus scanning | - | Storing in database |

---

## Decision Framework

### For Each Decision, Evaluate:

1. **Team expertise**: Does the team know this technology?
2. **Community support**: Is the community active and helpful?
3. **Long-term viability**: Will this technology be maintained in 3-5 years?
4. **Performance requirements**: Does it meet performance needs?
5. **Operational complexity**: How hard is it to operate and maintain?
6. **Cost**: What are the infrastructure and licensing costs?
7. **Integration**: Does it integrate well with the rest of the stack?
8. **Hiring**: Can you hire people who know this technology?

### Red Flags in Technology Selection

- Technology with declining GitHub activity
- Technology with no major company backing or sponsorship
- Technology that requires significant customization for basic use cases
- Technology with poor TypeScript support
- Technology with no clear upgrade path
- Technology that locks you into a single vendor without escape hatches
