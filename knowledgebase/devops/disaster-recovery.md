# Disaster Recovery

## Purpose

Define disaster recovery planning and procedures.

**Last Verified**: June 2026

---

## RPO and RTO

| Metric | Definition | Target |
|---|---|---|
| RPO | Recovery Point Objective (max data loss) | 1 hour |
| RTO | Recovery Time Objective (max downtime) | 4 hours |

---

## Backup Strategy

### Database

- **Full backup**: Daily at 2 AM UTC
- **WAL archiving**: Continuous
- **Retention**: 30 days
- **Off-site**: S3 with cross-region replication

### Application

- **Container images**: Stored in registry
- **Configuration**: In version control
- **Secrets**: In secrets manager

### File Storage

- **S3 versioning**: Enabled
- **Cross-region replication**: Enabled
- **Lifecycle policies**: Archive after 90 days

---

## Recovery Procedures

### Database Recovery

```bash
# 1. Stop application
kubectl scale deployment/app --replicas=0

# 2. Restore database
pg_restore -h db-host -U postgres -d app backup.dump

# 3. Apply WAL (if point-in-time recovery)
# Configure recovery.conf with target time

# 4. Verify data
psql -d app -c "SELECT count(*) FROM users;"

# 5. Start application
kubectl scale deployment/app --replicas=3
```

### Application Recovery

```bash
# 1. Deploy previous version
kubectl rollout undo deployment/app

# 2. Verify health
curl https://app.com/health

# 3. Monitor logs
kubectl logs -f deployment/app
```

---

## Failover

### Database Failover

- Automatic failover with Multi-AZ (AWS RDS)
- Manual failover with read replica promotion

### Application Failover

- Load balancer health checks
- Automatic instance replacement
- Multi-region deployment (if needed)

---

## Communication Plan

### Incident Response

1. **Detect**: Monitoring alerts on-call engineer
2. **Triage**: Assess impact and severity
3. **Communicate**: Notify stakeholders
4. **Mitigate**: Implement temporary fix
5. **Resolve**: Implement permanent fix
6. **Review**: Post-incident review

### Stakeholder Communication

| Severity | Response Time | Update Frequency |
|---|---|---|
| Critical (P1) | 15 minutes | Every 30 minutes |
| High (P2) | 1 hour | Every 2 hours |
| Medium (P3) | 4 hours | Daily |
| Low (P4) | 24 hours | Weekly |

---

## Testing

### DR Drills

- **Frequency**: Quarterly
- **Scope**: Full recovery simulation
- **Documentation**: Runbook validation
- **Metrics**: Actual RTO/RPO vs targets

---

## Anti-Patterns

- **Untested backups**: Test restore regularly
- **No off-site backup**: Store in multiple locations
- **No runbook**: Document recovery procedures
- **No communication plan**: Define escalation procedures
- **No DR drills**: Test regularly

---

## Verification Checklist

- [ ] RPO and RTO defined
- [ ] Backup strategy implemented
- [ ] Recovery procedures documented
- [ ] Failover configured
- [ ] Communication plan defined
- [ ] DR drills scheduled
