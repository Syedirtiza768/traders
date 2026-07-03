# PRD Template (Product Requirements Document)

## Purpose

Template for defining product requirements for new features or systems.

**Last Verified**: June 2026

---

## Template

```markdown
# PRD: {Feature Name}

**Author**: {Name}
**Date**: {Date}
**Status**: {Draft / Review / Approved / Implemented}
**Version**: {1.0}

---

## Overview

{One paragraph summary of what this feature is and why it's needed}

## Problem Statement

{What problem does this solve? Who has this problem?}

## Goals

1. {Goal 1}
2. {Goal 2}
3. {Goal 3}

## Non-Goals

1. {What this feature explicitly does NOT include}
2. {Scope boundaries}

## User Stories

### Story 1: {Title}
**As a** {user type}
**I want to** {action}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}

### Story 2: {Title}
**As a** {user type}
**I want to** {action}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] {Criterion 1}
- [ ] {Criterion 2}

## Requirements

### Functional Requirements

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-1 | {Requirement} | Must | Not Started |
| FR-2 | {Requirement} | Should | Not Started |
| FR-3 | {Requirement} | Could | Not Started |

### Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| Performance | Page load time | <2s |
| Availability | Uptime | 99.9% |
| Security | Authentication | Required |
| Scalability | Concurrent users | 1000+ |

## User Interface

### Wireframes
{Link to wireframes or describe the UI}

### User Flow
```
Step 1 → Step 2 → Step 3 → Complete
```

## Data Model

### New Entities
| Entity | Fields | Relationships |
|---|---|---|
| {Entity} | {fields} | {relationships} |

### Schema Changes
{Describe any database schema changes needed}

## API Changes

### New Endpoints
| Method | Path | Description |
|---|---|---|
| POST | /api/v1/{resource} | Create {resource} |

### Modified Endpoints
| Method | Path | Change |
|---|---|---|
| GET | /api/v1/{resource} | Added filter parameter |

## Dependencies

- {External service dependencies}
- {Internal team dependencies}
- {Third-party integrations}

## Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| {Risk} | High | Medium | {Mitigation} |

## Timeline

| Phase | Duration | Deliverables |
|---|---|---|
| Design | 1 week | Wireframes, API spec |
| Development | 2 weeks | Working feature |
| Testing | 1 week | Test results |
| Launch | 1 day | Deployed feature |

## Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| User adoption | 50% of users | Analytics |
| Error rate | <1% | Monitoring |
| Performance | <2s load | APM |

## Open Questions

- [ ] {Question 1}
- [ ] {Question 2}

## References

- {Link to related documents}
- {Link to research}
```

---

## How to Use

1. Copy the template
2. Fill in all sections
3. Get review from stakeholders
4. Update status as work progresses
5. Link to technical spec when ready
