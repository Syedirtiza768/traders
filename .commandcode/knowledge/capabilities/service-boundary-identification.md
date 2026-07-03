# Service Boundary Identification

## Purpose

Identify appropriate service boundaries using domain-driven design principles, team structure considerations, and operational requirements to enable autonomous, cohesive services.

## Inputs

- Domain model and business capabilities
- Team structure and capabilities
- Existing system architecture
- Data relationships and dependencies
- Change patterns and frequency
- Scale requirements

## Expected Outputs

- Identified service boundaries
- Bounded context definitions
- Service ownership assignments
- Integration requirements
- Migration strategy

## Decision Process

### 1. Domain Analysis

**Business Capability Mapping**
- Identify core business capabilities
- Map capabilities to business processes
- Identify supporting capabilities
- Document capability relationships

**Domain Event Storming**
- Identify domain events (past tense)
- Identify commands that trigger events
- Group related events and commands
- Identify aggregates that handle commands

**Example Event Storming Output:**
```
Events:
- OrderPlaced
- PaymentProcessed
- InventoryReserved
- OrderShipped
- OrderCancelled

Commands:
- PlaceOrder
- ProcessPayment
- ReserveInventory
- ShipOrder
- CancelOrder

Aggregates:
- Order (handles PlaceOrder, CancelOrder)
- Payment (handles ProcessPayment)
- Inventory (handles ReserveInventory)
```

### 2. Bounded Context Identification

**Signals for Context Boundaries**

| Signal | Example |
|--------|---------|
| Different vocabulary | "Customer" means different things in Sales vs Support |
| Different rules | Different validation rules for same concept |
| Different data needs | Different attributes needed for same entity |
| Different teams | Different teams responsible for different areas |
| Different consistency | Different consistency requirements |

**Context Discovery Process**
1. List all nouns in the domain
2. Identify where same noun has different meanings
3. Map where different rules apply to same concept
4. Identify where different teams work on same concept
5. Draw boundaries around consistent areas

**Example Bounded Contexts:**
```
Sales Context:
- Customer (prospect, lead)
- Product (catalog item, pricing)
- Order (quote, draft)

Fulfillment Context:
- Order (confirmed order, shipment)
- Product (inventory item, SKU)
- Warehouse (location, capacity)

Support Context:
- Customer (account holder)
- Order (completed order)
- Ticket (issue, resolution)
```

### 3. Service Boundary Criteria

**Cohesion Indicators** (Should be in same service)
- Same business capability
- Same data lifecycle
- Same consistency requirements
- Same team ownership
- High communication frequency
- Same transactional boundary

**Separation Indicators** (Should be separate services)
- Different business capabilities
- Different data ownership
- Different consistency needs
- Different teams
- Different scale requirements
- Different technology needs

**Decision Matrix:**

| Factor | Same Service | Separate Services |
|--------|--------------|-------------------|
| Transaction | Must be atomic | Can be eventual |
| Data | Same entity | Different entities |
| Team | Same team | Different teams |
| Change | Change together | Change independently |
| Scale | Same scale | Different scale |

### 4. Service Granularity

**Size Considerations**

| Size | Characteristics | When to Use |
|------|-----------------|-------------|
| Large | Multiple capabilities, larger team | Early in decomposition, high cohesion |
| Medium | Single capability, focused team | Most common, balanced trade-offs |
| Small | Single function, small team | High-scale components, clear boundaries |

**Granularity Decision Factors**

| Factor | Larger Service | Smaller Service |
|--------|----------------|-----------------|
| Team size | Large team | Small team |
| Complexity | High cohesion | Low cohesion |
| Scale | Uniform scaling | Independent scaling |
| Change rate | Change together | Change independently |
| Transactions | Need distributed transactions | Can use eventual consistency |

### 5. Conway's Law Alignment

**Principle**: Design services to match team structure

**Reverse Conway Maneuver**:
1. Design desired architecture
2. Organize teams to match
3. Architecture emerges from team boundaries

**Team-Service Alignment**:
- One team owns one or more services
- Service boundaries align with team boundaries
- Team has full ownership (dev + ops)
- Minimize cross-team dependencies

**Team Assignment Matrix:**

