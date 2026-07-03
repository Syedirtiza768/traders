# Handoff Template

## Purpose

Template for operational handoff documents - transferring responsibility between teams or individuals.

**Last Verified**: June 2026

---

## Template

```markdown
# Operational Handoff: {System/Feature Name}

**From**: {Current owner}
**To**: {New owner}
**Date**: {Handoff date}
**Reason**: {Why the handoff is happening}

---

## System Overview

### Purpose
{What this system/feature does}

### Architecture
{Brief architecture description}

### Key Components
| Component | Purpose | Location |
|---|---|---|
| {component} | {purpose} | {path/URL} |

## Access and Permissions

### Required Access
| System | Access Level | How to Get |
|---|---|---|
| Production database | Read/Write | {process} |
| Cloud console | Admin | {process} |
| CI/CD pipeline | Deploy | {process} |

### Credentials
| System | Location | Notes |
|---|---|---|
| Database | Secrets Manager | {notes} |
| API keys | Environment variables | {notes} |

## Operational Procedures

### Daily Operations
- [ ] {Daily task 1}
- [ ] {Daily task 2}

### Weekly Operations
- [ ] {Weekly task 1}
- [ ] {Weekly task 2}

### Monthly Operations
- [ ] {Monthly task 1}
- [ ] {Monthly task 2}

## Monitoring and Alerts

### Dashboards
| Dashboard | URL | Purpose |
|---|---|---|
| Application | {URL} | App health |
| Database | {URL} | DB performance |

### Alerts
| Alert | Threshold | Response |
|---|---|---|
| High error rate | >1% | {action} |
| High latency | >500ms | {action} |

## Known Issues

### Current Issues
| Issue | Severity | Workaround |
|---|---|---|
| {issue} | {severity} | {workaround} |

### Technical Debt
| Item | Priority | Notes |
|---|---|---|
| {debt item} | {priority} | {notes} |

## Runbooks

| Operation | Runbook |
|---|---|
| Deployment | {link} |
| Database backup | {link} |
| Incident response | {link} |

## Contacts

| Role | Name | Contact |
|---|---|---|
| Previous owner | {name} | {email/Slack} |
| Tech lead | {name} | {email/Slack} |
| DevOps | {name} | {email/Slack} |

## Knowledge Transfer Sessions

| Session | Date | Topic | Recording |
|---|---|---|---|
| Architecture overview | {date} | System design | {link} |
| Operations walkthrough | {date} | Daily ops | {link} |
| Incident response | {date} | Handling incidents | {link} |

## Handoff Checklist

- [ ] Access granted to new owner
- [ ] Knowledge transfer sessions completed
- [ ] Runbooks reviewed
- [ ] Monitoring dashboards shared
- [ ] Alert contacts updated
- [ ] On-call rotation updated
- [ ] Documentation updated
- [ ] New owner confirmed understanding

## Sign-off

**From**: {Name} - {Date}
**To**: {Name} - {Date}
```

---

## Anti-Patterns

- **Incomplete access**: Ensure all access is transferred
- **No knowledge transfer**: Schedule live sessions
- **Outdated documentation**: Update docs before handoff
- **No follow-up**: Schedule check-in after handoff
