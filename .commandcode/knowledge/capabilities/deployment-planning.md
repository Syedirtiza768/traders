# Deployment Planning

## Purpose

Plan deployment strategies that minimize risk, enable quick rollbacks, and ensure smooth releases while maintaining system availability.

## Inputs

- Application architecture
- Availability requirements
- Risk tolerance
- Deployment frequency
- Team capabilities
- Infrastructure capabilities

## Expected Outputs

- Deployment strategy
- Environment configuration
- Rollback procedures
- Monitoring plan
- Communication plan
- Runbook

## Decision Process

### 1. Deployment Strategy Selection

**Strategy Comparison**

| Strategy | Description | Downtime | Risk | Complexity |
|----------|-------------|----------|------|------------|
| Recreate | Stop old, start new | Yes | High | Low |
| Rolling | Gradual replacement | No | Medium | Medium |
| Blue-Green | Two environments, switch | No | Low | Medium |
| Canary | Gradual traffic shift | No | Low | High |
| Feature Flags | Toggle features | No | Low | Medium |

**Decision Tree**:
```
Can you tolerate downtime?
├── YES → Recreate (simple)
│
└── NO → What is your risk tolerance?
    ├── High → Rolling deployment
    ├── Medium → Blue-green deployment
    └── Low → Canary deployment
```

### 2. Blue-Green Deployment

**Architecture**:
```
           ┌─────────────┐
           │ Load Balancer│
           └──────┬──────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────┴────┐       ┌────┴────┐
    │  Blue   │       │  Green  │
    │ (v1)    │       │ (v2)    │
    │ Active  │       │ Idle    │
    └─────────┘       └─────────┘
```

**Process**:
1. Deploy new version to idle environment
2. Run smoke tests on idle environment
3. Switch traffic to new environment
4. Monitor for issues
5. Rollback if needed (switch back)

**Requirements**:
- Two identical environments
- Sufficient capacity for both
- Database migration strategy
- Session handling strategy

**Database Considerations**:
```
Database Migration:
├── Backward compatible changes: Deploy first
├── Breaking changes: Multi-step migration
│   1. Add new schema (backward compatible)
│   2. Deploy new version (dual-write)
│   3. Migrate data
│   4. Switch to new schema
│   5. Remove old schema
```

### 3. Canary Deployment

**Architecture**:
```
           ┌─────────────┐
           │ Load Balancer│
           └──────┬──────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────┴────┐       ┌────┴────┐
    │ Stable  │       │ Canary  │
    │ (v1)    │       │ (v2)    │
    │  95%    │       │   5%    │
    └─────────┘       └─────────┘
```

**Process**:
1. Deploy new version to small subset
2. Route small percentage of traffic
3. Monitor metrics
4. Gradually increase traffic
5. Full rollout or rollback

**Canary Stages**:
```
Stage 1: 5% traffic → Monitor 10 min
Stage 2: 25% traffic → Monitor 10 min
Stage 3: 50% traffic → Monitor 10 min
Stage 4: 100% traffic → Complete
```

**Metrics to Monitor**:
- Error rate
- Latency (P50, P95, P99)
- Resource utilization
- Business metrics

### 4. Rolling Deployment

**Architecture**:
```
Initial: [v1] [v1] [v1] [v1]
Step 1:  [v2] [v1] [v1] [v1]
Step 2:  [v2] [v2] [v1] [v1]
Step 3:  [v2] [v2] [v2] [v1]
Final:   [v2] [v2] [v2] [v2]
```

**Configuration**:
```
Rolling Update:
├── Max unavailable: 1 (how many can be down)
├── Max surge: 1 (how many extra can be created)
├── Progress deadline: 10 min
└── Min ready seconds: 30
```

**Considerations**:
- Handle multiple versions running simultaneously
- Database backward compatibility
- API backward compatibility
- Session handling

### 5. Feature Flags

**Implementation**:
```
Feature Flag Service:
├── Flag name
├── Enabled/disabled
├── Targeting rules
│   ├── Percentage rollout
│   ├── User segments
│   └── Environment
└── Default value
```

**Usage**:
```javascript
if (featureFlags.isEnabled('new-checkout', user)) {
  // New checkout flow
} else {
  // Old checkout flow
}
```

**Flag Lifecycle**:
```
1. Create flag (disabled)
2. Deploy code with flag
3. Enable for testing
4. Gradual rollout
5. Full rollout
6. Remove flag (cleanup)
```

### 6. Environment Strategy

**Environment Types**

| Environment | Purpose | Data | Lifespan |
|-------------|---------|------|----------|
| Development | Local development | Synthetic | Ephemeral |
| CI | Automated testing | Synthetic | Ephemeral |
| Staging | Pre-production testing | Anonymized | Permanent |
| Production | Live system | Real | Permanent |

