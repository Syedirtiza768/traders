# Incident Analysis

## Purpose

Systematically analyze incidents to identify root causes, contributing factors, and preventive measures through blameless postmortems.

## Inputs

- Incident report
- Timeline of events
- System logs and metrics
- Team accounts
- Customer impact data
- Previous incident history

## Expected Outputs

- Root cause analysis
- Contributing factors
- Timeline reconstruction
- Action items with owners
- Preventive measures
- Incident documentation

## Decision Process

### 1. Incident Classification

**Severity Levels**

| Severity | Impact | Response | Example |
|----------|--------|----------|---------|
| SEV1 | Critical, user-facing | Immediate page, all hands | Service down |
| SEV2 | Major, limited impact | Urgent response | Degraded performance |
| SEV3 | Minor, workaround exists | Business hours | Feature broken |
| SEV4 | Low impact | Ticket | Cosmetic issue |

**Incident Categories**

| Category | Description | Examples |
|----------|-------------|----------|
| Availability | Service unavailable | Outage, crash |
| Performance | Degraded performance | Slow response |
| Data | Data issues | Data loss, corruption |
| Security | Security breach | Breach, vulnerability |
| Dependency | External dependency | Third-party outage |

### 2. Timeline Reconstruction

**Timeline Elements**

| Element | Description | Source |
|---------|-------------|--------|
| Detection | When issue was detected | Monitoring, reports |
| Triage | When severity assigned | Incident commander |
| Response | When team engaged | Communication logs |
| Mitigation | When impact stopped | Actions taken |
| Resolution | When issue resolved | Fix deployed |
| Recovery | When fully recovered | Service restored |

**Timeline Format**:
```
2024-01-15 Incident Timeline

10:23 - Alert triggered: High error rate on OrderService
10:25 - On-call engineer acknowledged
10:27 - SEV2 declared, incident channel created
10:30 - Second engineer joined
10:35 - Root cause identified: Database connection pool exhausted
10:40 - Mitigation: Restarted OrderService
10:45 - Error rate returned to normal
11:00 - Incident resolved
11:30 - Postmortem scheduled
```

### 3. Root Cause Analysis

**5 Whys Technique**

```
Problem: OrderService returning 500 errors

Why? Database connection pool exhausted
Why? Connections not being released
Why? Connection leak in payment processing code
Why? Missing finally block to close connections
Why? Code review didn't catch it

Root Cause: Inadequate code review process for connection handling
```

**Fishbone Diagram (Ishikawa)**

```
                    Methods          Machine
                        \              /
                         \            /
                          \          /
People ------------------ Problem ------------------ Materials
                          /          \
                         /            \
                        /              \
                   Environment        Measurement
```

**Categories to Investigate**:
- **People**: Training, communication, procedures
- **Process**: Workflows, policies, documentation
- **Technology**: Systems, tools, infrastructure
- **Environment**: External factors, dependencies

### 4. Contributing Factors

**Factor Categories**

| Category | Examples | Questions |
|----------|----------|-----------|
| Technical | Bugs, capacity, design | What technical failures occurred? |
| Process | Deployment, monitoring, testing | What process gaps existed? |
| Human | Knowledge, communication, fatigue | What human factors contributed? |
| Organizational | Priorities, resources, culture | What organizational factors? |

**Contributing Factor Analysis**:
```
Technical Factors:
├── Connection pool too small for load
├── No alerting on pool utilization
└── Missing circuit breaker

Process Factors:
├── No load testing before deployment
├── Code review checklist incomplete
└── No runbook for this scenario

Human Factors:
├── Developer unfamiliar with connection pooling
├── On-call engineer new to service
└── Communication delayed during handoff

Organizational Factors:
├── Pressure to deploy quickly
├── Insufficient training time
└── No dedicated QA resources
```

### 5. Blameless Postmortem

**Principles**:
- Focus on systems, not individuals
- No punishment for honest mistakes
- Learning over blame
- Psychological safety
- Actionable outcomes

**Postmortem Process**:
1. Schedule within 72 hours
2. Invite all involved parties
3. Review timeline together
4. Identify root causes
5. Discuss contributing factors
6. Generate action items
7. Assign owners and deadlines
8. Document and share

**Postmortem Template**:
```
# Incident Postmortem

## Summary
Brief description of the incident

## Impact
- Duration: X hours
- Users affected: X
- Business impact: X

## Timeline
Detailed timeline of events

## Root Cause
Primary root cause identified

## Contributing Factors
- Factor 1
- Factor 2

## Resolution
How the incident was resolved

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Fix X | @name | YYYY-MM-DD | Open |

## Lessons Learned
What we learned from this incident

## Appendix
Logs, metrics, screenshots
```