| Service | Team | Reason |
|---------|------|--------|
| Order Service | Order Team | Core business capability |
| Payment Service | Payments Team | Specialized domain |
| Inventory Service | Fulfillment Team | Domain expertise |
| Notification Service | Platform Team | Cross-cutting concern |

### 6. Data Ownership

**Database per Service**
- Each service owns its data
- No direct database access between services
- Data accessed only through service API

**Data Ownership Rules**:
1. Single source of truth for each entity
2. Service owns its data schema
3. Other services reference by ID only
4. Data duplication requires explicit synchronization

**Data Ownership Decision:**

| Data | Owner | Reason |
|------|-------|--------|
| Order data | Order Service | Primary entity |
| Customer data | Customer Service | Primary entity |
| Payment data | Payment Service | Primary entity |
| Inventory data | Inventory Service | Primary entity |

### 7. Integration Analysis

**Integration Patterns**

| Pattern | Use When | Trade-offs |
|---------|----------|------------|
| Sync API | Need immediate response | Coupling, latency |
| Async events | Decoupling needed | Eventual consistency |
| Shared database | Legacy constraints | Tight coupling |
| API gateway | Need abstraction | Additional hop |

**Dependency Direction**:
- Upstream: Service that provides capability
- Downstream: Service that consumes capability
- Minimize bidirectional dependencies

**Integration Decision Matrix:**

| Need | Pattern | Example |
|------|---------|---------|
| Query data | Sync API | GET /orders/{id} |
| Execute command | Sync API or Async | POST /orders |
| Notify of event | Async event | OrderPlaced event |
| Batch sync | Scheduled job | Nightly data sync |

### 8. Boundary Validation

**Validation Questions**:
1. Can this service be developed independently?
2. Can this service be deployed independently?
3. Can this service scale independently?
4. Is the team small enough to own it?
5. Is the team large enough to support it?
6. Are dependencies minimal and clear?
7. Is data ownership clear?
8. Do changes stay within boundaries?

**Anti-Pattern Detection**:
- Distributed monolith: Services that must deploy together
- Chatty services: Too many calls between services
- Data coupling: Services sharing database
- Wrong boundaries: Services not aligned with domain

## Evaluation Criteria

### Boundary Quality Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Cohesion | Low, scattered | Moderate | High, focused |
| Autonomy | Dependent | Partially autonomous | Fully autonomous |
| Data ownership | Shared | Logical separation | Database per service |
| Team alignment | Misaligned | Partially aligned | Fully aligned |
| Change scope | Cross-service | Some cross-service | Within service |

## Trade-offs

### Granularity Trade-offs

| Granularity | Pros | Cons |
|-------------|------|------|
| Coarse | Simple, fewer services | Larger blast radius, harder to scale |
| Fine | Independent scaling, deployment | More services, coordination overhead |

**Guidance**: Start coarse, split when justified

### Consistency Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Strong consistency | Simpler reasoning | Tight coupling |
| Eventual consistency | Loose coupling | Complex, stale data |

**Guidance**: Strong within service, eventual across services

## Validation Checklist

- [ ] Bounded contexts are identified
- [ ] Service boundaries align with bounded contexts
- [ ] Each service has clear purpose
- [ ] Data ownership is explicit
- [ ] Team ownership is assigned
- [ ] Dependencies are minimized
- [ ] Integration patterns are appropriate
- [ ] Services can deploy independently
- [ ] Services can scale independently
- [ ] Changes stay within boundaries

## Common Pitfalls

1. **Wrong boundaries**: Services not aligned with domain
2. **Too small**: Services too granular, too many
3. **Too large**: Services doing too much
4. **Data coupling**: Sharing databases
5. **Ignoring teams**: Not aligning with team structure
6. **Premature decomposition**: Splitting before understanding
7. **Technical boundaries**: Splitting by layer, not domain
8. **Ignoring change patterns**: Not considering what changes together

## References

- Domain-Driven Design (Evans)
- Building Microservices (Newman)
- Team Topologies (Skelton, Pais)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)

## Related Capabilities

- DDD Modeling
- Microservice Design
- Organizational Design
- Architecture Review
- Integration Strategy
