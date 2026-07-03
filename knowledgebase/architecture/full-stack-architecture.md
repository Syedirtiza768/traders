# Full-Stack Architecture

## Purpose

Define end-to-end architecture patterns for modern enterprise applications spanning frontend, backend, database, and infrastructure.

**Last Verified**: June 2026

---

## Architecture Overview

A modern full-stack enterprise application follows a layered, modular architecture:

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Server      │  │ Client      │  │ Server      │ │
│  │ Components  │  │ Components  │  │ Actions     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                           │
                     HTTP / WebSocket
                           │
┌─────────────────────────────────────────────────────┐
│                    Backend (NestJS)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Controllers │  │ Services    │  │ Repositories│ │
│  │ (API Layer) │  │ (Business)  │  │ (Data)      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Guards      │  │ Interceptors│  │ Pipes       │ │
│  │ (AuthZ)     │  │ (Cross-cut) │  │ (Validation)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────┴─────┐ ┌────┴────┐
              │ PostgreSQL│ │  Redis  │
              │ (Primary) │ │ (Cache) │
              └───────────┘ └─────────┘
```

---

## Layer Responsibilities

### Presentation Layer (Frontend)

**Responsibilities**: User interface, user interaction, client-side state, form validation, routing, SEO.

**Components**:
- **Server Components**: Data fetching, SEO content, heavy computations, sensitive data handling
- **Client Components**: User interactions, form handling, animations, browser APIs, real-time updates
- **Server Actions**: Form mutations, data updates, cache invalidation

**Rules**:
- Server Components handle data fetching - never fetch in Client Components on mount
- Client Components handle user interaction - use "use client" directive
- Server Actions handle mutations - use "use server" directive
- Never expose sensitive data through Server Components to Client Components (use taint API)

### API Layer (Backend Controllers)

**Responsibilities**: Request routing, input validation, response formatting, error handling, API documentation.

**Components**:
- Controllers handle HTTP request/response
- Pipes validate and transform input
- Guards handle authentication and authorization
- Interceptors handle cross-cutting concerns (logging, caching, transformation)

**Rules**:
- Controllers should be thin - delegate to services
- Use DTOs for all input/output
- Validate all input with Zod or class-validator
- Return consistent response format
- Document all endpoints with OpenAPI

### Business Logic Layer (Services)

**Responsibilities**: Business rules, orchestration, domain logic, transaction management.

**Components**:
- Services encapsulate business logic
- Domain entities represent business concepts
- Value objects represent immutable concepts

**Rules**:
- Services should not depend on HTTP concepts (request, response)
- Services can depend on repositories, other services, and external services
- Keep services focused on single responsibility
- Use transactions for multi-step operations

### Data Access Layer (Repositories)

**Responsibilities**: Database queries, data mapping, query optimization.

**Components**:
- Repositories abstract database access
- Prisma/Drizzle handle query building
- Migrations handle schema changes

**Rules**:
- Repositories should return domain entities, not raw database rows
- Use transactions at the service level, not repository level
- Optimize queries for N+1 problems
- Use connection pooling in production

### Infrastructure Layer

**Responsibilities**: External integrations, message queues, file storage, email, caching.

**Components**:
- Queue processors handle background jobs
- Cache services manage Redis
- File storage handles S3 operations
- Email services handle notifications

---

## Cross-Cutting Concerns

### Authentication

```
Request → Guard (JWT validation) → Controller → Service → Response
```

- JWT tokens with short expiry (15 min)
- Refresh tokens with long expiry (7 days)
- Token rotation on refresh
- Store refresh tokens in database (not just JWT)

### Authorization

```
Request → Guard (JWT) → Guard (RBAC/ABAC) → Controller → Service → Response
```

- Role-Based Access Control (RBAC) for simple permission models
- Attribute-Based Access Control (ABAC) for complex permission models
- Policy-based authorization for fine-grained control
- Check permissions at guard level AND service level

### Logging

```
Request → Interceptor (request log) → Controller → Service → Interceptor (response log) → Response
```

- Structured JSON logging with Pino
- Correlation IDs across requests
- Log levels: error, warn, info, debug
- Never log sensitive data (passwords, tokens, PII)

### Error Handling

```
Service throws → Exception Filter catches → Formatted error response
```

- Use NestJS exception filters
- Return consistent error format
- Include correlation ID in errors
- Never expose internal errors to clients in production

### Caching

```
Controller → Interceptor (cache check) → Service (cache miss) → Response
```

- Cache at API level (Redis)
- Cache at database level (query result cache)
- Cache at frontend level (Next.js ISR/PPR)
- Invalidate caches on data mutation

---

## Data Flow Patterns

### Read Flow

```
Client Request
  → Next.js Server Component
    → API Call (or direct DB for Server Components)
      → NestJS Controller
        → Cache Check (Redis)
          → Cache Hit: Return cached data
          → Cache Miss: 
            → Service
              → Repository
                → Database Query
              → Return data
            → Cache result
          → Return response
      → Format response
    → Render component
  → Stream to client
