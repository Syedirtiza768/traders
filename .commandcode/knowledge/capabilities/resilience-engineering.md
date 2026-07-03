# Resilience Engineering

## Purpose

Design and implement resilience patterns that enable systems to handle failures gracefully, maintain availability, and recover quickly from adverse conditions.

## Inputs

- Availability requirements (SLA targets)
- Failure scenarios and probabilities
- Dependency analysis
- Performance requirements
- Operational constraints
- Budget constraints

## Expected Outputs

- Resilience pattern implementation
- Failure mode documentation
- Circuit breaker configurations
- Timeout and retry policies
- Fallback strategies
- Chaos engineering plan
- Incident response procedures

## Decision Process

### 1. Failure Mode Analysis

**Identify Failure Types**

| Failure Type | Description | Detection |
|--------------|-------------|-----------|
| Crash failure | Process stops | Health check, heartbeat |
| Omission failure | No response | Timeout |
| Timing failure | Slow response | Latency monitoring |
| Byzantine failure | Arbitrary behavior | Consensus, validation |

**Dependency Failure Analysis**

For each dependency:
- What happens if it's unavailable?
- What happens if it's slow?
- What happens if it returns errors?
- What happens if it returns incorrect data?

**Failure Probability Assessment**
- Hardware failures (disk, memory, network)
- Software failures (bugs, resource leaks)
- Network failures (partitions, latency spikes)
- Load-induced failures (overload, throttling)
- Human errors (misconfiguration, bad deployments)

### 2. Resilience Pattern Selection

**Circuit Breaker**

Purpose: Prevent cascading failures by failing fast when dependency is unhealthy

States:
- Closed: Normal operation, requests flow
- Open: Failing fast, requests rejected
- Half-Open: Testing if dependency recovered

Configuration:
- Failure threshold (number or percentage)
- Timeout duration
- Half-open retry count

When to use:
- External dependencies
- Network calls
- Services with known instability

**Bulkhead**

Purpose: Isolate failures to prevent total system failure

Types:
- Process isolation (separate processes)
- Thread pool isolation
- Connection pool isolation

When to use:
- Critical vs non-critical operations
- Different priority workloads
- Noisy neighbor prevention

**Timeout**

Purpose: Bound wait time, prevent resource exhaustion

Types:
- Connection timeout
- Read timeout
- Write timeout

Configuration:
- Based on P99 latency + buffer
- Consider retry budget
- Different timeouts for different operations

**Retry**

Purpose: Handle transient failures

Patterns:
- Fixed interval
- Exponential backoff
- Jitter (randomization)
- Circuit breaker integration

Configuration:
- Max retries
- Backoff parameters
- Retryable errors
- Idempotency requirement

**Fallback**

Purpose: Provide degraded but functional behavior

Types:
- Cached data
- Default value
- Alternative service
- Queue for later processing
- Graceful degradation

When to use:
- Non-critical functionality
- Read operations
- User experience preservation

**Rate Limiting**

Purpose: Protect system from overload

Types:
- Token bucket
- Sliding window
- Fixed window

Configuration:
- Rate limits per client
- Rate limits per operation
- Throttling response (reject vs queue)

### 3. Pattern Implementation

**Circuit Breaker Configuration**

```
Circuit Breaker: PaymentService
├── Failure threshold: 5 failures in 10 seconds
├── Open duration: 30 seconds
├── Half-open requests: 3
├── Timeout: 2 seconds
└── Fallback: Queue payment for retry
```

**Retry Configuration**

```
Retry: DatabaseWrite
├── Max retries: 3
├── Backoff: Exponential
├── Initial delay: 100ms
├── Max delay: 5s
├── Jitter: 20%
└── Retryable errors: ConnectionError, Timeout
```

**Bulkhead Configuration**

```
Bulkhead: ExternalAPI
├── Type: Thread pool
├── Max concurrent: 10
├── Queue size: 20
└── Rejection: Caller runs fallback
```

### 4. Chaos Engineering

