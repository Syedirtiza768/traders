# Technical Debt Assessment

## Purpose

Systematically evaluate technical debt to identify, prioritize, and plan remediation while balancing delivery velocity and long-term sustainability.

## Inputs

- Codebase analysis
- Architecture documentation
- Development velocity metrics
- Defect rates and patterns
- Team feedback
- Business priorities

## Expected Outputs

- Technical debt inventory
- Impact assessment
- Prioritized remediation plan
- Cost-benefit analysis
- Prevention strategies

## Decision Process

### 1. Technical Debt Identification

**Debt Categories**

| Category | Description | Examples |
|----------|-------------|----------|
| Architecture debt | Structural issues | Monolith when microservices needed |
| Code debt | Implementation issues | Code smells, duplication |
| Testing debt | Insufficient testing | Low coverage, missing tests |
| Documentation debt | Missing or outdated docs | Undocumented APIs, stale docs |
| Infrastructure debt | Operational issues | Manual deployments, missing monitoring |
| Dependency debt | Outdated dependencies | Old libraries, security vulnerabilities |

**Identification Methods**

| Method | Description | Output |
|--------|-------------|--------|
| Static analysis | Automated code scanning | Code smell report |
| Architecture review | Manual review of structure | Architecture issues |
| Team survey | Developer feedback | Pain points |
| Metrics analysis | Velocity, defect trends | Process issues |
| Dependency scan | Security scanning | Vulnerability report |

**Code Smell Detection**

| Smell | Detection | Impact |
|-------|-----------|--------|
| Long methods | Lines of code > 50 | Hard to understand, test |
| Large classes | Lines of code > 500 | Low cohesion |
| Duplicate code | Copy-paste detection | Maintenance burden |
| Deep nesting | Nesting level > 3 | Complexity |
| Long parameter lists | Parameters > 4 | Hard to use |
| Dead code | Unused code detection | Confusion |

### 2. Impact Assessment

**Impact Dimensions**

| Dimension | Assessment | Weight |
|-----------|------------|--------|
| Development velocity | Slows down development | High |
| Defect rate | Increases bugs | High |
| Onboarding | Hard for new developers | Medium |
| Performance | Degrades system performance | High |
| Security | Security vulnerabilities | Critical |
| Scalability | Limits growth | Medium |

**Impact Scoring**

| Score | Description | Example |
|-------|-------------|---------|
| 5 (Critical) | Blocking delivery, security risk | Security vulnerability |
| 4 (High) | Major impact on velocity | Architecture prevents scaling |
| 3 (Medium) | Noticeable impact | Code complexity slows changes |
| 2 (Low) | Minor impact | Documentation gaps |
| 1 (Minimal) | Negligible impact | Code style inconsistencies |

**Interest Rate Assessment**

```
Interest = (Time lost per change) × (Frequency of changes)

High interest: Changes frequently, significant time lost
Low interest: Rarely changes, minimal time lost
```

### 3. Remediation Cost Estimation

**Cost Factors**

| Factor | Description |
|--------|-------------|
| Effort | Developer hours required |
| Risk | Chance of introducing bugs |
| Coordination | Dependencies on other work |
| Testing | Testing effort required |
| Deployment | Deployment complexity |

**Cost Estimation**

| Size | Effort | Risk | Example |
|------|--------|------|---------|
| Small | < 1 week | Low | Extract method |
| Medium | 1-4 weeks | Medium | Extract class |
| Large | 1-3 months | High | Architecture refactor |
| Very large | > 3 months | Very high | System rewrite |

**Cost-Benefit Analysis**

```
ROI = (Benefit - Cost) / Cost

Where:
Benefit = Time saved per change × Number of future changes
Cost = Remediation effort + Risk cost
```

### 4. Prioritization Framework

**Priority Matrix**

| Impact | Cost | Priority | Action |
|--------|------|----------|--------|
| High | Low | P1 | Fix immediately |
| High | Medium | P2 | Plan for next sprint |
| High | High | P3 | Plan for quarter |
| Medium | Low | P2 | Schedule opportunistically |
| Medium | Medium | P3 | Backlog |
| Medium | High | P4 | Defer |
| Low | Any | P4 | Fix when convenient |

**Prioritization Criteria**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Business impact | 30% | Effect on business goals |
| Development impact | 25% | Effect on velocity |
| Security risk | 20% | Security implications |
| Remediation cost | 15% | Effort to fix |
| Interest rate | 10% | Ongoing cost of debt |

**Priority Score Calculation**

```
Priority Score = (Impact × 0.55) + (Security × 0.20) - (Cost × 0.15) + (Interest × 0.10)
```

### 5. Remediation Planning

**Remediation Strategies**

