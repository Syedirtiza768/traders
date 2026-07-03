# CI/CD

## Purpose

Define CI/CD pipeline design and best practices.

**Last Verified**: June 2026

---

## GitHub Actions Pipeline

### Basic Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run test
      - run: pnpm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy
        run: |
          # Deploy to production
```

### Pipeline Stages

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Lint   │ →  │  Type   │ →  │  Test   │ →  │  Build  │
│         │    │  Check  │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                   │
                                                   ▼
                                            ┌─────────┐
                                            │ Deploy  │
                                            └─────────┘
```

---

## Pipeline Best Practices

### Fast Feedback

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint

  typecheck:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck

  test:
    needs: typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test
```

### Caching

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 24
    cache: 'pnpm'
```

### Environment Secrets

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

---

## Testing in CI

### Unit Tests

```yaml
- name: Unit Tests
  run: pnpm run test:unit
  env:
    CI: true
```

### Integration Tests

```yaml
- name: Integration Tests
  run: pnpm run test:integration
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test
```

### E2E Tests

```yaml
- name: E2E Tests
  run: pnpm run test:e2e
  env:
    BASE_URL: http://localhost:3000
```

---

## Deployment Pipeline

### Staging

```yaml
deploy-staging:
  needs: test
  if: github.ref == 'refs/heads/main'
  environment: staging
  steps:
    - uses: actions/checkout@v4
    - run: docker build -t myapp:${{ github.sha }} .
    - run: docker push registry/myapp:${{ github.sha }}
    - run: kubectl set image deployment/app app=registry/myapp:${{ github.sha }}
```

### Production

```yaml
deploy-production:
  needs: deploy-staging
  environment: production
  steps:
    - uses: actions/checkout@v4
    - run: kubectl set image deployment/app app=registry/myapp:${{ github.sha }}
```

---

## Security Scanning

```yaml
security:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    
    - name: Dependency Audit
      run: pnpm audit
    
    - name: Container Scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: myapp:latest
    
    - name: SAST
      uses: github/codeql-action/analyze@v3
```

---

## Anti-Patterns

- **Skipping tests**: Always run tests in CI
- **No caching**: Cache dependencies
- **Hard-coded secrets**: Use GitHub Secrets
- **No parallel jobs**: Parallelize independent jobs
- **Deploying without approval**: Use environment protection rules
- **No rollback plan**: Always have rollback capability

---

## Verification Checklist

- [ ] CI pipeline configured
- [ ] Lint, typecheck, test, build stages
- [ ] Dependencies cached
- [ ] Secrets managed securely
- [ ] Security scanning configured
- [ ] Deployment automated
- [ ] Environment protection rules
- [ ] Rollback capability
