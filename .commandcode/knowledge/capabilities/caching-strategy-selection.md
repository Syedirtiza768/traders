# Caching Strategy Selection

## Purpose

Determine appropriate caching patterns, technologies, and configurations to optimize system performance while managing consistency and complexity.

## Inputs

- Access patterns (read/write ratio)
- Data characteristics (size, volatility)
- Latency requirements
- Consistency requirements
- Scale requirements
- Budget constraints

## Expected Outputs

- Caching architecture
- Cache technology selection
- Invalidation strategy
- Cache configuration
- Monitoring strategy

## Decision Process

### 1. Cache Need Assessment

**Cache Candidates**

| Data Characteristic | Cache? | Reason |
|---------------------|--------|--------|
| Read-heavy | Yes | Reduces load |
| Write-heavy | No | Cache overhead |
| Small, static | Yes | Fast wins |
| Large, dynamic | Maybe | Complexity trade-off |
| Frequently accessed | Yes | High hit rate |
| Rarely accessed | No | Low hit rate |

**Cache Worthiness Formula**:
```
Cache Value = (Read Frequency × Latency Improvement) - (Complexity + Consistency Cost)
```

**Decision Tree**:
```
Should I cache this data?
├── Read/write ratio > 10:1?
│   ├── YES → Strong cache candidate
│   └── NO → Evaluate further
│
├── Data size < 100KB?
│   ├── YES → Good cache candidate
│   └── NO → Consider carefully
│
├── Data changes < 1/hour?
│   ├── YES → Good cache candidate
│   └── NO → Complex invalidation needed
│
└── Latency requirement < 100ms?
    ├── YES → Cache likely needed
    └── NO → Evaluate cost/benefit
```

### 2. Cache Location

**Cache Locations**

| Location | Description | Latency | Consistency |
|----------|-------------|---------|-------------|
| Client-side | Browser, mobile app | Lowest | Weakest |
| CDN | Edge cache | Low | Weak |
| Application | In-process cache | Low | Medium |
| Distributed cache | Redis, Memcached | Medium | Strong |
| Database | Query cache | Higher | Strongest |

**Location Decision Matrix**:

| Requirement | Location |
|-------------|----------|
| Lowest latency | Client-side, CDN |
| Strong consistency | Database cache |
| Shared across instances | Distributed cache |
| Simple implementation | Application cache |
| Global distribution | CDN |

### 3. Cache Patterns

**Cache-Aside (Lazy Loading)**

```
Read:
1. Check cache
2. If miss, read from database
3. Write to cache
4. Return data

Write:
1. Write to database
2. Invalidate cache
```

Pros:
- Simple
- Cache only what's needed
- Resilient to cache failure

Cons:
- Cache miss penalty
- Stale data possible
- Write complexity

**Read-Through**

```
Read:
1. Check cache
2. Cache reads from database on miss
3. Return data

Write:
1. Write to database
2. Invalidate cache
```

Pros:
- Simplifies application code
- Consistent read path

Cons:
- Cache provider complexity
- Cache miss penalty

**Write-Through**

```
Write:
1. Write to cache
2. Cache writes to database
3. Return success

Read:
1. Read from cache (always fresh)
```

Pros:
- Data always fresh
- Read performance

Cons:
- Write latency
- Cache failure = data loss

**Write-Behind (Write-Back)**

```
Write:
1. Write to cache
2. Return success
3. Async write to database
```

Pros:
- Fast writes
- Batch writes possible

Cons:
- Data loss risk
- Complexity

**Refresh-Ahead**

```
Background:
1. Refresh cache before expiration
2. Users never wait for refresh
```

Pros:
- No cache miss latency
- Predictable performance

Cons:
- Complexity
- Over-refreshing

### 4. Invalidation Strategies

**Time-Based Expiration (TTL)**

```
Configuration:
├── TTL: Based on data volatility
├── Short TTL: Frequently changing data
└── Long TTL: Rarely changing data
```

Pros:
- Simple
- Eventual consistency

Cons:
- Stale data until TTL expires
- Cache misses after expiration

**Event-Based Invalidation**

```
Write:
1. Write to database
2. Publish invalidation event
3. Consumers invalidate cache
```

Pros:
- Near real-time consistency
- Efficient

Cons:
- Complexity
- Event reliability

**Version-Based Invalidation**

```
Read:
1. Get data version
2. Check if cache version matches
3. If different, refresh cache
```

Pros:
- Strong consistency
- No stale data

Cons:
- Version tracking overhead

**Invalidation Decision Matrix**:

| Data Type | Strategy | TTL |
|-----------|----------|-----|
| User sessions | TTL | 30 min |
| Product catalog | Event-based | N/A |
| Configuration | Event-based | N/A |
| Analytics | TTL | 5 min |
| Static content | TTL | 24 hours |

### 5. Cache Technology Selection

**In-Memory Caches**

| Technology | Use Case | Features |
|------------|----------|----------|
| Redis | General purpose | Persistence, pub/sub, data structures |
| Memcached | Simple key-value | Simple, fast, no persistence |
| Caffeine | Java in-process | High performance, eviction |
| Guava Cache | Java in-process | Simple, integrated |

**CDN Caches**

| Provider | Use Case | Features |
|----------|----------|----------|
| CloudFront | AWS | Global, S3 integration |
| Cloudflare | General | DDoS protection, edge compute |
| Fastly | Real-time | Instant purge, edge compute |
| Akamai | Enterprise | Global scale, security |

**Database Caches**