**Principles**:
- Run experiments in production
- Start small, increase blast radius
- Automate experiments
- Define steady state
- Minimize blast radius

**Experiment Types**:
- Terminate instances
- Inject latency
- Inject failures
- Consume resources
- Network partitions

**Chaos Monkey Example**:
- Random instance termination during business hours
- Validates auto-scaling and recovery
- Start with non-critical services

### 5. Observability for Resilience

**Metrics**:
- Error rates (per service, per endpoint)
- Latency percentiles (P50, P95, P99)
- Circuit breaker state transitions
- Retry counts
- Bulkhead queue depths
- Rate limit rejections

**Alerting**:
- Error rate threshold
- Latency threshold
- Circuit breaker open
- Bulkhead at capacity
- Retry exhaustion

**Tracing**:
- Request correlation IDs
- Distributed tracing
- Error attribution
- Latency breakdown

### 6. Incident Response

**Detection**:
- Automated alerting
- Anomaly detection
- User reports
- Monitoring dashboards

**Response**:
- Acknowledge incident
- Assess severity
- Communicate status
- Mitigate impact
- Investigate root cause
- Document learnings

**Recovery**:
- Rollback if deployment-related
- Scale if capacity-related
- Isolate if dependency-related
- Failover if infrastructure-related

## Evaluation Criteria

### Resilience Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Failure detection | Manual, slow | Automated, minutes | Automated, seconds |
| Failure isolation | Cascading failures | Some isolation | Complete isolation |
| Recovery time | Hours | Minutes | Seconds |
| Degradation | Hard failure | Partial degradation | Graceful degradation |
| Testing | None | Some failure testing | Regular chaos engineering |

### Availability Calculation

Availability = MTBF / (MTBF + MTTR)

Where:
- MTBF = Mean Time Between Failures
- MTTR = Mean Time To Recovery

Target availability:
- 99% (two nines): 3.65 days downtime/year
- 99.9% (three nines): 8.76 hours downtime/year
- 99.99% (four nines): 52.6 minutes downtime/year
- 99.999% (five nines): 5.26 minutes downtime/year

## Trade-offs

### Consistency vs Availability

| Priority | Approach | Trade-off |
|----------|----------|-----------|
| Strong consistency | Reject writes during partition | Lower availability |
| High availability | Accept writes, reconcile later | Consistency gaps |

### Resilience vs Complexity

| Approach | Pros | Cons |
|----------|------|------|
| Minimal patterns | Simple | Fragile |
| All patterns | Resilient | Complex, hard to debug |

**Guidance**: Apply patterns where failures are likely and impactful

### Cost vs Resilience

| Investment | Resilience Level |
|------------|------------------|
| Single instance | Low |
| Multi-instance | Medium |
| Multi-zone | High |
| Multi-region | Very high |

## Validation Checklist

- [ ] All failure modes are identified
- [ ] Circuit breakers protect external dependencies
- [ ] Timeouts are configured for all network calls
- [ ] Retries use exponential backoff with jitter
- [ ] Bulkheads isolate critical operations
- [ ] Fallbacks provide graceful degradation
- [ ] Rate limiting prevents overload
- [ ] Chaos experiments are run regularly
- [ ] Monitoring covers resilience metrics
- [ ] Alerting triggers on resilience events
- [ ] Incident response procedures exist
- [ ] Recovery procedures are tested

## Common Pitfalls

1. **Retry storms**: Retries causing cascading load
2. **Timeout too long**: Resources exhausted waiting
3. **Timeout too short**: Premature failures
4. **No fallback**: Hard failure instead of degradation
5. **Cascading circuit breaks**: One failure triggers many
6. **Testing only happy path**: Not testing failure scenarios
7. **Ignoring backpressure**: Not propagating load signals
8. **Over-engineering**: Patterns where not needed

## References

- Release It! (Nygard)
- Building Microservices (Newman)
- Site Reliability Engineering (Google)
- Microservices Patterns (Richardson)

## Related Capabilities

- Distributed Systems Design
- Incident Analysis
- Deployment Planning
- SRE Practices
- Performance Optimization