### 6. Action Item Generation

**Action Item Categories**

| Category | Description | Examples |
|----------|-------------|----------|
| Immediate | Fix the specific issue | Patch bug |
| Short-term | Prevent recurrence | Add monitoring |
| Long-term | Systemic improvement | Architecture change |

**SMART Action Items**:
- **S**pecific: Clear, well-defined
- **M**easurable: Can verify completion
- **A**ssignable: Has an owner
- **R**ealistic: Achievable
- **T**ime-bound: Has deadline

**Action Item Tracking**:
```
| ID | Action | Owner | Due | Status | Impact |
|----|--------|-------|-----|--------|--------|
| A1 | Add connection pool metrics | @alice | 2024-01-22 | Done | Prevents |
| A2 | Update code review checklist | @bob | 2024-01-22 | In Progress | Prevents |
| A3 | Add circuit breaker | @carol | 2024-01-29 | Open | Mitigates |
| A4 | Load testing in CI | @dan | 2024-02-05 | Open | Prevents |
```

### 7. Pattern Recognition

**Incident Pattern Analysis**:
- Similar incidents over time
- Common root causes
- Recurring contributing factors
- Systemic issues

**Pattern Categories**:
```
Recurring Patterns:
├── Same service failing repeatedly
├── Same type of issue (e.g., capacity)
├── Same time of day/week
└── Same dependency causing issues

Systemic Issues:
├── Monitoring gaps
├── Testing gaps
├── Documentation gaps
└── Training gaps
```

### 8. Knowledge Sharing

**Documentation**:
- Incident report in knowledge base
- Runbooks updated
- Architecture decisions documented
- Training materials created

**Communication**:
- Incident summary to stakeholders
- Lessons learned to team
- Action items to leadership
- Public postmortem (if appropriate)

**Learning Integration**:
- Update on-call training
- Add to onboarding materials
- Share in team meetings
- Contribute to engineering blog

### 9. Metrics and Improvement

**Key Metrics**

| Metric | Description | Target |
|--------|-------------|--------|
| MTTR | Mean Time To Recovery | Decreasing |
| MTTD | Mean Time To Detection | Decreasing |
| Incident frequency | Incidents per month | Decreasing |
| Action item completion | % completed on time | > 90% |
| Repeat incidents | Same root cause | 0 |

**Improvement Tracking**:
```
Incident Metrics Dashboard:
├── MTTR: 45 min (down from 60 min)
├── MTTD: 5 min (down from 10 min)
├── Incidents this month: 8
├── Action items open: 12
├── Action items overdue: 2
└── Repeat incidents: 0
```

## Evaluation Criteria

### Incident Response Quality

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Detection | User-reported | Monitoring | Proactive |
| Response | Ad-hoc | Process | Well-rehearsed |
| Communication | None | Some updates | Continuous |
| Documentation | None | Basic | Comprehensive |
| Learning | None | Some actions | Systematic improvement |

## Trade-offs

### Speed vs Thoroughness

| Priority | Approach | Trade-off |
|----------|----------|-----------|
| Speed | Quick fix | May miss root cause |
| Thoroughness | Deep analysis | Takes longer |

**Guidance**: Balance based on severity

### Blame vs Accountability

| Approach | Pros | Cons |
|----------|------|------|
| Blame | Quick scapegoat | Hides systemic issues |
| Accountability | Systemic improvement | Takes longer |

**Guidance**: Blameless but accountable

## Validation Checklist

- [ ] Incident is classified by severity
- [ ] Timeline is reconstructed
- [ ] Root cause is identified
- [ ] Contributing factors are documented
- [ ] Postmortem is conducted blamelessly
- [ ] Action items are generated
- [ ] Action items have owners and deadlines
- [ ] Patterns are analyzed
- [ ] Knowledge is shared
- [ ] Metrics are tracked

## Common Pitfalls

1. **Blame culture**: Punishing individuals
2. **Shallow analysis**: Stopping at first "why"
3. **No action items**: Learning but not improving
4. **Incomplete timeline**: Missing key events
5. **Delayed postmortem**: Waiting too long
6. **No follow-up**: Action items not tracked
7. **Ignoring patterns**: Same incidents recurring
8. **Not sharing**: Knowledge stays siloed

## References

- Site Reliability Engineering (Google)
- The DevOps Handbook (Kim, Humble, Debois, Willis)
- Accelerate (Forsgren, Humble, Kim)
- Release It! (Nygard)

## Related Capabilities

- Resilience Engineering
- SRE Practices
- DevOps Practices
- Deployment Planning