| Strategy | When to Use | Approach |
|----------|-------------|----------|
| Fix now | High impact, low cost | Immediate action |
| Fix soon | High impact, medium cost | Next sprint |
| Fix later | Medium impact | Backlog, schedule |
| Fix never | Low impact | Accept debt |
| Prevent | New development | Standards, practices |

**Remediation Approaches**

| Approach | Description | When to Use |
|----------|-------------|-------------|
| Big bang | Fix all at once | Small scope, high risk tolerance |
| Incremental | Fix piece by piece | Large scope, low risk |
| Boy scout | Leave better than found | Ongoing improvement |
| Quarantine | Isolate debt | Containment strategy |

**Remediation Allocation**

```
Debt Budget per Sprint:
├── 20% of capacity for debt reduction
├── Focus on highest priority items
└── Track progress and adjust
```

### 6. Prevention Strategies

**Prevention Practices**

| Practice | Description | Prevents |
|----------|-------------|----------|
| Code review | Peer review of changes | Code debt |
| Definition of Done | Quality checklist | All debt types |
| Architecture review | Review significant changes | Architecture debt |
| Automated testing | Test coverage requirements | Testing debt |
| Documentation | Update docs with changes | Documentation debt |
| Dependency management | Regular updates, scanning | Dependency debt |

**Quality Gates**

```
Definition of Done:
├── Code reviewed
├── Tests passing
├── Coverage > 80%
├── No new warnings
├── Documentation updated
└── Deployed to staging
```

### 7. Debt Tracking

**Debt Register**

| ID | Description | Category | Impact | Cost | Priority | Status |
|----|-------------|----------|--------|------|----------|--------|
| TD-001 | Monolithic architecture | Architecture | High | High | P3 | Open |
| TD-002 | Missing unit tests | Testing | Medium | Medium | P2 | In Progress |
| TD-003 | Outdated dependencies | Dependency | High | Low | P1 | Open |

**Metrics to Track**

| Metric | Description | Target |
|--------|-------------|--------|
| Debt count | Number of debt items | Decreasing |
| Debt age | Time since identification | Decreasing |
| Debt remediation rate | Items fixed per sprint | Increasing |
| Debt interest | Time lost to debt | Decreasing |
| New debt rate | Items added per sprint | Decreasing |

### 8. Communication and Reporting

**Stakeholder Communication**

| Stakeholder | Information Needed | Frequency |
|-------------|-------------------|-----------|
| Leadership | Business impact, ROI | Monthly |
| Product | Velocity impact, trade-offs | Sprint |
| Development | Details, remediation plan | Weekly |

**Reporting Dashboard**

```
Technical Debt Summary:
├── Total debt items: 45
├── Critical: 3
├── High: 12
├── Medium: 20
├── Low: 10
├── Remediation rate: 5/sprint
├── New debt rate: 2/sprint
└── Trend: Improving
```

## Evaluation Criteria

### Debt Health Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Identification | Ad-hoc | Some tracking | Systematic |
| Prioritization | None | Basic | Data-driven |
| Remediation | Reactive | Some planned | Proactive |
| Prevention | None | Some practices | Comprehensive |
| Tracking | None | Basic metrics | Full visibility |

## Trade-offs

### Debt vs Delivery

| Priority | Approach | Trade-off |
|----------|----------|-----------|
| Delivery first | Ignore debt | Faster now, slower later |
| Balance | Allocate 20% | Sustainable pace |
| Debt first | Focus on debt | Slower now, faster later |

**Guidance**: Allocate consistent capacity for debt reduction

### Remediation Scope

| Scope | Risk | Benefit |
|-------|------|---------|
| Big bang | High | Quick resolution |
| Incremental | Low | Sustainable progress |

**Guidance**: Prefer incremental remediation

## Validation Checklist

- [ ] Debt categories are identified
- [ ] Debt items are catalogued
- [ ] Impact is assessed
- [ ] Cost is estimated
- [ ] Priority is assigned
- [ ] Remediation is planned
- [ ] Prevention practices exist
- [ ] Tracking is in place
- [ ] Stakeholders are informed

## Common Pitfalls

1. **Ignoring debt**: Debt accumulates, velocity decreases
2. **No tracking**: Invisible debt grows
3. **No allocation**: Never time for remediation
4. **Over-prioritizing**: All delivery, no debt reduction
5. **Under-prioritizing**: All debt reduction, no delivery
6. **Big bang fixes**: High risk, often incomplete
7. **No prevention**: Debt keeps growing
8. **Invisible debt**: Not communicated to stakeholders

## References

- Refactoring (Fowler)
- Fundamentals of Software Architecture (Richards, Ford)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)

## Related Capabilities

- Architecture Review
- Refactoring Strategy
- Legacy Modernization
- Architecture Decision Records
