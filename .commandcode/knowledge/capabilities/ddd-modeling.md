# DDD Modeling

## Purpose

Apply Domain-Driven Design principles to create rich domain models that accurately reflect business concepts, rules, and language, enabling effective communication between domain experts and developers.

## Inputs

- Domain expert knowledge
- Business requirements
- Existing domain vocabulary
- Business processes and rules
- Organizational boundaries
- Integration requirements

## Expected Outputs

- Domain model with bounded contexts
- Ubiquitous language definitions
- Aggregate specifications
- Entity and value object definitions
- Domain event catalog
- Repository interfaces
- Service specifications

## Decision Process

### 1. Domain Exploration

**Knowledge Crunching**
- Collaborate with domain experts
- Extract domain knowledge
- Identify key concepts
- Discover hidden rules
- Document business processes

**Event Storming**
- Domain events (past tense: OrderPlaced, PaymentProcessed)
- Commands (imperative: PlaceOrder, ProcessPayment)
- Aggregates (consistency boundaries)
- Policies (reaction rules)
- External systems

### 2. Ubiquitous Language

**Definition**: A shared language between developers and domain experts

**Characteristics**:
- Used in code, documentation, conversation
- Evolves with understanding
- Specific to bounded context
- No translation between contexts

**Examples**:
| Business Term | Code Representation |
|----------------|---------------------|
| Order | Order aggregate |
| Place Order | PlaceOrder command |
| Order Placed | OrderPlaced event |
| Customer | Customer entity |
| Money | Money value object |

### 3. Bounded Context Identification

**Definition**: A boundary within which a particular model applies

**Identification Signals**:
- Different vocabulary for same concept
- Different business rules
- Different team ownership
- Different data requirements
- Different consistency requirements

**Context Mapping Patterns**:

| Pattern | Description | Use When |
|---------|-------------|----------|
| Shared Kernel | Shared subset of model | Common core needed |
| Customer/Supplier | Downstream team influences upstream | Dependent team has influence |
| Conformist | Accept upstream model as-is | No influence possible |
| Anticorruption Layer | Translate between contexts | Preserve model integrity |
| Open Host Service | Published API/protocol | Multiple downstream consumers |
| Published Language | Shared specification | Standard interchange |

### 4. Strategic Design

**Context Relationships**:
- Upstream/Downstream
- Partnership
- Shared Kernel
- Customer/Supplier
- Conformist
- Anticorruption Layer

**Team Alignment**:
- One team per bounded context
- Context boundaries align with team boundaries
- Conway's Law consideration

### 5. Tactical Design

**Entities**
- Defined by identity, not attributes
- Identity persists across state changes
- Mutable
- Examples: Order, Customer, Account

**Value Objects**
- Defined by attributes
- Immutable
- No identity
- Examples: Money, Address, DateRange

**Aggregates**
- Consistency boundary
- Root entity controls access
- Invariants maintained within
- External references only to root

**Aggregate Design Rules**:
1. Protect invariants within boundary
2. Small aggregates preferred
3. Reference other aggregates by identity only
4. Use eventual consistency between aggregates

**Domain Events**
- Something happened in domain
- Past tense naming
- Immutable
- Used for:
  - Communication between aggregates
  - Integration between contexts
  - Event sourcing

**Repositories**
- Collection-like interface
- Per aggregate root
- Hide persistence details
- Query by identity

**Domain Services**
- Operations not naturally in entity/value object
- Stateless
- Example: Currency conversion, transfer between accounts

**Factories**
- Create complex objects
- Reconstitute from persistence
- Encapsulate creation logic

### 6. Aggregate Design Process

**Step 1: Identify Invariants**
- What business rules must be maintained?
- What consistency is required?

**Step 2: Define Boundaries**
- What must be changed together?
- What can be eventually consistent?

**Step 3: Choose Root**
- What is the primary entity?
- What controls access?

**Step 4: Size Appropriately**
- Smaller is better
- Only include what's needed for invariants

**Example: Order Aggregate**
```
Order (root)
├── OrderId (value object)
├── CustomerId (value object, reference)
├── OrderLines (entities)
│   ├── ProductId
│   ├── Quantity
│   └── Price
├── Total (value object)
├── Status (value object)
└── Invariants:
    - Total = sum of line totals
    - Cannot add to submitted order
    - Must have at least one line
```

### 7. Domain Events Design

**Event Structure**:
```
OrderPlaced
├── orderId
├── customerId
├── orderLines
├── total
├── placedAt
└── placedBy
```

**Event Handling**:
- Within aggregate: Maintain invariants
- Between aggregates: Eventual consistency
- Between contexts: Integration events

### 8. Model Refinement

**Refactoring Triggers**:
- New domain insights
- Changing requirements
- Learning from implementation
- Model doesn't express domain well

**Refactoring Techniques**:
- Extract value object
- Introduce domain event
- Split aggregate
- Merge aggregates (rare)
- Extract service

## Evaluation Criteria

### Model Quality Checklist

| Aspect | Good Model | Poor Model |
|--------|------------|------------|
| Language | Matches domain expert speech | Technical jargon |
| Boundaries | Clear, aligned with business | Arbitrary, technical |
| Aggregates | Small, focused, invariant-protecting | Large, many entities |
| Consistency | Explicit boundaries | Implicit assumptions |
| Events | Business-meaningful | Technical CRUD |

### Model Validation Questions

1. Can domain experts understand the model?
2. Does code use ubiquitous language?
3. Are invariants clearly protected?
4. Are aggregates appropriately sized?
5. Are boundaries aligned with business?
6. Can model evolve independently?

## Trade-offs

### Aggregate Size

| Approach | Pros | Cons |
|----------|------|------|
| Large aggregate | Strong consistency | Performance, scalability |
| Small aggregate | Performance, scalability | Eventual consistency |

**Guidance**: Start small, grow only when invariants require it

### Model Purity

| Approach | Pros | Cons |
|----------|------|------|
| Pure domain model | Testable, expressive | Infrastructure concerns leak |
| Pragmatic model | Simpler | Less expressive |

**Guidance**: Keep domain pure, use infrastructure layer for persistence

## Validation Checklist

- [ ] Ubiquitous language defined and used
- [ ] Bounded contexts identified and mapped
- [ ] Aggregates protect invariants
- [ ] Aggregates are appropriately sized
- [ ] Entities have clear identity
- [ ] Value objects are immutable
- [ ] Domain events capture business occurrences
- [ ] Repositories provide collection-like interface
- [ ] Domain services are stateless
- [ ] Model reflects domain expert understanding
- [ ] Team uses ubiquitous language consistently

## Common Pitfalls

1. **Anemic domain model**: Entities with only getters/setters, no behavior
2. **Giant aggregates**: Including too much for "convenience"
3. **Reference by object**: Holding references to other aggregates
4. **Technical language**: Using technical terms instead of domain terms
5. **Ignoring bounded contexts**: One model for everything
6. **Over-modeling**: Creating value objects for everything
7. **Under-modeling**: Primitive obsession
8. **Database-driven design**: Letting schema drive model

## References

- Domain-Driven Design (Evans)
- Implementing Domain-Driven Design (Vaughn Vernon)
- Domain-Driven Design Distilled (Vaughn Vernon)

## Related Capabilities

- Service Boundary Identification
- Architecture Review
- System Design
- Database Selection
- Microservice Design
