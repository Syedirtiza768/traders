# AI Agent Readiness Checklist

## Purpose

Checklist for verifying a codebase is ready for AI coding agents to work with safely and effectively.

**Last Verified**: June 2026

---

## Repository Context

- [ ] README.md exists and is comprehensive
- [ ] Repository context document exists (CONTEXT.md)
- [ ] Technology stack documented
- [ ] Architecture pattern documented
- [ ] Module structure documented
- [ ] Common commands documented
- [ ] Environment variables documented

## Code Quality

- [ ] TypeScript strict mode enabled
- [ ] ESLint/Biome configured
- [ ] Consistent code style
- [ ] Clear naming conventions
- [ ] Module boundaries defined
- [ ] No circular dependencies

## Type Safety

- [ ] TypeScript strict mode enabled
- [ ] No `any` types (or documented exceptions)
- [ ] DTOs defined for all API inputs
- [ ] Response types defined for all API outputs
- [ ] Database types generated from schema

## Testing

- [ ] Unit tests exist for business logic
- [ ] Integration tests exist for data access
- [ ] E2E tests exist for critical flows
- [ ] Test commands documented
- [ ] Test data strategy defined
- [ ] Coverage thresholds set

## Database

- [ ] Schema file exists (prisma/schema.prisma)
- [ ] Migrations are version-controlled
- [ ] Seed data exists for development
- [ ] Database commands documented
- [ ] Schema documentation exists

## API

- [ ] API routes are well-organized
- [ ] OpenAPI/Swagger documentation exists
- [ ] Input validation on all endpoints
- [ ] Error responses are consistent
- [ ] Authentication requirements documented

## Configuration

- [ ] .env.example file exists
- [ ] All environment variables documented
- [ ] Configuration validated with schema
- [ ] Development setup instructions clear
- [ ] Build commands documented

## Documentation

- [ ] Architecture overview exists
- [ ] Module documentation exists
- [ ] API documentation exists
- [ ] Database documentation exists
- [ ] Deployment guide exists

## Git

- [ ] .gitignore configured properly
- [ ] No secrets in repository
- [ ] Branch naming conventions defined
- [ ] Commit message format defined
- [ ] PR template exists

## Development Workflow

- [ ] Development commands documented
- [ ] Build commands documented
- [ ] Test commands documented
- [ ] Lint commands documented
- [ ] Type check commands documented

## Safety

- [ ] No hard-coded secrets
- [ ] No production credentials in repo
- [ ] Backup procedures documented
- [ ] Rollback procedures documented
- [ ] Breaking change process defined
