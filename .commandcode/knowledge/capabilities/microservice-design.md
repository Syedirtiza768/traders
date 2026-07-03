# Microservice Design

## Purpose

Design individual microservices that are autonomous, maintain clear boundaries, own their data, and can be developed, deployed, and scaled independently.

## Inputs

- Service boundary definition (from Service Boundary Identification)
- Business requirements for the service
- Integration requirements
- Scale requirements
- Team structure and capabilities
- Operational requirements

## Expected Outputs

- Service specification
- API design
- Data model
- Communication patterns
- Deployment configuration
- Observability strategy
- Testing strategy

## Decision Process

### 1. Service Definition

**Autonomy Principles**
- Service owns its data exclusively
- Service controls its deployment lifecycle
- Service can be changed without coordinating with other services
- Service can scale independently

**Service Characteristics**
| Characteristic | Good Microservice | Poor Microservice |
|----------------|-------------------|-------------------|
| Size | Focused, single purpose | Does too many things |
| Data | Owns its database | Shares database |
| Deployment | Independent | Requires coordination |
| Team | One team owns it | Multiple teams |
| Change | Deploy anytime | Requires releases |

### 2. API Design

**API Styles**

| Style | Use When | Trade-offs |
|-------|----------|------------|
| REST | CRUD operations, resource-oriented | Simple, widely understood |
| GraphQL | Flexible queries, multiple clients | Over-fetching control, complexity |
| gRPC | Internal services, high performance | Binary, requires schema |
| Event-based | Async communication, decoupling | Eventual consistency |

**API Versioning Strategies**
- URL versioning: `/v1/orders`
- Header versioning: `Accept: application/vnd.api.v1+json`
- Query parameter: `?version=1`

**Backward Compatibility Rules**
- Adding fields: Safe
- Removing fields: Breaking
- Changing field types: Breaking
- Adding optional parameters: Safe
- Making optional required: Breaking

### 3. Data Ownership

**Database per Service**
- Each service has its own database
- No direct database access between services
- Data accessed only through service API

**Benefits**:
- Independent scaling
- Technology choice freedom
- Failure isolation
- Schema evolution independence

**Challenges**:
- Data consistency across services
- Reporting and analytics
- Data duplication

**Data Patterns**

| Pattern | Use When |
|---------|----------|
| Database per service | Default approach |
| Schema separation | Shared infrastructure, logical separation |
| Table per service | Same database, different tables |

### 4. Communication Patterns

**Synchronous Communication**

| Pattern | Use When | Considerations |
|---------|----------|----------------|
| Request-response | Need immediate response | Latency, availability coupling |
| REST/HTTP | Public APIs, simplicity | Overhead, text-based |
| gRPC | Internal services, performance | Binary, streaming support |

**Asynchronous Communication**

| Pattern | Use When | Considerations |
|---------|----------|----------------|
| Message queue | One-to-one, reliable delivery | Ordering, exactly-once |
| Pub/sub | One-to-many, event notification | Fan-out, filtering |
| Event streaming | Event sourcing, replay | Retention, partitioning |

**Communication Guidelines**
- Prefer async for cross-service operations
- Use sync for queries within bounded context
- Never sync call downstream services that call back
- Consider CQRS for read/write separation

### 5. Service Collaboration

**Saga Pattern** (for distributed transactions)

| Approach | Description | Trade-offs |
|----------|-------------|------------|
| Choreography | Services emit events, react to events | Decentralized, harder to trace |
| Orchestration | Coordinator directs saga | Centralized, single point |

**Saga Steps**:
1. Each step has compensating action
2. If step fails, execute compensating actions
3. Eventually consistent outcome

**Example: Order Saga**
```
1. Create Order → Pending
2. Reserve Inventory → Compensate: Release Inventory
3. Process Payment → Compensate: Refund Payment
4. Confirm Order → Compensate: Cancel Order
```

**API Composition** (for queries across services)

- API Composer calls multiple services
- Aggregates responses
- In-memory join

**CQRS** (Command Query Responsibility Segregation)

- Separate models for reads and writes
- Write model: Optimized for commands
- Read model: Optimized for queries
- Events synchronize models

### 6. Service Configuration

**Configuration Sources**
- Environment variables
- Configuration files
- Configuration service
- Secrets management

**Configuration Principles**
- Externalize all configuration
- Environment-specific configuration
- Secrets never in code
- Configuration versioning

