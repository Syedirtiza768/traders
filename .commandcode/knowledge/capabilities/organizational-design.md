# Organizational Design

## Purpose

Design team structures, communication pathways, and organizational patterns that support effective software delivery, aligning Conway's Law with desired architecture.

## Inputs

- Current organization structure
- Software architecture
- Team capabilities and skills
- Business domain complexity
- Scale requirements
- Cultural factors

## Expected Outputs

- Team topology design
- Communication patterns
- Interaction modes
- Team boundaries
- Platform and enabling team structure
- Evolution plan

## Decision Process

### 1. Conway's Law Application

**Law**: "Organizations which design systems are constrained to produce designs which are copies of the communication structures of these organizations."

**Implications**:
- Team structure shapes architecture
- Architecture should match team structure
- Change team structure to change architecture
- Align teams with bounded contexts

**Reverse Conway Maneuver**:
- Design team structure to produce desired architecture
- Organize teams around business capabilities
- Let architecture emerge from team boundaries

### 2. Team Topologies

**Stream-Aligned Teams**
- End-to-end delivery of value stream
- Full-stack capability
- Close to customers
- Minimal handoffs

Characteristics:
- Long-lived
- Cross-functional
- Autonomous
- Aligned to business domain

**Platform Teams**
- Provide internal platform services
- Enable stream-aligned teams
- Reduce cognitive load
- Self-service capabilities

Platform offerings:
- Deployment pipelines
- Monitoring and observability
- Data platforms
- Authentication services
- Infrastructure templates

**Enabling Teams**
- Help stream-aligned teams overcome obstacles
- Provide expertise and guidance
- Bridge capability gaps
- Spread knowledge

Focus areas:
- Architecture guidance
- Technology adoption
- Best practices
- Training

**Complicated-Subsystem Teams**
- Own complex subsystems
- Specialized expertise required
- Reduce cognitive load for others
- Provide clear interfaces

Examples:
- Machine learning platform
- Search engine
- Payment processing
- Data pipeline

### 3. Interaction Modes

**Collaboration**
- Teams work together
- Shared responsibility
- High communication
- Discovery and learning

When to use:
- New domain exploration
- Service boundary definition
- Platform team initial work
- Knowledge transfer

**X-as-a-Service**
- Team provides service
- Clear interface
- Minimal collaboration needed
- Self-service

When to use:
- Mature platform services
- Well-defined APIs
- Stable requirements
- Scaling platform adoption

**Facilitating**
- Enabling team helps others
- Coaching and mentoring
- Temporary engagement
- Capability building

When to use:
- New technology adoption
- Skill development
- Process improvement
- Organizational change

### 4. Team Design Principles

**Team Size**
- Dunbar's number: 5-8 for close collaboration
- Two-pizza rule: Team fed by two pizzas
- Minimum: 5 (bus factor, perspectives)
- Maximum: 9 (communication overhead)

**Team Longevity**
- Long-lived teams outperform temporary teams
- Build shared understanding over time
- Trust develops with time
- Knowledge accumulates

**Team Autonomy**
- Clear boundaries
- Decision-making authority
- Minimal dependencies
- End-to-end ownership

**Cognitive Load**
- Limit scope to what team can handle
- Don't overload with too many domains
- Consider team maturity
- Balance breadth and depth

### 5. Team Boundary Definition

**By Business Capability**
- Align with domain
- Customer-facing value
- Independent delivery
- Example: Order management team

**By Bounded Context**
- DDD bounded context
- Clear model boundaries
- Independent evolution
- Example: Inventory context team

**By User Journey**
- Cross-cutting capability
- User experience focus
- Example: Checkout flow team

**By Data**
- Data ownership
- Data quality responsibility
- Example: Customer data team

### 6. Dependency Management

**Minimize Dependencies**
- Team can work independently
- Few handoffs
- Clear interfaces
- Self-service capabilities

**Dependency Types**

| Type | Impact | Mitigation |
|------|--------|------------|
| Technical | Blocks delivery | API contracts, platform |
| Business | Coordination needed | Shared goals, alignment |
| Knowledge | Skill gaps | Enabling teams, training |
| Tooling | Shared infrastructure | Platform teams |

**Dependency Visualization**
- Team dependency maps
- Communication frequency
- Handoff points
- Bottleneck identification

