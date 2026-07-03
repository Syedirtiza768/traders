# Repository Master Context Document

## Purpose

Template for creating a comprehensive repository context document that enables AI agents and new developers to quickly understand a codebase.

**Last Verified**: June 2026

---

## Template

```markdown
# {Project Name} - Repository Context

## Overview

**Purpose**: {What this application does}
**Type**: {SaaS / Internal Tool / API / Library / etc.}
**Status**: {Active Development / Maintenance / Deprecated}
**Last Updated**: {Date}

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | v16.x |
| UI | React + shadcn/ui + Tailwind | v19.x |
| Backend | NestJS | v11.x |
| Database | PostgreSQL | v17/18 |
| ORM | Prisma | v7.x |
| Cache | Redis | v7.x |
| Queue | BullMQ | v5.x |
| Language | TypeScript | v6.x |
| Runtime | Node.js | v24 LTS |
| Testing | Vitest + Playwright | Latest |
| CI/CD | GitHub Actions | - |
| Deployment | {Docker / Vercel / VPS / K8s} | - |

## Architecture

### Pattern
{Modular Monolith / Microservices / Clean Architecture / Hexagonal}

### Module Structure
```
src/
  modules/
    {module-name}/          # Feature module
      {module}.module.ts    # Module definition
      {module}.controller.ts
      {module}.service.ts
      {module}.repository.ts
      dto/
      entities/
      __tests__/
```

### Key Modules
| Module | Purpose | Owner |
|---|---|---|
| auth | Authentication & authorization | - |
| users | User management | - |
| {module} | {purpose} | - |

## Database

### Schema Location
- Prisma: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

### Key Tables
| Table | Purpose |
|---|---|
| users | User accounts |
| tenants | Tenant organizations |
| {table} | {purpose} |

### Multi-Tenancy
{Shared schema with tenant_id / Separate schemas / Separate databases}

## API

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.{domain}.com`

### Authentication
{JWT Bearer Token / Session Cookie / API Key}

### Key Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | /auth/login | User login |
| GET | /users | List users |
| {method} | {path} | {purpose} |

## Frontend

### Routes
| Route | Page | Auth Required |
|---|---|---|
| / | Home | No |
| /dashboard | Dashboard | Yes |
| /users | User management | Yes (Admin) |
| {route} | {page} | {yes/no} |

### Key Components
| Component | Location | Purpose |
|---|---|---|
| Sidebar | components/layouts/ | Navigation |
| DataTable | components/common/ | Data display |
| {component} | {location} | {purpose} |

## Environment Variables

### Required
| Variable | Purpose | Example |
|---|---|---|
| DATABASE_URL | PostgreSQL connection | postgresql://... |
| REDIS_URL | Redis connection | redis://... |
| JWT_SECRET | JWT signing secret | min-32-chars |
| {variable} | {purpose} | {example} |

### Optional
| Variable | Purpose | Default |
|---|---|---|
| LOG_LEVEL | Logging level | info |
| PORT | Server port | 3000 |

## Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
```

### Database
```bash
npx prisma migrate dev     # Create migration
npx prisma migrate deploy  # Apply migrations
npx prisma studio          # Open Prisma Studio
npx prisma db seed         # Seed database
```

### Testing
```bash
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run E2E tests
```

### Linting
```bash
pnpm lint             # Run linter
pnpm typecheck        # Run type checker
```

## Project Structure

```
{project-root}/
├── app/                    # Next.js App Router
├── src/                    # Backend source
│   ├── modules/           # Feature modules
│   ├── common/            # Shared utilities
│   └── config/            # Configuration
├── prisma/                # Database
│   ├── schema.prisma
│   └── migrations/
├── public/                # Static assets
├── tests/                 # E2E tests
├── docker-compose.yml
├── .env.example
└── package.json
```

## Key Patterns

### Error Handling
{Describe how errors are handled in this project}

### Authentication Flow
{Describe the auth flow}

### Data Fetching
{Describe how data is fetched (Server Components, API calls, etc.)}

### State Management
{Describe state management approach}

### Form Handling
{Describe form handling (Server Actions, react-hook-form, etc.)}

## Conventions

### Naming
- Files: {kebab-case / camelCase / PascalCase}
- Components: {PascalCase}
- Services: {PascalCaseService}
- DTOs: {PascalCaseDto}

### Code Style
- Formatter: {Biome / Prettier}
- Linter: {ESLint / Biome}
- Import order: {External → Internal → Relative}

### Git
- Branch naming: {feature/ / bugfix/ / hotfix/}
- Commit format: {Conventional Commits}
- PR process: {Describe}

## Known Issues
- {List any known issues or technical debt}

## Contacts
- Tech Lead: {name}
- DevOps: {name}
```

---

## How to Use

### For New Projects

1. Copy the template above
2. Fill in all sections with project-specific information
3. Keep it updated as the project evolves
4. Store in the repository root as `CONTEXT.md` or `REPOSITORY.md`

### For AI Agents

1. Read the context document first when starting work
2. Reference it for architecture decisions
3. Use it to understand module boundaries
4. Follow the conventions documented

### Maintenance

- Update when major architecture changes occur
- Update when new modules are added
- Update when technology versions change
- Review quarterly

---

## Anti-Patterns

- **Outdated context**: Keep the document current
- **Too detailed**: Focus on what's needed for understanding
- **Too vague**: Include enough detail to be useful
- **Missing commands**: Always include common commands
- **Missing env vars**: Document all required environment variables
