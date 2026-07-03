# SRE Practices

## Purpose

Implement Site Reliability Engineering practices that balance reliability, feature velocity, and operational efficiency through measurement, automation, and engineering approaches to operations.

## Inputs

- Service level objectives (SLOs)
- Service criticality classification
- Current operational burden
- Team capacity
- Technical architecture
- Business requirements

## Expected Outputs

- SLO definitions
- Error budget policies
- Monitoring strategy
- Alerting configuration
- On-call procedures
- Incident management process
- Toil reduction plan
- Capacity planning

## Decision Process

### 1. Service Level Hierarchy

**SLI (Service Level Indicator)**
- Metric that measures service behavior
- Examples: Availability, latency, error rate, throughput

**SLO (Service Level Objective)**
- Target value for an SLI
- Examples: 99.9% availability, P99 latency < 200ms

**SLA (Service Level Agreement)**
- Contract with consequences for missing SLO
- Business decision, not technical

**Relationship**:
```
SLI (measure) → SLO (target) → SLA (contract)
```

### 2. SLO Definition

**Good SLO Characteristics**
- Measurable
- Meaningful to users
- Achievable
- Actionable
- Simple

**SLO Components**
- SLI definition
- Target value
- Measurement window
- Data source
- Calculation method

**Example SLOs**

| Service Type | SLI | SLO Target |
|--------------|-----|------------|
| Web service | Availability | 99.9% |
| Web service | Latency (P99) | < 200ms |
| API | Error rate | < 0.1% |
| Data pipeline | Freshness | < 1 hour |
| Batch job | Completion | 100% daily |

**SLO Setting Process**
1. Identify user journeys
2. Define SLIs for each journey
3. Set initial SLO targets
4. Measure and adjust
5. Get stakeholder agreement

### 3. Error Budgets

**Concept**: Budget for unreliability that balances reliability and velocity

**Calculation**:
```
Error Budget = 1 - SLO Target
```

Example: 99.9% SLO → 0.1% error budget = 43.8 minutes/month

**Error Budget Policy**

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Focus on velocity, new features |
| 25-50% | Balance reliability and features |
| 10-25% | Focus on reliability, freeze features |
| < 10% | Reliability only, feature freeze |

**Error Budget Benefits**
- Objective decision-making
- Shared language for reliability vs velocity
- Justification for reliability work
- Prevents over-engineering

### 4. Monitoring Strategy

**Four Golden Signals**
1. **Latency**: Time to serve requests
2. **Traffic**: Requests per second
3. **Errors**: Rate of failed requests
4. **Saturation**: Resource utilization

**Monitoring Layers**

| Layer | Purpose | Examples |
|-------|---------|----------|
| Infrastructure | Resource health | CPU, memory, disk |
| Platform | Platform health | Kubernetes, database |
| Application | Service health | Request rate, latency |
| Business | Business health | Signups, transactions |

**Instrumentation Principles**
- Instrument everything
- Use standard metrics
- Add business metrics
- Include context (labels, tags)
- Balance cardinality

### 5. Alerting Philosophy

**Principles**
- Alert on symptoms, not causes
- Every alert should be actionable
- Avoid alert fatigue
- Page only when human action needed

**Alert Types**

| Type | Urgency | Channel | Example |
|------|---------|---------|---------|
| Page | Immediate | Phone/SMS | Service down |
| Ticket | Near-term | Email/Ticket | Disk 80% full |
| Notification | Informational | Chat | Deployment complete |

**Alerting on SLOs**

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| Target-based | Alert when SLO missed | Simple | Alerts after impact |
| Budget-based | Alert when budget consumed | Predictive | Complex |
| Burn rate | Alert on consumption rate | Early warning | Tuning required |

**Burn Rate Alerting**

| Burn Rate | Time to Exhaust | Alert Severity |
|-----------|-----------------|----------------|
| 1x | 30 days | Ticket |
| 2x | 15 days | Ticket |
| 10x | 3 days | Page |
| 60x | 12 hours | Page |

### 6. On-Call

**Principles**
- Sustainable rotation
- Clear escalation paths
- Runbooks for common issues
- Post-incident reviews
- Limit on-call burden

**Rotation Design**
- Primary and secondary on-call
- Rotation length: 1 week typical
- Handoff procedures
- Compensation and time off

**On-Call Responsibilities**
- Respond to pages (within SLA)
- Investigate and mitigate incidents
- Document actions taken
- Hand off if needed
- Participate in postmortems

**Runbooks**
- Step-by-step procedures
- Common alert responses
- Diagnostic commands
- Escalation contacts
- Keep updated

### 7. Incident Management

**Severity Levels**

