# Capability Index

Version: 1.0.0
Last Updated: 2026-06-28

## Overview

This index catalogs all operational capabilities derived from synthesized engineering knowledge. Each capability represents a reusable reasoning procedure for solving specific engineering problems.

**These capabilities are project-agnostic and can be applied to any software system.**

---

## Capabilities

### Architecture Review

**Description**: Systematic evaluation of software architecture against quality attributes, principles, and trade-offs.

**Topics Covered**: Architecture patterns, quality attributes, modularity, coupling, cohesion, architectural fitness, technical debt assessment

**Dependencies**: None

**Related Capabilities**: System Design, Architecture Decision Records, Technical Debt Assessment

**Knowledge Sources**: FSA, SAHP, CA, DDD

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Any software system with defined architecture

**Tags**: architecture, review, evaluation, quality-attributes

---

### Distributed Systems Design

**Description**: Design of systems spanning multiple nodes with considerations for consistency, availability, partition tolerance, latency, and failure modes.

**Topics Covered**: CAP theorem, consistency models, replication, partitioning, consensus, failure detection, recovery, time and ordering

**Dependencies**: System Design

**Related Capabilities**: Database Selection, Caching Strategy Selection, Resilience Engineering

**Knowledge Sources**: DDIA, SAHP, BM, MP

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Multi-node systems, cloud-native applications, microservices

**Tags**: distributed-systems, consistency, availability, replication

---

### Database Selection

**Description**: Selection of appropriate data storage technologies based on data characteristics, access patterns, scalability requirements, and consistency needs.

**Topics Covered**: Data models, query patterns, scalability, consistency requirements, operational considerations, polyglot persistence

**Dependencies**: System Design

**Related Capabilities**: Distributed Systems Design, Caching Strategy Selection, DDD Modeling

**Knowledge Sources**: DDIA, PEAA, DDD

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Any system requiring persistent data storage

**Tags**: databases, selection, data-storage, persistence

---

### Caching Strategy Selection

**Description**: Determination of appropriate caching patterns, technologies, and configurations for performance optimization.

**Topics Covered**: Cache patterns, invalidation strategies, cache hierarchies, consistency trade-offs, cache aside, read-through, write-through

**Dependencies**: System Design

**Related Capabilities**: Database Selection, Performance Optimization, Distributed Systems Design

**Knowledge Sources**: DDIA, RI, MP

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Systems with read-heavy workloads, high latency data sources

**Tags**: caching, performance, optimization

---

### DDD Modeling

**Description**: Application of Domain-Driven Design principles to create rich domain models that reflect business concepts and rules.

**Topics Covered**: Ubiquitous language, aggregates, entities, value objects, domain events, repositories, factories, domain services

**Dependencies**: None

**Related Capabilities**: Service Boundary Identification, Architecture Review, Strategic Design

**Knowledge Sources**: DDD

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Complex domain modeling, business-critical applications

**Tags**: ddd, domain-modeling, aggregates, ubiquitous-language

---

### Service Boundary Identification

**Description**: Identification of appropriate service boundaries using domain-driven design principles, team structure, and operational considerations.

**Topics Covered**: Bounded contexts, domain analysis, team topologies, Conway's Law, coupling analysis, service decomposition

**Dependencies**: DDD Modeling

**Related Capabilities**: Microservice Design, DDD Modeling, Organizational Design

**Knowledge Sources**: DDD, BM, MP, TT, SAHP

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Microservice architecture design, monolith decomposition, system restructuring

**Tags**: microservices, bounded-contexts, service-boundaries, ddd

---

### Microservice Design

**Description**: Design of individual microservices considering autonomy, data ownership, communication patterns, and operational requirements.

**Topics Covered**: Service autonomy, database per service, API design, inter-service communication, service discovery, configuration, observability

**Dependencies**: Service Boundary Identification

**Related Capabilities**: Distributed Systems Design, API Design, Resilience Engineering

**Knowledge Sources**: BM, MP, SAHP

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Microservice architecture implementation

**Tags**: microservices, service-design, autonomy

---

### Integration Strategy

**Description**: Selection and implementation of integration patterns for connecting systems, services, and applications.

**Topics Covered**: Integration patterns, API styles, messaging, event-driven architecture, data synchronization, saga patterns

**Dependencies**: None

**Related Capabilities**: Messaging Strategy, API Design, Microservice Design

**Knowledge Sources**: EIP, BM, MP, PEAA

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: System integration, service communication, enterprise architecture

**Tags**: integration, messaging, api, events

---

### Resilience Engineering

**Description**: Design and implementation of resilience patterns to handle failures gracefully and maintain system availability.

**Topics Covered**: Circuit breakers, bulkheads, timeouts, retries, fallbacks, chaos engineering, failure modes, recovery procedures

**Dependencies**: Distributed Systems Design

**Related Capabilities**: Deployment Planning, Incident Analysis, SRE Practices

**Knowledge Sources**: RI, BM, MP, SRE

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Production systems, distributed systems, critical services

**Tags**: resilience, circuit-breaker, failure, availability

---

### Incident Analysis

**Description**: Systematic analysis of incidents to identify root causes, contributing factors, and preventive measures.

