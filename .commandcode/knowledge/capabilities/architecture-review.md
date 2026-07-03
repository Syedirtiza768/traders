# Architecture Review

## Purpose

Systematically evaluate software architecture against quality attributes, principles, and trade-offs to identify strengths, weaknesses, and improvement opportunities.

## Inputs

- Architecture documentation (diagrams, ADRs, documentation)
- Quality attribute requirements (performance, scalability, security, etc.)
- Business context and constraints
- Existing codebase (if available)
- Operational characteristics (deployment, monitoring)
- Team structure and capabilities

## Expected Outputs

- Architecture assessment report
- Identified risks and mitigation strategies
- Improvement recommendations prioritized by impact
- Technical debt inventory
- Architecture fitness function results

## Decision Process

### 1. Context Understanding

- Identify business domain and criticality
- Understand scale requirements (users, data, transactions)
- Map organizational constraints (team size, skills, timeline)
- Document regulatory and compliance requirements
- Identify integration points and dependencies

### 2. Architecture Description Extraction

- Identify architectural style (monolith, microservices, layered, etc.)
- Map component structure and boundaries
- Document communication patterns
- Identify data flow and storage strategy
- Map deployment architecture

### 3. Quality Attribute Evaluation

For each relevant quality attribute:

**Performance**
- Response time requirements vs actual
- Throughput capacity
- Latency distribution
- Bottleneck identification

**Scalability**
- Horizontal scaling capability
- Vertical scaling limits
- Data partitioning strategy
- Stateless vs stateful components

**Availability/Reliability**
- Single points of failure
- Failure detection mechanisms
- Recovery procedures
- Data durability guarantees

**Security**
- Authentication/authorization mechanisms
- Data protection (encryption at rest/transit)
- Attack surface analysis
- Compliance alignment

**Maintainability**
- Modularity and cohesion
- Coupling analysis
- Code organization
- Documentation quality

**Testability**
- Test coverage
- Testability of components
- Mocking strategy
- Integration test approach

**Deployability**
- Deployment complexity
- Rollback capability
- Environment parity
- Configuration management

### 4. Principle Compliance Check

- SOLID principles application
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- Separation of concerns
- Single responsibility
- Dependency inversion

### 5. Trade-off Analysis

For each architectural decision:
- Document the trade-off
- Identify alternatives considered
- Evaluate if the chosen approach fits the context
- Assess if circumstances have changed

### 6. Technical Debt Assessment

- Identify shortcuts and temporary solutions
- Assess debt impact on quality attributes
- Prioritize remediation based on:
  - Business impact
  - Risk level
  - Remediation cost
  - Interest accumulation rate

### 7. Anti-Pattern Detection

Common anti-patterns to check:
- Big ball of mud
- Golden hammer (overusing familiar solutions)
- Boat anchor (keeping unnecessary components)
- Spaghetti code/lasagna architecture
- Vendor lock-in
- Copy-paste programming
- Magic numbers/strings

## Evaluation Criteria

### Architecture Fitness Score

Rate each dimension 1-5:

| Dimension | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|-----------|-----------|--------------|---------------|
| Modularity | Tightly coupled, unclear boundaries | Some separation, moderate coupling | Clear boundaries, low coupling |
| Testability | Difficult to test, many dependencies | Testable with effort | Easily testable, well-mocked |
| Deployability | Manual, error-prone deployments | Automated with some manual steps | Fully automated, zero-downtime |
| Scalability | Single-node, vertical only | Horizontal scaling possible | Auto-scaling, partitioned data |
| Observability | Logs only, reactive debugging | Metrics and logs, some tracing | Full observability, proactive |
| Security | Basic auth, no encryption | Standard auth, encrypted transport | Defense in depth, audited |

### Overall Assessment

- **Score 25-30**: Excellent architecture, minor improvements possible
- **Score 18-24**: Good architecture with specific areas for improvement
- **Score 12-17**: Adequate but needs attention in multiple areas
- **Score <12**: Significant architectural issues requiring immediate attention

## Trade-offs

### Common Architecture Trade-offs

| Trade-off | Option A | Option B | Considerations |
|-----------|----------|----------|----------------|
| Coupling | Tightly coupled (simpler) | Loosely coupled (complex) | Team size, change frequency |
| Consistency | Strong (simpler reasoning) | Eventual (better availability) | Business requirements |
| Granularity | Coarse-grained (fewer services) | Fine-grained (more services) | Team autonomy vs coordination |
| Synchronous | Request/response (simpler) | Event-driven (more resilient) | Latency requirements |
| Data | Shared database (simpler) | Database per service (isolated) | Domain boundaries |

## Validation Checklist

- [ ] All quality attributes have defined requirements
- [ ] Architecture decisions are documented with rationale
- [ ] No single points of failure in critical paths
- [ ] Failure modes are understood and handled
- [ ] Security is addressed at all layers
- [ ] Deployment and rollback procedures are tested
- [ ] Monitoring and alerting cover critical metrics
- [ ] Team can effectively work with the architecture
- [ ] Architecture supports current and near-term scale
- [ ] Technical debt is inventoried and prioritized

## Common Pitfalls

1. **Over-engineering**: Building for scale that may never come
2. **Under-engineering**: Ignoring known requirements
3. **Resume-driven development**: Choosing technologies for learning rather than fit
4. **Copy-paste architecture**: Applying patterns without understanding context
5. **Ignoring operations**: Architecture that works in dev but not production
6. **Premature optimization**: Optimizing before measuring
7. **Analysis paralysis**: Endless review without action
8. **Golden hammer**: Using familiar solutions inappropriately

## References

- Fundamentals of Software Architecture (Richards, Ford)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)
- Clean Architecture (Martin)
- Building Microservices (Newman)

## Related Capabilities

- System Design
- Architecture Decision Records
- Technical Debt Assessment
- Security Review
- Performance Optimization
