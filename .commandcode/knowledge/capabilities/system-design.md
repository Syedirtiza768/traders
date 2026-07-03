# System Design

## Purpose

Design software systems end-to-end by analyzing requirements, defining architecture, selecting technologies, and planning implementation while balancing trade-offs.

## Inputs

- Business requirements
- Non-functional requirements
- Constraints (budget, timeline, team)
- Existing systems (if any)
- Integration requirements
- Regulatory requirements

## Expected Outputs

- System architecture
- Component design
- Technology selection
- Data model
- API contracts
- Deployment architecture
- Risk assessment

## Decision Process

### 1. Requirements Analysis

**Functional Requirements**
- What the system must do
- User stories and use cases
- Business processes
- Data flows

**Non-Functional Requirements**

| Category | Questions | Metrics |
|----------|-----------|---------|
| Performance | Response time, throughput? | Latency, RPS |
| Scalability | Expected growth? | Users, data, traffic |
| Availability | Uptime requirement? | 99.9%, 99.99% |
| Security | Data sensitivity? | Encryption, compliance |
| Reliability | Failure tolerance? | MTBF, MTTR |
| Maintainability | Change frequency? | Deployment rate |

**Constraint Analysis**
- Budget constraints
- Timeline constraints
- Team size and skills
- Technology constraints
- Regulatory constraints
- Integration constraints

### 2. System Context

**Context Diagram**
```
                    ┌─────────────┐
                    │   Users     │
                    └──────┬──────┘
                           │
    ┌──────────┐          │          ┌──────────┐
    │ External │──────────┼──────────│ Payment  │
    │   APIs   │          │          │ Gateway  │
    └──────────┘          │          └──────────┘
                     ┌────┴────┐
                     │  System │
                     └────┬────┘
                          │
    ┌──────────┐          │          ┌──────────┐
    │  Email   │──────────┼──────────│ Database │
    │ Service  │          │          │          │
    └──────────┘          │          └──────────┘
                    ┌─────┴─────┐
                    │   Cache   │
                    └───────────┘
```

**Integration Points**
- External systems
- Third-party services
- Legacy systems
- Data sources

### 3. Architecture Selection

**Architecture Styles**

| Style | When to Use | Trade-offs |
|-------|-------------|------------|
| Monolith | Small team, simple domain | Simple but limited scaling |
| Modular Monolith | Medium team, growing complexity | Organized but single deploy |
| Microservices | Large team, complex domain | Scalable but complex |
| Event-Driven | Real-time, decoupled needs | Responsive but complex |
| Layered | Traditional web apps | Simple but can become monolithic |

**Decision Factors**
- Team size and structure
- Domain complexity
- Scale requirements
- Deployment frequency
- Organizational maturity

### 4. Component Design

**Component Identification**
- By business capability
- By domain (DDD bounded contexts)
- By technical layer
- By deployment unit

**Component Specification**
```
Component: Order Service
├── Purpose: Manage order lifecycle
├── Responsibilities:
│   ├── Create order
│   ├── Update order status
│   ├── Calculate totals
│   └── Manage order items
├── Dependencies:
│   ├── Inventory Service
│   ├── Payment Service
│   └── Notification Service
├── Data owned:
│   ├── Orders
│   └── Order items
├── APIs exposed:
│   ├── POST /orders
│   ├── GET /orders/{id}
│   └── PUT /orders/{id}/status
└── Events published:
    ├── OrderCreated
    ├── OrderUpdated
    └── OrderCompleted
```

### 5. Data Architecture

**Data Characteristics**
- Volume: How much data?
- Velocity: How fast does it change?
- Variety: What types of data?
- Veracity: How reliable?

**Data Storage Selection**

| Data Type | Storage Options |
|-----------|-----------------|
| Transactional | RDBMS (PostgreSQL, MySQL) |
| Documents | Document DB (MongoDB) |
| Cache | Redis, Memcached |
| Search | Elasticsearch |
| Time-series | InfluxDB, TimescaleDB |
| Graph | Neo4j |

**Data Flow**
```
Write Path:
User → API → Service → Database
                  ↓
               Cache (invalidate)

Read Path:
User → API → Service → Cache (check)
                  ↓ (miss)
               Database → Cache (populate)
```

### 6. API Design

**API Style Selection**

| Style | Use When | Characteristics |
|-------|----------|-----------------|
| REST | CRUD operations | Resource-based, HTTP methods |
| GraphQL | Flexible queries | Schema-based, client-driven |
| gRPC | Internal services | Binary, streaming, typed |
| WebSocket | Real-time | Bidirectional, persistent |

**API Design Principles**
- Consistent naming
- Versioning strategy
- Error handling
- Pagination
- Filtering and sorting
- Authentication/authorization

