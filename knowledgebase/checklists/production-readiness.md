# Production Readiness Checklist

## Purpose

Comprehensive checklist for verifying an application is ready for production deployment.

**Last Verified**: June 2026

---

## Application

- [ ] All features tested and working
- [ ] Error handling implemented on all code paths
- [ ] Loading states implemented for all async operations
- [ ] Input validation on all user inputs
- [ ] Output sanitization on all responses
- [ ] Graceful degradation for external service failures
- [ ] Feature flags for incomplete features

## Database

- [ ] Migrations tested on staging
- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Backup strategy implemented
- [ ] Point-in-time recovery configured
- [ ] Slow query logging enabled
- [ ] Database monitoring configured

## Authentication & Authorization

- [ ] Authentication required on all protected endpoints
- [ ] Authorization checks on all resources
- [ ] Password hashing with Argon2/bcrypt
- [ ] Short-lived access tokens (15 min)
- [ ] Refresh token rotation
- [ ] Token invalidation on logout
- [ ] Rate limiting on auth endpoints
- [ ] MFA available for sensitive operations

## API

- [ ] Input validation on all endpoints
- [ ] Consistent error response format
- [ ] Proper HTTP status codes
- [ ] Pagination on all collection endpoints
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] API documentation generated (OpenAPI)
- [ ] Versioning strategy defined

## Security

- [ ] No hard-coded secrets
- [ ] Environment variables validated
- [ ] Security headers configured (Helmet)
- [ ] HTTPS enforced
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] CSRF protection
- [ ] File upload validation
- [ ] Dependency audit clean

## Performance

- [ ] No N+1 queries
- [ ] Caching strategy implemented
- [ ] Compression enabled
- [ ] Image optimization configured
- [ ] Code splitting implemented
- [ ] Bundle size acceptable
- [ ] Database queries optimized

## Monitoring & Observability

- [ ] Structured logging configured
- [ ] Error tracking configured
- [ ] Performance monitoring configured
- [ ] Health check endpoints implemented
- [ ] Alerting configured for critical metrics
- [ ] Log retention policy defined

## Testing

- [ ] Unit tests for business logic (>80% coverage)
- [ ] Integration tests for data access
- [ ] E2E tests for critical flows
- [ ] Security tests passing
- [ ] Load testing performed
- [ ] All tests passing in CI

## Deployment

- [ ] CI/CD pipeline configured
- [ ] Automated deployments
- [ ] Rollback strategy defined
- [ ] Zero-downtime deployment configured
- [ ] Environment variables configured
- [ ] Secrets in secure storage
- [ ] Container images scanned

## Documentation

- [ ] README is current
- [ ] API documentation is current
- [ ] Database documentation is current
- [ ] Deployment guide exists
- [ ] Runbooks for common operations
- [ ] Incident response plan exists

## Operations

- [ ] On-call rotation defined
- [ ] Escalation procedures documented
- [ ] Backup restoration tested
- [ ] Disaster recovery plan exists
- [ ] Communication plan for incidents
