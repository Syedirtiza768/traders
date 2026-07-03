# Database Selection

## Purpose

Select appropriate data storage technologies based on data characteristics, access patterns, scalability requirements, consistency needs, and operational constraints.

## Inputs

- Data model requirements
- Query patterns (read/write ratio, query complexity)
- Scale requirements (data volume, request rate)
- Consistency requirements
- Latency requirements
- Durability requirements
- Operational constraints (team expertise, budget)
- Integration requirements

## Expected Outputs

- Database technology selection with rationale
- Schema design recommendations
- Scaling strategy
- Consistency configuration
- Backup and recovery strategy
- Migration considerations

## Decision Process

### 1. Data Model Analysis

**Structure**
- Relational (structured, fixed schema)
- Document (semi-structured, flexible schema)
- Key-value (simple, schemaless)
- Graph (connected data, relationships)
- Time-series (temporal data, metrics)
- Column-family (wide, sparse data)

**Relationships**
- One-to-one: Any database
- One-to-many: Relational, Document
- Many-to-many: Relational, Graph
- Hierarchical: Document, Graph
- Network: Graph

**Schema Requirements**
- Fixed schema → Relational
- Evolving schema → Document
- Schemaless → Key-value
- Complex relationships → Graph

### 2. Access Pattern Analysis

**Read Patterns**
- Point reads (single item by key)
- Range queries
- Full-text search
- Aggregations
- Joins
- Graph traversals

**Write Patterns**
- Insert-heavy
- Update-heavy
- Delete patterns
- Batch writes
- Transactional writes

**Read/Write Ratio**
- Read-heavy: Optimize for reads (caching, replicas)
- Write-heavy: Optimize for writes (append-only, partitioning)
- Balanced: General-purpose database

### 3. Consistency Requirements

| Requirement | Database Type | Examples |
|-------------|---------------|----------|
| Strong consistency | ACID relational | PostgreSQL, MySQL, Oracle |
| Eventual consistency | NoSQL | Cassandra, DynamoDB, Riak |
| Tunable consistency | Wide-column | Cassandra, Cosmos DB |
| Session consistency | Document | MongoDB |
| Distributed transactions | NewSQL | CockroachDB, TiDB |

**ACID vs BASE**

| ACID | BASE |
|------|------|
| Atomicity | Basically Available |
| Consistency | Soft state |
| Isolation | Eventually consistent |
| Durability | |

Choose ACID when:
- Financial transactions
- Inventory management
- Correctness is critical
- Regulatory compliance

Choose BASE when:
- High availability required
- Large scale
- Temporary inconsistency acceptable
- Geographic distribution

### 4. Scale Requirements

**Vertical Scaling (Scale Up)**
- Add more resources to single node
- Simpler
- Limited by hardware
- Expensive at scale

**Horizontal Scaling (Scale Out)**
- Add more nodes
- More complex
- Nearly unlimited scale
- Cost-effective at scale

**Scaling Patterns**

| Database Type | Scaling Approach |
|---------------|------------------|
| Relational | Read replicas, sharding (complex) |
| Document | Built-in sharding |
| Key-value | Consistent hashing |
| Graph | Sharding (complex), multi-model |

**Sharding Considerations**
- Sharding key selection
- Rebalancing strategy
- Cross-shard queries
- Transaction support

### 5. Latency Requirements

**Latency Targets**
- < 10ms: In-memory cache
- < 50ms: Local database
- < 100ms: Regional database
- < 500ms: Global database

**Optimization Strategies**
- Indexing
- Denormalization
- Caching layer
- Read replicas
- Geographic distribution

### 6. Operational Considerations

**Team Expertise**
- Familiarity with technology
- Operational experience
- Hiring market

**Managed vs Self-hosted**
- Managed: Less ops, higher cost
- Self-hosted: More control, more ops

**Ecosystem**
- Tooling availability
- Community support
- Third-party integrations

**Backup and Recovery**
- Backup mechanisms
- Point-in-time recovery
- Disaster recovery

### 7. Database Type Selection Matrix

| Use Case | Primary | Alternatives |
|----------|---------|--------------|
| Transactional business apps | PostgreSQL, MySQL | CockroachDB, TiDB |
| Content management | MongoDB, PostgreSQL | CouchDB |
| Session storage | Redis, Memcached | DynamoDB |
| User profiles | MongoDB, PostgreSQL | Cassandra |
| Social graph | Neo4j | ArangoDB |
| Time-series metrics | InfluxDB, TimescaleDB | Prometheus |
| Product catalog | MongoDB, Elasticsearch | PostgreSQL |
| Shopping cart | Redis, PostgreSQL | DynamoDB |
| Audit logs | Elasticsearch, Cassandra | PostgreSQL |
| Full-text search | Elasticsearch | PostgreSQL (FTS), Solr |
| Real-time analytics | ClickHouse, Druid | TimescaleDB |

## Evaluation Criteria

### Decision Matrix

Score each database option (1-5) for each criterion:

| Criterion | Weight | DB Option A | DB Option B |
|-----------|--------|-------------|-------------|
| Data model fit | 20% | | |
| Query support | 15% | | |
| Consistency | 15% | | |
| Scalability | 15% | | |
| Performance | 10% | | |
| Operational | 10% | | |
| Team expertise | 10% | | |
| Cost | 5% | | |

### Polyglot Persistence

Consider multiple databases when:
- Different data types (e.g., transactions + search)
- Different access patterns (e.g., cache + persistent)
- Different consistency requirements

Common combinations:
- PostgreSQL + Redis (transactional + cache)
- MongoDB + Elasticsearch (document + search)
- PostgreSQL + Neo4j (relational + graph)
- Cassandra + Elasticsearch (wide-column + search)

## Trade-offs

### SQL vs NoSQL

| Aspect | SQL | NoSQL |
|--------|-----|-------|
| Schema | Fixed, defined upfront | Flexible, evolving |
| Queries | Complex joins, ad-hoc | Simple, key-based |
| Scaling | Vertical, complex sharding | Horizontal, built-in |
| Consistency | Strong (ACID) | Tunable (BASE) |
| Maturity | High | Varies |
| Transactions | Full ACID | Limited |

### Consistency vs Availability

| Priority | Database Type | Examples |
|----------|---------------|----------|
| Strong consistency | RDBMS, NewSQL | PostgreSQL, CockroachDB |
| High availability | Dynamo-style | Cassandra, DynamoDB |
| Balanced | Document DBs | MongoDB |

## Validation Checklist

- [ ] Data model matches database type
- [ ] Query patterns are supported
- [ ] Consistency requirements are met
- [ ] Scale requirements can be achieved
- [ ] Latency targets are achievable
- [ ] Team can operate the technology
- [ ] Backup and recovery strategy exists
- [ ] Migration path is defined
- [ ] Cost is within budget
- [ ] Monitoring and observability planned

## Common Pitfalls

1. **Defaulting to familiar**: Using known database regardless of fit
2. **Over-engineering**: Choosing distributed DB for single-node needs
3. **Ignoring operations**: Underestimating operational complexity
4. **Premature optimization**: Optimizing for scale not yet needed
5. **Ignoring consistency**: Not understanding consistency guarantees
6. **Vendor lock-in**: Not planning for portability
7. **Schema rigidity**: Not planning for evolution
8. **Ignoring access patterns**: Designing schema without query patterns

## References

- Designing Data-Intensive Applications (Kleppmann)
- Patterns of Enterprise Application Architecture (Fowler)
- Domain-Driven Design (Evans)

## Related Capabilities

- System Design
- Distributed Systems Design
- Caching Strategy Selection
- DDD Modeling
- Scalability Planning