**Topics Covered**: Blameless postmortems, root cause analysis, contributing factors, action items, incident documentation, learning culture

**Dependencies**: None

**Related Capabilities**: Resilience Engineering, SRE Practices, Organizational Design

**Knowledge Sources**: SRE, DH, ACC

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Post-incident review, operational improvement

**Tags**: incidents, postmortem, root-cause, learning

---

### DevOps Practices

**Description**: Implementation of DevOps principles and practices for continuous delivery, automation, and collaboration.

**Topics Covered**: CI/CD, automation, infrastructure as code, monitoring, feedback loops, continuous improvement

**Dependencies**: None

**Related Capabilities**: Deployment Planning, SRE Practices, Organizational Design

**Knowledge Sources**: DH, ACC, SRE

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Software delivery organizations, operations teams

**Tags**: devops, cicd, automation, delivery

---

### SRE Practices

**Description**: Implementation of Site Reliability Engineering practices for reliability, observability, and operational excellence.

**Topics Covered**: SLIs, SLOs, error budgets, toil reduction, on-call, incident management, change management

**Dependencies**: None

**Related Capabilities**: Resilience Engineering, Incident Analysis, DevOps Practices

**Knowledge Sources**: SRE, RI

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Production operations, reliability engineering

**Tags**: sre, reliability, slo, error-budgets

---

### Testing Strategy

**Description**: Design of comprehensive testing strategies including unit, integration, contract, and end-to-end testing.

**Topics Covered**: Test pyramid, test types, test coverage, mocking, contract testing, test automation, TDD

**Dependencies**: None

**Related Capabilities**: Deployment Planning, Refactoring Strategy, Architecture Review

**Knowledge Sources**: CA, BM, MP, REF

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: All software projects, quality assurance

**Tags**: testing, test-pyramid, tdd, automation

---

### Refactoring Strategy

**Description**: Planning and execution of code refactoring to improve design while preserving behavior.

**Topics Covered**: Code smells, refactoring techniques, test coverage, incremental refactoring, legacy code strategies

**Dependencies**: None

**Related Capabilities**: Technical Debt Assessment, Architecture Review, Testing Strategy

**Knowledge Sources**: REF, CA

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Code improvement, technical debt reduction, design improvement

**Tags**: refactoring, code-smells, design, legacy

---

### Technical Debt Assessment

**Description**: Systematic evaluation of technical debt including identification, prioritization, and remediation planning.

**Topics Covered**: Debt identification, impact assessment, prioritization, remediation strategies, prevention

**Dependencies**: None

**Related Capabilities**: Architecture Review, Refactoring Strategy, Legacy Modernization

**Knowledge Sources**: REF, FSA, SAHP

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Existing codebases, architecture reviews, planning

**Tags**: technical-debt, assessment, prioritization

---

### Organizational Design

**Description**: Design of team structures, communication pathways, and organizational patterns to support software delivery.

**Topics Covered**: Team topologies, Conway's Law, communication structures, platform teams, enabling teams, stream-aligned teams

**Dependencies**: None

**Related Capabilities**: Service Boundary Identification, DevOps Practices, DDD Modeling

**Knowledge Sources**: TT, DH, ACC

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Organization restructuring, team design, scaling

**Tags**: organizational, teams, conways-law, structure

---

### Scalability Planning

**Description**: Planning for system scalability considering growth patterns, bottlenecks, and scaling strategies.

**Topics Covered**: Horizontal vs vertical scaling, scaling patterns, capacity planning, performance testing, auto-scaling

**Dependencies**: System Design

**Related Capabilities**: Distributed Systems Design, Performance Optimization, Database Selection

**Knowledge Sources**: DDIA, BM, MP, RI

**Version**: 1.0.0

**Last Updated**: 2026-06-28

**Confidence**: High

**Applicability**: Growing systems, capacity planning, architecture design

**Tags**: scalability, capacity, scaling, growth

---

## Statistics

- Total Capabilities: 17
- High Confidence: 17
- Knowledge Sources Referenced: 15

---

## Usage

Each capability listed above has a corresponding detailed file in `capabilities/` with:

- Purpose
- Inputs
- Expected Outputs
- Decision Process
- Evaluation Criteria
- Trade-offs
- Validation Checklist
- Common Pitfalls
- References
- Related Capabilities

To use a capability, reference its file: `capabilities/{capability-name}.md`

---

## Adding New Capabilities

When adding new capabilities:

1. Create capability file in `capabilities/`
2. Follow the standard structure
3. Update this index
4. Update README.md
5. Update processing_statistics.json

---

## Capability Categories

| Category | Capabilities |
|----------|--------------|
| Architecture & Design | Architecture Review, Distributed Systems Design, Scalability Planning |
| Data & Storage | Database Selection, Caching Strategy Selection |
| Domain Modeling | DDD Modeling, Service Boundary Identification |
| Microservices | Microservice Design, Integration Strategy |
| Resilience & Operations | Resilience Engineering, Incident Analysis, SRE Practices |
| DevOps | DevOps Practices, Testing Strategy |
| Code Quality | Refactoring Strategy, Technical Debt Assessment |
| Organizational | Organizational Design |