**Environment Parity**:
- Same infrastructure
- Same configuration
- Same dependencies
- Same data schema (anonymized)

**Environment Promotion**:
```
Dev → CI → Staging → Production
        ↓
     Tests pass
        ↓
     Deploy to next
```

### 7. Rollback Strategy

**Rollback Triggers**:
- Error rate exceeds threshold
- Latency exceeds threshold
- Business metrics degrade
- Critical bug discovered

**Rollback Types**:
```
Immediate Rollback:
├── Blue-green: Switch back
├── Canary: Route all to stable
├── Rolling: Reverse the rollout
└── Feature flag: Disable flag

Database Rollback:
├── Forward migration: Apply fix
├── Backward migration: Revert schema
└── Point-in-time recovery: Restore backup
```

**Rollback Procedure**:
```
1. Detect issue (automated or manual)
2. Assess severity
3. Decide: Rollback or fix forward
4. Execute rollback
5. Verify recovery
6. Communicate status
7. Postmortem
```

### 8. Monitoring and Observability

**Deployment Metrics**:
```
During Deployment:
├── Error rate (per version)
├── Latency (per version)
├── Request rate (per version)
├── Resource utilization
└── Business metrics
```

**Alerting**:
```
Alert Conditions:
├── Error rate > 1% (new version)
├── P99 latency > 2x baseline
├── Success rate < 99%
└── Rollback triggered
```

**Deployment Dashboard**:
```
Deployment Status:
├── Current version: v2.1.0
├── Previous version: v2.0.0
├── Rollout: 50%
├── Duration: 15 min
├── Error rate: 0.5%
└── Latency P99: 150ms
```

### 9. Communication Plan

**Stakeholder Communication**:
```
Pre-deployment:
├── Deployment announcement
├── Expected duration
├── Expected impact
└── Rollback plan

During deployment:
├── Progress updates
├── Issue notifications
└── Rollback notifications

Post-deployment:
├── Completion announcement
├── Summary of changes
└── Known issues
```

**Communication Channels**:
- Email for announcements
- Chat for real-time updates
- Status page for public updates

### 10. Runbook

**Deployment Runbook Template**:
```
# Deployment Runbook: [Service Name]

## Pre-deployment
- [ ] Verify all tests pass
- [ ] Review change log
- [ ] Notify stakeholders
- [ ] Verify monitoring dashboards
- [ ] Confirm rollback procedure

## Deployment Steps
1. Deploy to staging
2. Run smoke tests
3. Deploy to production (canary)
4. Monitor for 10 minutes
5. Increase to 50%
6. Monitor for 10 minutes
7. Complete rollout

## Rollback Procedure
1. Execute rollback command
2. Verify traffic shifted
3. Monitor recovery
4. Notify stakeholders

## Contacts
- On-call: [contact]
- Service owner: [contact]
- Escalation: [contact]
```

## Evaluation Criteria

### Deployment Maturity Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Strategy | Manual, downtime | Automated, some downtime | Zero-downtime, automated |
| Rollback | Manual, slow | Documented, tested | Automated, fast |
| Monitoring | Logs only | Basic metrics | Full observability |
| Communication | None | Basic announcements | Comprehensive |

## Trade-offs

### Speed vs Safety

| Priority | Approach | Trade-off |
|----------|----------|-----------|
| Speed | Recreate, fast rollout | Higher risk |
| Safety | Canary, slow rollout | Slower deployment |

**Guidance**: Balance based on risk tolerance and impact

### Complexity vs Control

| Approach | Complexity | Control |
|----------|------------|---------|
| Recreate | Low | Low |
| Rolling | Medium | Medium |
| Blue-green | Medium | High |
| Canary | High | High |

**Guidance**: Choose based on team maturity and requirements

## Validation Checklist

- [ ] Deployment strategy is selected
- [ ] Environment strategy is defined
- [ ] Rollback procedure is documented
- [ ] Monitoring is configured
- [ ] Alerting is set up
- [ ] Communication plan exists
- [ ] Runbook is created
- [ ] Team is trained
- [ ] Practice deployment completed

## Common Pitfalls

1. **No rollback plan**: Stuck with bad deployment
2. **Insufficient monitoring**: Not detecting issues
3. **Database incompatibility**: Breaking changes
4. **No communication**: Surprising stakeholders
5. **Skipping staging**: Testing in production
6. **Too fast rollout**: Not catching issues
7. **No runbook**: Confusion during deployment
8. **Environment drift**: Staging differs from production

## References

- The DevOps Handbook (Kim, Humble, Debois, Willis)
- Accelerate (Forsgren, Humble, Kim)
- Building Microservices (Newman)
- Release It! (Nygard)

## Related Capabilities

- DevOps Practices
- Resilience Engineering
- Testing Strategy
- SRE Practices