### 7. Deployment Architecture

**Environment Strategy**
```
Development → CI/CD → Staging → Production
                         ↓
                      Testing
```

**Deployment Topology**
```
                    ┌─────────────┐
                    │   CDN       │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Load Balancer│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌────┴────┐ ┌─────┴─────┐
        │ Service A │ │Service B│ │ Service C │
        └─────┬─────┘ └────┬────┘ └─────┬─────┘
              │            │            │
        ┌─────┴────────────┴────────────┴─────┐
        │           Database Cluster          │
        └─────────────────────────────────────┘
```

**Infrastructure Decisions**
- Cloud provider selection
- Container orchestration
- Database hosting
- Caching layer
- Monitoring stack

### 8. Security Architecture

**Security Layers**

| Layer | Concerns | Controls |
|-------|----------|----------|
| Network | Traffic, access | Firewall, VPN |
| Application | Auth, authz | OAuth, RBAC |
| Data | Encryption, privacy | Encryption at rest/transit |
| Infrastructure | Access, hardening | IAM, patching |

**Security Requirements**
- Authentication mechanism
- Authorization model
- Data encryption
- Audit logging
- Compliance requirements

### 9. Reliability Design

**Failure Modes**
- Component failures
- Network failures
- Data center failures
- Dependency failures

**Resilience Patterns**
- Circuit breakers
- Retries with backoff
- Timeouts
- Fallbacks
- Bulkheads

**Recovery Procedures**
- Backup strategy
- Restore procedures
- Failover mechanisms
- Disaster recovery

### 10. Trade-off Analysis

**Common Trade-offs**

| Trade-off | Option A | Option B | Decision Criteria |
|-----------|----------|----------|-------------------|
| Consistency vs Availability | Strong consistency | High availability | Business requirements |
| Simplicity vs Flexibility | Monolith | Microservices | Team size, complexity |
| Cost vs Performance | Basic infrastructure | Premium infrastructure | Budget, requirements |
| Build vs Buy | Custom solution | Off-the-shelf | Differentiation needs |

**Trade-off Documentation**
```
Decision: Use PostgreSQL for primary database

Options Considered:
1. PostgreSQL - Strong consistency, mature ecosystem
2. MongoDB - Flexible schema, horizontal scaling
3. CockroachDB - Distributed, PostgreSQL compatible

Decision Rationale:
- Strong consistency required for financial data
- Team expertise in PostgreSQL
- Mature tooling and ecosystem

Trade-offs Accepted:
- Manual sharding for scale (vs built-in in MongoDB)
- Single region initially (vs multi-region in CockroachDB)

Consequences:
- Simpler initial architecture
- May need to revisit for global scale
```

## Evaluation Criteria

### Design Quality Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Requirements coverage | Gaps identified | Core covered | All covered |
| Trade-off documentation | None | Some documented | All documented |
| Scalability | Not addressed | Basic scaling | Comprehensive |
| Security | Minimal | Basic controls | Defense in depth |
| Reliability | Single points | Some redundancy | Full resilience |

## Trade-offs

### Complexity vs Simplicity

| Approach | Pros | Cons |
|----------|------|------|
| Simple | Easy to understand, fast to build | May not scale |
| Complex | Handles edge cases, scales | Hard to understand, slow |

**Guidance**: Start simple, add complexity when justified

### Build vs Buy

| Approach | When to Use |
|----------|-------------|
| Build | Core differentiator, specific needs |
| Buy | Commodity, faster time to market |

**Guidance**: Buy commodity, build differentiation

## Validation Checklist

- [ ] All requirements are addressed
- [ ] Architecture style is justified
- [ ] Components are clearly defined
- [ ] Data architecture is designed
- [ ] APIs are specified
- [ ] Deployment architecture is planned
- [ ] Security is addressed
- [ ] Reliability is designed
- [ ] Trade-offs are documented
- [ ] Risks are identified

## Common Pitfalls

1. **Over-engineering**: Designing for scale not needed
2. **Under-engineering**: Ignoring known requirements
3. **Gold-plating**: Adding unnecessary features
4. **Resume-driven design**: Choosing technologies for learning
5. **Ignoring constraints**: Not considering budget, timeline, team
6. **No trade-off documentation**: Decisions not recorded
7. **Siloed design**: Not involving stakeholders
8. **Ignoring operations**: Not planning for deployment, monitoring

## References

- Designing Data-Intensive Applications (Kleppmann)
- Fundamentals of Software Architecture (Richards, Ford)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)
- Building Microservices (Newman)

## Related Capabilities

- Architecture Review
- Distributed Systems Design
- Database Selection
- API Design
- Security Review
- Deployment Planning