### 7. Communication Architecture

**Communication Channels**
- Synchronous: Meetings, calls
- Asynchronous: Chat, email, documentation
- Pull: Wikis, documentation
- Push: Notifications, broadcasts

**Communication Frequency**
- Daily: Standups, syncs
- Weekly: Planning, reviews
- Monthly: Retrospectives, strategy
- As needed: Incidents, decisions

**Communication Patterns**
- Within team: High bandwidth, frequent
- Between teams: Interface-based, minimal
- Cross-cutting: Communities of practice
- Leadership: Strategic, periodic

### 8. Organizational Evolution

**Evolution Triggers**
- Scale changes
- Architecture changes
- Business changes
- Capability changes

**Evolution Patterns**
- Split teams when too large
- Merge teams when too small
- Create platform teams when needed
- Add enabling teams for capability gaps

**Evolution Process**
1. Identify need for change
2. Design new structure
3. Communicate change
4. Implement gradually
5. Monitor and adjust

### 9. Team Health Assessment

**Team Health Indicators**
- Delivery velocity
- Quality metrics
- Team satisfaction
- Cognitive load
- Dependency friction

**Assessment Questions**
- Can team deliver independently?
- Does team have necessary skills?
- Is cognitive load manageable?
- Are dependencies minimal?
- Is team aligned with business?

## Evaluation Criteria

### Organizational Alignment

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Team boundaries | Misaligned with architecture | Partially aligned | Aligned with bounded contexts |
| Autonomy | High dependency | Some autonomy | Full autonomy within bounds |
| Cognitive load | Overloaded | Manageable | Appropriate |
| Communication | Ad-hoc | Structured | Intentional |
| Platform support | None | Some | Comprehensive |

### Team Topology Fit

| Question | Good Fit | Poor Fit |
|----------|----------|----------|
| Can teams deliver independently? | Yes | No |
| Are handoffs minimal? | Yes | No |
| Is cognitive load appropriate? | Yes | No |
| Are dependencies clear? | Yes | No |
| Is architecture aligned? | Yes | No |

## Trade-offs

### Team Autonomy vs Alignment

| Priority | Pros | Cons |
|----------|------|------|
| High autonomy | Fast delivery, innovation | Duplication, inconsistency |
| High alignment | Consistency, efficiency | Slower, less innovation |

**Guidance**: Autonomy within guardrails

### Specialization vs Generalization

| Approach | Pros | Cons |
|----------|------|------|
| Specialized teams | Deep expertise | Handoffs, dependencies |
| Generalized teams | End-to-end delivery | Shallow expertise |

**Guidance**: Stream-aligned with enabling teams for expertise

### Platform Investment

| Investment | Short-term | Long-term |
|------------|------------|-----------|
| Minimal | Fast start | High friction |
| Moderate | Balanced | Balanced |
| Extensive | Slow start | Low friction |

**Guidance**: Start minimal, invest based on adoption

## Validation Checklist

- [ ] Team boundaries align with architecture
- [ ] Conway's Law is leveraged intentionally
- [ ] Team sizes are appropriate (5-9 people)
- [ ] Teams are long-lived, not project-based
- [ ] Cognitive load is manageable
- [ ] Dependencies are minimized
- [ ] Interaction modes are clear
- [ ] Platform teams enable stream-aligned teams
- [ ] Enabling teams bridge capability gaps
- [ ] Communication patterns are intentional
- [ ] Evolution path is planned

## Common Pitfalls

1. **Project teams**: Temporary teams don't build knowledge
2. **Siloed teams**: Teams aligned by function, not value
3. **Too many dependencies**: Teams can't deliver independently
4. **Cognitive overload**: Teams responsible for too much
5. **Ignoring Conway's Law**: Architecture doesn't match teams
6. **No platform investment**: Stream teams reinvent infrastructure
7. **Wrong team size**: Too large or too small
8. **Unclear boundaries**: Overlapping responsibilities

## References

- Team Topologies (Skelton, Pais)
- The DevOps Handbook (Kim, Humble, Debois, Willis)
- Accelerate (Forsgren, Humble, Kim)
- Domain-Driven Design (Evans)

## Related Capabilities

- Service Boundary Identification
- DDD Modeling
- DevOps Practices
- Architecture Review