**Feature Flags**
- Enable/disable features without deployment
- Gradual rollout
- A/B testing
- Kill switch for new features

### 7. Deployment Strategy

**Containerization**
- Docker for packaging
- Kubernetes for orchestration
- Immutable infrastructure

**Deployment Patterns**

| Pattern | Description | Use When |
|---------|-------------|----------|
| Blue-green | Two identical environments, switch traffic | Zero downtime, easy rollback |
| Canary | Gradual traffic shift to new version | Risk mitigation, testing |
| Rolling | Incremental replacement | Resource efficient |

**Health Checks**
- Liveness: Is the service running?
- Readiness: Is the service ready to accept traffic?

### 8. Observability

**Logging**
- Structured logging (JSON)
- Correlation IDs for request tracing
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation

**Metrics**
- Request rate
- Error rate
- Latency percentiles
- Resource utilization
- Business metrics

**Tracing**
- Distributed tracing (Jaeger, Zipkin)
- Span per operation
- Trace across service boundaries
- Error attribution

**Alerting**
- Error rate threshold
- Latency threshold
- Availability threshold
- Resource utilization threshold

### 9. Testing Strategy

**Test Pyramid for Microservices**

| Test Type | Scope | Speed | Count |
|-----------|-------|-------|-------|
| Unit | Function/class | Fast | Many |
| Integration | Service + dependencies | Medium | Some |
| Contract | API compatibility | Fast | Per consumer |
| Component | Service in isolation | Medium | Some |
| End-to-end | Full system | Slow | Few |

**Contract Testing**
- Provider contract tests: Verify API matches contract
- Consumer contract tests: Verify consumer expectations
- Pact framework for contract management

**Service Virtualization**
- Mock external dependencies
- Simulate various scenarios
- Enable isolated testing

## Evaluation Criteria

### Service Design Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Autonomy | Shares database, tight coupling | Some independence | Fully autonomous |
| API design | Unclear, inconsistent | Documented, versioned | Well-designed, evolved |
| Data ownership | Shared database | Logical separation | Database per service |
| Communication | All synchronous | Mix of sync/async | Appropriate patterns |
| Observability | Logs only | Logs and metrics | Full observability |
| Testing | Manual only | Unit tests | Full pyramid |

## Trade-offs

### Service Size

| Size | Pros | Cons |
|------|------|------|
| Fine-grained | Independent deployment, scaling | More services, coordination |
| Coarse-grained | Simpler, fewer services | Larger blast radius |

**Guidance**: Start coarse, split when justified

### Synchronous vs Asynchronous

| Approach | Pros | Cons |
|----------|------|------|
| Synchronous | Simple, immediate response | Coupling, cascading failures |
| Asynchronous | Decoupled, resilient | Complex, eventual consistency |

**Guidance**: Async for commands, sync for queries

### Consistency

| Approach | Pros | Cons |
|----------|------|------|
| Strong | Simpler reasoning | Availability impact |
| Eventual | High availability | Complex, stale data |

**Guidance**: Strong within service, eventual across services

## Validation Checklist

- [ ] Service has clear, focused purpose
- [ ] Service owns its data exclusively
- [ ] API is well-designed and versioned
- [ ] Communication patterns match requirements
- [ ] Saga patterns handle distributed transactions
- [ ] Configuration is externalized
- [ ] Secrets are properly managed
- [ ] Deployment is automated
- [ ] Health checks are implemented
- [ ] Logging is structured with correlation IDs
- [ ] Metrics cover key indicators
- [ ] Distributed tracing is implemented
- [ ] Alerting is configured
- [ ] Testing covers all pyramid levels
- [ ] Contract tests verify API compatibility

## Common Pitfalls

1. **Distributed monolith**: Services that must be deployed together
2. **Shared database**: Undermining service autonomy
3. **Chatty services**: Too many sync calls between services
4. **Wrong boundaries**: Services not aligned with domain
5. **Ignoring operations**: Not planning for deployment, monitoring
6. **Over-engineering**: Too many patterns, too much complexity
7. **No contract testing**: API changes break consumers
8. **Synchronous chains**: Cascading failures, latency accumulation

## References

- Building Microservices (Newman)
- Microservices Patterns (Richardson)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)

## Related Capabilities

- Service Boundary Identification
- Distributed Systems Design
- API Design
- Resilience Engineering
- Deployment Planning
- Testing Strategy
