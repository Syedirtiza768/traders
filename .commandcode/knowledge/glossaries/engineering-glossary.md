# Engineering Glossary

Version: 1.0.0
Last Updated: 2026-06-28

This glossary provides definitions for key engineering concepts, patterns, and terminology used across the knowledge base.

---

## A

**ACID**
Atomicity, Consistency, Isolation, Durability - properties guaranteeing reliable transaction processing.

**Aggregate (DDD)**
A cluster of domain objects treated as a single unit for data changes, with an aggregate root controlling access.

**Anti-Corruption Layer**
A pattern that translates between different bounded contexts, protecting a model from external concepts.

**API Composition**
A pattern for querying data across multiple services by calling each service and aggregating results.

**Architecture Decision Record (ADR)**
A document capturing a significant architectural decision, including context, decision, and consequences.

**Asynchronous Communication**
Communication where the sender doesn't wait for a response, enabling decoupling and resilience.

**Availability**
The proportion of time a system is operational and accessible, typically expressed as a percentage (e.g., 99.9%).

---

## B

**BASE**
Basically Available, Soft state, Eventually consistent - an alternative to ACID for distributed systems.

**Bounded Context (DDD)**
A boundary within which a particular domain model applies, with its own ubiquitous language.

**Blue-Green Deployment**
A deployment strategy using two identical environments, switching traffic between them for zero-downtime deployments.

**Bulkhead**
A resilience pattern that isolates components to prevent failures from cascading.

**Burn Rate**
The rate at which error budget is consumed, used for alerting on SLO violations.

---

## C

**Caching**
Storing frequently accessed data in fast-access storage to improve performance.

**Canary Deployment**
Gradually shifting traffic to a new version, limiting blast radius of potential issues.

**CAP Theorem**
States that a distributed system can only guarantee two of three properties: Consistency, Availability, Partition tolerance.

**Circuit Breaker**
A resilience pattern that fails fast when a dependency is unhealthy, preventing cascading failures.

**Cohesion**
The degree to which elements of a module belong together; high cohesion is desirable.

**Command Query Responsibility Segregation (CQRS)**
Separating read and write models for optimized performance and scalability.

**Consistency**
Guarantee that all nodes see the same data at the same time (strong) or eventually (eventual).

**Conway's Law**
Organizations design systems that mirror their communication structures.

**Coupling**
The degree of interdependence between modules; low coupling is desirable.

---

## D

**Data Lake**
A centralized repository storing raw data in its native format.

**Data Warehouse**
A centralized repository storing structured data optimized for analytics.

**Database per Service**
A pattern where each microservice has its own private database.

**Dependency Injection**
A technique where dependencies are provided rather than created, enabling loose coupling.

**Distributed System**
A system where components on networked computers communicate and coordinate actions by passing messages.

**Domain Event**
Something that happened in the domain that domain experts care about.

**Domain-Driven Design (DDD)**
An approach to software development focusing on the domain model and collaboration with domain experts.

---

## E

**Entity (DDD)**
An object defined by its identity rather than its attributes.

**Error Budget**
The allowable amount of unreliability, calculated as (1 - SLO target).

**Event Sourcing**
Storing state changes as a sequence of events rather than current state.

**Eventual Consistency**
A consistency model where updates propagate asynchronously, guaranteeing convergence.

---

## F

**Fallback**
A resilience pattern providing degraded functionality when the primary path fails.

**Feature Flag**
A mechanism to enable/disable features without code deployment.

**Fitness Function**
An objective function used to evaluate how close a given design is to achieving the architect's aims.

**Four Golden Signals**
Latency, Traffic, Errors, Saturation - key metrics for monitoring systems.

---

## G

**Graceful Degradation**
Providing reduced functionality when components fail, rather than complete failure.

---

## H

**Health Check**
An endpoint or mechanism to determine if a service is operational.

**Horizontal Scaling**
Adding more instances to handle increased load.

---

## I

**Idempotency**
An operation that produces the same result when executed multiple times.

**Incident**
An unplanned interruption or reduction in quality of a service.

**Infrastructure as Code (IaC)**
Managing infrastructure through code rather than manual processes.

**Integration Pattern**
A pattern for connecting systems, services, or applications.

---

## L

**Latency**
The time taken to complete an operation, typically measured in milliseconds.

**Lead Time**
The time from commit to running in production.

**Linearizability**
A strong consistency model where operations appear to occur instantaneously.

---

## M

**Microservices**
An architectural style structuring an application as a collection of loosely coupled services.

**Monolith**
An application deployed as a single unit, typically with a single codebase.

**MTBF (Mean Time Between Failures)**
Average time between system failures.

**MTTR (Mean Time To Recovery)**
Average time to restore service after a failure.

---

## N

**NoSQL**
Non-relational databases designed for specific data models and flexible schemas.

---

## O

**Observability**
The ability to understand the internal state of a system from its external outputs.

**On-Call**
Being available to respond to incidents outside normal working hours.

---

## P

**Partition Tolerance**
The ability of a system to continue operating despite network partitions.

**Polyglot Persistence**
Using multiple database technologies for different data storage needs.

**Postmortem**
A blameless analysis of an incident to identify root causes and prevent recurrence.

---

## Q

**Quorum**
The minimum number of nodes required to agree for an operation to succeed.

---

## R

**Read Replica**
A copy of a database used for read operations, reducing load on the primary.

**Refactoring**
Restructuring code without changing its external behavior.

**Replication**
Copying data across multiple nodes for availability and performance.

**Resilience**
The ability of a system to handle failures gracefully.

**Retry**
A resilience pattern that attempts an operation again after a failure.

**Rollback**
Reverting to a previous version after a failed deployment.

---

## S

**Saga**
A pattern for managing distributed transactions through a sequence of local transactions.

**Scalability**
The ability of a system to handle increased load.

**Schema**
The structure of data in a database.

**Service Level Agreement (SLA)**
A contract defining expected service levels and consequences for violations.

**Service Level Indicator (SLI)**
A metric measuring service behavior (e.g., availability, latency).

**Service Level Objective (SLO)**
A target value for an SLI (e.g., 99.9% availability).

**Sharding**
Partitioning data across multiple servers.

**SLA (Service Level Agreement)**
See Service Level Agreement.

**SLI (Service Level Indicator)**
See Service Level Indicator.

**SLO (Service Level Objective)**
See Service Level Objective.

**Split Brain**
A condition where multiple nodes believe they are the leader.

**Strangler Fig Pattern**
A pattern for gradually replacing a legacy system by routing new functionality to new components.

**Strong Consistency**
A consistency model where all reads return the most recent write.

---

## T

**Technical Debt**
The implied cost of additional rework caused by choosing an easy solution now instead of a better approach.

**Time Series Database**
A database optimized for storing and querying time-series data.

**Toil**
Manual, repetitive, automatable work that scales with service growth.

**Transaction**
A unit of work that is either completed entirely or not at all.

---

## U

**Ubiquitous Language (DDD)**
A shared language used by developers and domain experts within a bounded context.

---

## V

**Value Object (DDD)**
An object defined by its attributes, with no identity, and is immutable.

**Vertical Scaling**
Adding more resources (CPU, memory) to a single instance.

---

## W

**Write-Ahead Log**
A log of changes written before data is modified, enabling recovery.

---

## Sources

This glossary synthesizes definitions from:
- Designing Data-Intensive Applications (Kleppmann)
- Domain-Driven Design (Evans)
- Building Microservices (Newman)
- Site Reliability Engineering (Google)
- Team Topologies (Skelton, Pais)
- Release It! (Nygard)