```

### Write Flow

```
Client Form Submit
  → Next.js Server Action
    → Validation (Zod)
    → API Call
      → NestJS Controller
        → Input Validation (Pipe)
        → Auth Check (Guard)
        → Service
          → Business Validation
          → Transaction Begin
          → Repository operations
          → Transaction Commit
          → Queue background jobs
          → Invalidate caches
        → Return response
    → Revalidate cache
    → Return result
  → Update UI
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────┐
│ CDN / WAF (Cloudflare)                  │  Layer 1: Edge
├─────────────────────────────────────────┤
│ Rate Limiting                           │  Layer 2: Rate Limit
├─────────────────────────────────────────┤
│ Authentication (JWT)                    │  Layer 3: AuthN
├─────────────────────────────────────────┤
│ Authorization (RBAC/ABAC)               │  Layer 4: AuthZ
├─────────────────────────────────────────┤
│ Input Validation                        │  Layer 5: Validation
├─────────────────────────────────────────┤
│ Business Logic                          │  Layer 6: Business
├─────────────────────────────────────────┤
│ Database Security (RLS, encryption)     │  Layer 7: Data
└─────────────────────────────────────────┘
```

---

## Scalability Architecture

### Horizontal Scaling

```
                    ┌─────────────┐
                    │ Load Balancer│
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
      │  App #1   │ │  App #2   │ │  App #3   │
      └───────────┘ └───────────┘ └───────────┘
            │              │              │
      ┌─────┴──────────────┴──────────────┴─────┐
      │              Redis Cluster               │
      └─────────────────────┬───────────────────┘
                            │
      ┌─────────────────────┴───────────────────┐
      │       PostgreSQL (Primary + Replicas)    │
      └─────────────────────────────────────────┘
```

### Scaling Strategy by Component

| Component | Strategy | Notes |
|---|---|---|
| Frontend | CDN + Edge caching | Static assets, ISR/PPR pages |
| Backend API | Horizontal scaling (stateless) | No session state in memory |
| Database | Read replicas + connection pooling | Primary for writes, replicas for reads |
| Cache | Redis Cluster | Sharding for large datasets |
| Queue | BullMQ with Redis | Multiple workers per queue |
| File Storage | S3 + CDN | Unlimited horizontal scaling |
| Search | Elasticsearch cluster | Sharding and replication |

---

## Anti-Patterns to Avoid

- **Fat controllers**: Keep controllers thin, delegate to services
- **Business logic in repositories**: Repositories handle data access only
- **Direct database access from frontend**: Always go through API
- **Shared mutable state**: Use immutable data structures
- **Synchronous chains**: Use queues for long-running operations
- **N+1 queries**: Use eager loading or batch queries
- **Over-fetching**: Request only needed data
- **Under-fetching**: Use GraphQL or include related data
- **Tight coupling**: Use dependency injection and interfaces
- **Missing error handling**: Handle errors at every layer
- **Missing logging**: Log all operations with correlation IDs
- **Missing validation**: Validate all input at API boundary

---

## Verification Checklist

- [ ] Clear separation between frontend and backend
- [ ] API-first design with OpenAPI documentation
- [ ] Authentication at API layer
- [ ] Authorization at service layer
- [ ] Input validation at API boundary
- [ ] Structured logging with correlation IDs
- [ ] Error handling at every layer
- [ ] Caching strategy defined
- [ ] Database connection pooling configured
- [ ] Background job processing for long operations
- [ ] Health checks for all services
- [ ] Monitoring and alerting configured
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] CORS configured correctly
