# Runbook Template

## Purpose

Template for operational runbooks - step-by-step procedures for common operations.

**Last Verified**: June 2026

---

## Template

```markdown
# Runbook: {Operation Name}

**Last Updated**: {Date}
**Owner**: {Team/Person}
**Severity**: {Low / Medium / High / Critical}

---

## Overview

{Brief description of what this runbook covers}

## Prerequisites

- [ ] {Access/tool required}
- [ ] {Access/tool required}
- [ ] {Access/tool required}

## Procedure

### Step 1: {Action}

**What**: {What to do}
**Why**: {Why this step is needed}
**How**:
```bash
{command}
```

**Expected Output**:
```
{what you should see}
```

**If This Fails**: {What to do if this step fails}

### Step 2: {Action}

**What**: {What to do}
**Why**: {Why}
**How**:
```bash
{command}
```

**Expected Output**:
```
{expected output}
```

**If This Fails**: {Recovery steps}

### Step 3: {Action}

{Continue for all steps}

## Verification

After completing the procedure, verify:

- [ ] {Verification step 1}
- [ ] {Verification step 2}
- [ ] {Verification step 3}

## Rollback

If the operation needs to be reversed:

### Step 1: {Rollback action}
```bash
{command}
```

### Step 2: {Rollback action}
```bash
{command}
```

## Troubleshooting

### Issue: {Common problem}
**Symptoms**: {What you see}
**Cause**: {Why it happens}
**Solution**: {How to fix}

### Issue: {Another problem}
**Symptoms**: {What you see}
**Cause**: {Why}
**Solution**: {How to fix}

## Escalation

If unable to resolve:

1. Contact: {Name/Team}
2. Channel: {Slack/Email/Phone}
3. Include: {What information to provide}

## References

- {Link to relevant docs}
- {Link to monitoring dashboards}
- {Link to related runbooks}
```

---

## Common Runbooks

### Database Backup

```markdown
# Runbook: Database Backup

## Prerequisites
- SSH access to database server
- PostgreSQL credentials

## Procedure

### Step 1: Create backup
```bash
pg_dump -h localhost -U postgres -d mydb -Fc > /backups/mydb_$(date +%Y%m%d_%H%M%S).dump
```

### Step 2: Verify backup
```bash
pg_restore -l /backups/mydb_*.dump | head -20
```

### Step 3: Upload to S3
```bash
aws s3 cp /backups/mydb_*.dump s3://backups/database/
```

## Verification
- [ ] Backup file exists
- [ ] Backup file size is reasonable
- [ ] Backup uploaded to S3
```

### Application Deployment

```markdown
# Runbook: Application Deployment

## Prerequisites
- Access to CI/CD pipeline
- Access to Kubernetes cluster

## Procedure

### Step 1: Verify CI passes
Check that all tests pass on the main branch.

### Step 2: Create release tag
```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

### Step 3: Monitor deployment
Watch the deployment in CI/CD dashboard.

## Rollback
```bash
kubectl rollout undo deployment/app
```
```

---

## Anti-Patterns

- **Outdated steps**: Keep runbooks current
- **Missing prerequisites**: Document all requirements
- **No rollback**: Always include rollback procedure
- **No verification**: Always include verification steps
- **No escalation**: Document who to contact
