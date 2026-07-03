# Distributed Systems Design

## Purpose

Design systems spanning multiple nodes with explicit consideration for consistency, availability, partition tolerance, latency, failure modes, and operational complexity.

## Inputs

- Functional requirements
- Non-functional requirements (latency, throughput, availability)
- Data characteristics (volume, velocity, variety)
- Consistency requirements
- Geographic distribution requirements
- Failure tolerance requirements
- Budget and team constraints

## Expected Outputs

- System architecture diagram
- Component specifications
- Data flow documentation
- Failure mode analysis
- Consistency model specification
- Communication protocol selections
- Deployment topology

## Decision Process

### 1. Requirements Analysis

**Consistency Requirements**
- What level of consistency is required?
  - Strong consistency (linearizable)
  - Sequential consistency
  - Causal consistency
  - Eventual consistency
- What are the business consequences of stale reads?
- What are the consequences of write conflicts?

**Availability Requirements**
- What uptime SLA is required? (99%, 99.9%, 99.99%)
- What is the cost of downtime?
- Can the system degrade gracefully?
- What functionality is critical vs nice-to-have?

**Latency Requirements**
- What response time is acceptable?
- What is the geographic distribution of users?
- Is tail latency important? (P99)
- What operations are latency-sensitive?

**Scale Requirements**
- Expected data volume growth
- Read vs write ratio
- Peak vs average load
- Geographic distribution

### 2. CAP Theorem Application

Given network partition is inevitable in distributed systems:

| Priority | Consistency | Availability | Use Case |
|----------|-------------|--------------|----------|
| CP | Strong | Reduced during partition | Financial transactions, inventory |
| AP | Eventual | High | Social media, content delivery |
| CA | Strong | High | Single-node systems (not truly distributed) |

**Decision Framework:**
1. Is strong consistency required for correctness? → CP
2. Can business tolerate stale data? → AP
3. Can we tolerate reduced availability during partitions? → CP
4. Must we always accept writes? → AP

### 3. Consistency Model Selection

| Model | Guarantees | Trade-offs | Use Cases |
|-------|------------|------------|-----------|
| Linearizable | All operations appear atomic | High latency, low availability | Leader election, locks |
| Sequential | Operations from each client are ordered | Simpler than linearizable | Session data |
| Causal | Causally related operations are ordered | Requires tracking dependencies | Social feeds |
| Eventual | Converges to consistent state eventually | Temporary inconsistency | DNS, caching |

### 4. Data Distribution Strategy

**Replication**
- Single leader (primary-replica)
  - Writes go to leader
  - Reads can go to replicas
  - Leader is bottleneck
  - Failover complexity
  
- Multi-leader
  - Writes to any leader
  - Conflict resolution required
  - Better write scalability
  - More complex consistency
  
- Leaderless
  - Any node can accept writes
  - Quorum-based reads/writes
  - No single point of failure
  - Complex conflict resolution

**Partitioning (Sharding)**
- Key-based partitioning
  - Hash function on key
  - Even distribution
  - Range queries difficult
  
- Range partitioning
  - Keys sorted in ranges
  - Range queries efficient
  - Hot spots possible
  
- Directory-based
  - Lookup table for partition mapping
  - Flexible
  - Additional lookup overhead

### 5. Communication Patterns

**Synchronous Communication**
- Request-response
- RPC (gRPC, Thrift)
- HTTP/REST
- Simpler reasoning
- Tighter coupling
- Cascading failures risk

**Asynchronous Communication**
- Message queues
- Event streams
- Pub/sub
- Better decoupling
- Eventual consistency
- More complex reasoning

**Hybrid Approaches**
- Sync for queries
- Async for commands
- CQRS pattern

### 6. Failure Mode Analysis

For each component, analyze:

**Failure Detection**
- Heartbeats
- Health checks
- Failure detectors (Phi accrual)
- Timeout-based detection

**Failure Handling**
- Retry with backoff
- Circuit breaker
- Fallback/degradation
- Bulkhead isolation

**Recovery**
- State reconstruction
- Data reconciliation
- Split-brain resolution
- Leader election

### 7. Time and Ordering

**Problem**: Clocks are not perfectly synchronized

**Solutions:**
- Logical clocks (Lamport timestamps)
- Vector clocks
- Hybrid logical clocks
- TrueTime (Google Spanner)

**Ordering Guarantees:**
- Total order (all events ordered)
- Partial order (causally related events ordered)
- Per-client order

### 8. Consensus Requirements

When multiple nodes must agree:
- Leader election
- Atomic broadcast
- Distributed transactions

**Consensus Algorithms:**
- Paxos (correctness proven)
- Raft (understandable)
- Zab (ZooKeeper)
- PBFT (byzantine fault tolerant)

**Trade-offs:**
- Number of round trips
- Fault tolerance (number of failures tolerated)
- Performance vs correctness

## Evaluation Criteria

### Design Quality Checklist

| Aspect | Question | Good Answer |
|--------|----------|--------------|
| Consistency | Is the consistency model explicit? | Yes, documented with rationale |
| Availability | Is the availability target defined? | Yes, with SLA and consequences |
| Failure | Are failure modes documented? | Yes, with handling strategies |
| Scaling | Is scaling strategy defined? | Yes, with capacity limits |
| Latency | Are latency targets defined? | Yes, with percentiles |
| Observability | Is tracing built in? | Yes, correlation IDs |

## Trade-offs

### Fundamental Trade-offs

| Trade-off | Choose A When | Choose B When |
|-----------|---------------|---------------|
| Consistency vs Availability | Correctness critical | Availability critical |
| Latency vs Consistency | Fresh data required | Fast responses needed |
| Complexity vs Simplicity | Scale justifies it | Simplicity preferred |
| Sync vs Async | Strong consistency needed | Decoupling needed |

### Replication Trade-offs

| Strategy | Pros | Cons |
|----------|------|------|
| Single leader | Simple, consistent | Leader bottleneck, failover |
| Multi-leader | Write scalability | Conflict resolution |
| Leaderless | No SPOF, high availability | Complex, eventual consistency |

## Validation Checklist

- [ ] Consistency model is explicitly defined
- [ ] Availability target is documented with SLA
- [ ] All failure modes are identified and handled
- [ ] Network partitions are considered
- [ ] Latency targets are defined with percentiles
- [ ] Data replication strategy is documented
- [ ] Partitioning strategy handles hot spots
- [ ] Communication patterns match requirements
- [ ] Time and ordering are addressed
- [ ] Consensus requirements are identified
- [ ] Observability is built in (tracing, metrics)
- [ ] Testing strategy includes failure scenarios

## Common Pitfalls

1. **Ignoring network partitions**: Assuming network is reliable
2. **Clock dependency**: Relying on synchronized clocks
3. **Distributed transactions**: Overusing 2PC
4. **Ignoring latency**: Not measuring tail latency
5. **Coupling**: Synchronous dependencies causing cascades
6. **Hot spots**: Uneven data distribution
7. **Split brain**: Multiple leaders after partition
8. **Ignoring human factors**: Alert fatigue, runbook gaps

## References

- Designing Data-Intensive Applications (Kleppmann)
- Software Architecture: The Hard Parts (Ford, Parsons, Sadalage)
- Building Microservices (Newman)
- Microservices Patterns (Richardson)

## Related Capabilities

- System Design
- Database Selection
- Caching Strategy Selection
- Resilience Engineering
- Messaging Strategy
- Scalability Planning