| Severity | Description | Response | Example |
|----------|-------------|----------|---------|
| SEV1 | Critical, user-facing | Immediate page | Service down |
| SEV2 | Major, limited impact | Urgent response | Degraded performance |
| SEV3 | Minor, workaround exists | Business hours | Non-critical feature broken |
| SEV4 | Low impact | Ticket | Cosmetic issue |

**Incident Roles**
- Incident Commander: Coordinates response
- Operations Lead: Executes fixes
- Communications Lead: Updates stakeholders

**Incident Process**
1. Detection and reporting
2. Triage and severity assignment
3. Mitigation (stop the bleeding)
4. Resolution
5. Post-incident review

**Blameless Postmortem**
- Focus on systems, not people
- Timeline of events
- Root cause analysis
- Action items with owners
- Share learnings

### 8. Toil Reduction

**Definition**: Manual, repetitive, automatable work that scales with service growth

**Characteristics**
- Manual
- Repetitive
- Automatable
- Tactical (not strategic)
- No enduring value
- Scales with traffic

**Toil Reduction Strategies**
- Automate repetitive tasks
- Eliminate root causes
- Self-service capabilities
- Better tooling
- Architectural improvements

**Toil Budget**
- Track toil hours
- Target: < 50% of SRE time on toil
- Allocate time for reduction projects

### 9. Capacity Planning

**Process**
1. Define capacity requirements
2. Measure current utilization
3. Forecast growth
4. Identify bottlenecks
5. Plan for headroom
6. Implement and validate

**Headroom Guidelines**
- CPU: 50% utilization target
- Memory: 80% utilization target
- Disk: 70% utilization target
- Network: 50% utilization target

**Scaling Strategies**
- Vertical: Larger instances
- Horizontal: More instances
- Autoscaling: Dynamic adjustment

### 10. Change Management

**Principles**
- Small, frequent changes
- Automated rollouts
- Gradual rollouts
- Easy rollback
- Monitor during changes

**Change Velocity**
- Progressive rollout (canary)
- Feature flags
- Automated rollback
- Change freeze periods (rare)

## Evaluation Criteria

### SRE Maturity Assessment

| Aspect | 1 (Low) | 3 (Medium) | 5 (High) |
|--------|---------|------------|----------|
| SLOs | None defined | Some defined | Comprehensive |
| Error budgets | Not used | Tracked | Policy-driven |
| Monitoring | Logs only | Metrics | Full observability |
| Alerting | Reactive | Some proactive | SLO-based |
| On-call | Ad-hoc | Rotation | Sustainable |
| Incidents | Firefighting | Process | Blameless learning |
| Toil | High | Moderate | Managed |
| Automation | Minimal | Some | Extensive |

## Trade-offs

### Reliability vs Velocity

| SLO Target | Velocity | Cost |
|------------|----------|------|
| 99% | High | Low |
| 99.9% | Medium | Medium |
| 99.99% | Low | High |
| 99.999% | Very low | Very high |

**Guidance**: Choose SLO based on user needs, not arbitrary targets

### Alerting Sensitivity

| Sensitivity | Pros | Cons |
|-------------|------|------|
| High | Catch issues early | Alert fatigue |
| Low | Fewer alerts | Miss issues |

**Guidance**: Tune to actionable alerts only

### Automation Investment

| Investment | Short-term | Long-term |
|------------|------------|-----------|
| Minimal | Fast | High toil |
| Moderate | Balanced | Balanced |
| Extensive | Slow | Low toil |

**Guidance**: Automate high-frequency toil first

## Validation Checklist

- [ ] SLOs are defined for critical services
- [ ] Error budgets are tracked and used for decisions
- [ ] Monitoring covers four golden signals
- [ ] Alerting is based on SLOs, not just thresholds
- [ ] On-call rotation is sustainable
- [ ] Runbooks exist for common alerts
- [ ] Incident management process is defined
- [ ] Postmortems are blameless and documented
- [ ] Toil is tracked and reduction planned
- [ ] Capacity planning is proactive
- [ ] Changes are gradual and monitored
- [ ] Automation reduces manual work

## Common Pitfalls

1. **SLO theater**: SLOs defined but not used
2. **Alert fatigue**: Too many non-actionable alerts
3. **Hero culture**: Rewarding firefighting over prevention
4. **No error budget**: Reliability without balance
5. **Manual everything**: Not investing in automation
6. **Ignoring toil**: Letting toil consume all time
7. **Over-engineering**: SLOs too aggressive
8. **Siloed SRE**: SRE separate from development

## References

- Site Reliability Engineering (Google)
- The Site Reliability Workbook (Google)
- Release It! (Nygard)
- The DevOps Handbook (Kim, Humble, Debois, Willis)

## Related Capabilities

- Resilience Engineering
- Incident Analysis
- DevOps Practices
- Deployment Planning
- Monitoring and Observability