| Database | Cache Type | Features |
|----------|------------|----------|
| PostgreSQL | Query cache | Built-in |
| MySQL | Query cache | Built-in (removed in 8.0) |
| MongoDB | WiredTiger cache | Built-in |

**Selection Decision Tree**:
```
What type of cache?
├── Distributed cache needed?
│   ├── YES → Redis (features) or Memcached (simple)
│   └── NO → In-process cache
│
├── Global distribution needed?
│   ├── YES → CDN + Redis
│   └── NO → Redis or in-process
│
└── Persistence needed?
    ├── YES → Redis
    └── NO → Memcached or in-process
```

### 6. Cache Configuration

**Memory Management**

```
Configuration:
├── Max memory: Based on available RAM
├── Eviction policy:
│   ├── LRU (Least Recently Used) - default
│   ├── LFU (Least Frequently Used)
│   ├── FIFO (First In First Out)
│   └── TTL-based
└── Memory fragmentation handling
```

**Eviction Policies**

| Policy | Best For | Trade-offs |
|--------|----------|------------|
| LRU | General purpose | Simple, effective |
| LFU | Hot spots | Better for skewed access |
| TTL | Time-sensitive data | Predictable expiration |
| Random | Uniform access | Simple |

**Key Design**

```
Key Structure: {namespace}:{entity}:{id}:{version}

Examples:
├── user:profile:123
├── product:detail:456:v2
├── order:summary:789
└── config:app:theme
```

**Serialization**

| Format | Pros | Cons |
|--------|------|------|
| JSON | Readable, debuggable | Larger |
| Protobuf | Compact, fast | Schema required |
| MessagePack | Compact | Less common |
| Binary | Smallest | Not readable |

### 7. Cache Hierarchy

**Multi-Level Caching**

```
L1: In-process cache (Caffeine)
├── Latency: < 1ms
├── Size: Limited by process memory
└── Consistency: Per-instance

L2: Distributed cache (Redis)
├── Latency: 1-5ms
├── Size: Larger, shared
└── Consistency: Strong

L3: CDN cache
├── Latency: 10-50ms
├── Size: Global
└── Consistency: Eventual
```

**Hierarchy Strategy**:
- Check L1 first
- On miss, check L2
- On miss, check L3
- On miss, fetch from source
- Populate all levels

### 8. Monitoring and Observability

**Key Metrics**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Hit rate | % requests served from cache | < 80% |
| Latency | Cache response time | > 5ms (P99) |
| Memory usage | % of max memory | > 85% |
| Evictions | Keys evicted per second | Increasing trend |
| Connections | Active connections | Near limit |

**Monitoring Dashboard**:
```
Cache Health:
├── Hit rate: 95%
├── Miss rate: 5%
├── Latency P50: 1ms
├── Latency P99: 3ms
├── Memory: 70%
├── Evictions: 100/s
└── Connections: 50/100
```

### 9. Cache Anti-Patterns

**Common Anti-Patterns**

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Cache everything | Memory waste, complexity | Cache strategically |
| No TTL | Memory leak | Always set TTL |
| Thundering herd | Cache miss storm | Locking, refresh-ahead |
| Cache stampede | Many misses simultaneously | Probabilistic expiration |
| Large objects | Memory fragmentation | Chunk large data |
| Hot keys | Single key overload | Shard hot keys |

**Thundering Herd Prevention**:
```
On cache miss:
1. Acquire lock (per key)
2. Double-check cache
3. If still miss, fetch data
4. Populate cache
5. Release lock
```

## Evaluation Criteria

### Cache Effectiveness Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Hit rate | < 50% | 70-80% | > 90% |
| Latency | > 10ms | 5-10ms | < 5ms |
| Consistency | Stale data | Eventual | Near real-time |
| Memory efficiency | Evicting frequently | Stable | Optimized |

## Trade-offs

### Consistency vs Performance

| Priority | Strategy | Trade-off |
|----------|----------|-----------|
| Strong consistency | No cache or write-through | Lower performance |
| Eventual consistency | TTL-based | Better performance |
| Best effort | Cache-aside | Balance |

### Memory vs Hit Rate

| Memory | Hit Rate | Cost |
|--------|----------|------|
| Small | Lower | Lower |
| Large | Higher | Higher |

**Guidance**: Size for 80-90% hit rate, monitor and adjust

### Complexity vs Control

| Approach | Complexity | Control |
|----------|------------|---------|
| Simple TTL | Low | Low |
| Event-based | Medium | High |
| Multi-level | High | High |

## Validation Checklist

- [ ] Cache candidates are identified
- [ ] Cache location is appropriate
- [ ] Cache pattern matches use case
- [ ] Invalidation strategy is defined
- [ ] Technology is selected
- [ ] Configuration is optimized
- [ ] Eviction policy is appropriate
- [ ] Key design is consistent
- [ ] Monitoring is in place
- [ ] Anti-patterns are avoided

## Common Pitfalls

1. **Caching everything**: Not all data benefits from caching
2. **No TTL**: Memory leaks, stale data
3. **Ignoring consistency**: Serving stale data
4. **Cache stampede**: Thundering herd on expiration
5. **Hot keys**: Single key overload
6. **Large objects**: Memory fragmentation
7. **No monitoring**: Flying blind
8. **Over-engineering**: Complex caching for simple needs

## References

- Designing Data-Intensive Applications (Kleppmann)
- Release It! (Nygard)
- Building Microservices (Newman)

## Related Capabilities

- Database Selection
- Performance Optimization
- Distributed Systems Design
- Resilience Engineering
