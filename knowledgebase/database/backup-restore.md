# Backup and Restore

## Purpose

Define backup and disaster recovery strategies for PostgreSQL.

**Last Verified**: June 2026

---

## Backup Strategies

### pg_dump (Logical Backup)

```bash
# Full database backup
pg_dump -h localhost -U postgres -d mydb -Fc > backup.dump

# Schema only
pg_dump -h localhost -U postgres -d mydb --schema-only > schema.sql

# Data only
pg_dump -h localhost -U postgres -d mydb --data-only > data.sql

# Specific table
pg_dump -h localhost -U postgres -d mydb -t orders > orders.sql
```

### pg_basebackup (Physical Backup)

```bash
# Base backup
pg_basebackup -h localhost -U replicator -D /backup/base -Fp -Xs -P

# With compression
pg_basebackup -h localhost -U replicator -D /backup/base -Ft -z -P
```

### Continuous WAL Archiving

```ini
# postgresql.conf
archive_mode = on
archive_command = 'cp %p /archive/%f'
wal_level = replica
```

---

## Restore

### Restore from pg_dump

```bash
# Restore full dump
pg_restore -h localhost -U postgres -d mydb backup.dump

# Restore specific table
pg_restore -h localhost -U postgres -d mydb -t orders backup.dump
```

### Point-in-Time Recovery

```ini
# recovery.conf / postgresql.conf
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-06-28 12:00:00+00'
```

---

## Backup Schedule

| Backup Type | Frequency | Retention | Use |
|---|---|---|---|
| Full backup | Daily | 30 days | Full restore |
| WAL archive | Continuous | 7 days | Point-in-time recovery |
| Schema backup | On change | 90 days | Schema recovery |

---

## Automation

### Cron Job

```bash
# /etc/cron.d/postgres-backup
0 2 * * * postgres pg_dump -Fc mydb > /backups/mydb_$(date +\%Y\%m\%d).dump
```

### Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -Fc mydb > "$BACKUP_DIR/mydb_$DATE.dump"
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete
```

---

## Verification

### Test Restore

```bash
# Create test database
createdb mydb_test

# Restore backup
pg_restore -d mydb_test backup.dump

# Verify data
psql -d mydb_test -c "SELECT count(*) FROM users;"
```

---

## Anti-Patterns

- **No automated backups**: Automate backup process
- **Untested restores**: Test restores regularly
- **No off-site backup**: Store backups in multiple locations
- **No monitoring**: Monitor backup success/failure
- **No retention policy**: Define and enforce retention

---

## Verification Checklist

- [ ] Automated backup configured
- [ ] Backup frequency defined
- [ ] Retention policy defined
- [ ] Off-site backup storage
- [ ] Restore tested regularly
- [ ] Point-in-time recovery configured
- [ ] Backup monitoring configured
- [ ] Runbook for restore procedure
