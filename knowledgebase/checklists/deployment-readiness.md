# Deployment Readiness Checklist

## Purpose

Checklist for verifying an application is ready for deployment to any environment.

**Last Verified**: June 2026

---

## Pre-Deployment

### Code Quality
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Linting passes
- [ ] No console.log/debug statements
- [ ] No TODO/FIXME in critical paths
- [ ] Code review completed

### Build
- [ ] Application builds successfully
- [ ] Build artifacts generated
- [ ] Docker image builds (if applicable)
- [ ] No build warnings

### Database
- [ ] Migrations tested on staging
- [ ] Migration rollback plan exists
- [ ] Seed data updated (if needed)
- [ ] Large table migrations use CONCURRENTLY
- [ ] Backup taken before migration

---

## Environment Configuration

### Variables
- [ ] All environment variables configured
- [ ] Secrets in secure storage
- [ ] No secrets in code or config files
- [ ] Environment-specific values correct
- [ ] CORS origins configured
- [ ] Database URL correct
- [ ] Redis URL correct

### Infrastructure
- [ ] Database provisioned
- [ ] Redis provisioned
- [ ] File storage provisioned
- [ ] CDN configured (if applicable)
- [ ] DNS configured
- [ ] SSL/TLS certificates configured

---

## Security

- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Authentication configured
- [ ] Authorization configured
- [ ] CORS configured correctly
- [ ] No debug endpoints exposed

---

## Performance

- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] Compression enabled
- [ ] Static assets on CDN
- [ ] Database indexes verified
- [ ] No N+1 queries

---

## Monitoring

- [ ] Health check endpoints working
- [ ] Application logging configured
- [ ] Error tracking configured
- [ ] Performance monitoring configured
- [ ] Alerts configured for critical metrics
- [ ] Log aggregation configured

---

## Deployment Process

### CI/CD
- [ ] CI pipeline passes
- [ ] CD pipeline configured
- [ ] Environment protection rules set
- [ ] Rollback capability exists

### Strategy
- [ ] Deployment strategy chosen (rolling/blue-green/canary)
- [ ] Zero-downtime deployment configured
- [ ] Database migration strategy defined
- [ ] Feature flags configured (if needed)

---

## Post-Deployment

### Verification
- [ ] Health check returns OK
- [ ] Smoke tests pass
- [ ] Critical user flows working
- [ ] No error spike in monitoring
- [ ] Performance metrics normal

### Rollback Plan
- [ ] Application rollback procedure documented
- [ ] Database rollback procedure documented
- [ ] Rollback tested
- [ ] Decision criteria for rollback defined

---

## Communication

- [ ] Team notified of deployment
- [ ] Deployment window communicated
- [ ] Maintenance page ready (if needed)
- [ ] Customer communication prepared (if needed)

---

## Environment-Specific

### Development
- [ ] Local development works
- [ ] Seed data available
- [ ] Hot reload working

### Staging
- [ ] Staging environment matches production
- [ ] Anonymized production data available
- [ ] Integration tests pass on staging

### Production
- [ ] Production access verified
- [ ] Backup taken
- [ ] Monitoring dashboards ready
- [ ] On-call engineer identified
