# ADR Template (Architecture Decision Record)

## Purpose

Template for documenting architectural decisions.

**Last Verified**: June 2026

---

## Template

```markdown
# ADR-{NNNN}: {Title}

**Date**: {YYYY-MM-DD}
**Status**: {Proposed / Accepted / Deprecated / Superseded}
**Deciders**: {List of people involved}
**Supersedes**: {Link to previous ADR, if applicable}

---

## Context

{Describe the situation and problem that requires a decision. What are the forces at play?}

## Decision

{State the decision that was made clearly and concisely.}

## Rationale

{Explain why this decision was made. What factors were considered?}

### Options Considered

#### Option 1: {Name}
**Description**: {What it is}
**Pros**:
- {Pro 1}
- {Pro 2}

**Cons**:
- {Con 1}
- {Con 2}

#### Option 2: {Name}
**Description**: {What it is}
**Pros**:
- {Pro 1}
- {Pro 2}

**Cons**:
- {Con 1}
- {Con 2}

#### Option 3: {Name}
**Description**: {What it is}
**Pros**:
- {Pro 1}

**Cons**:
- {Con 1}

### Why This Option

{Explain why the chosen option was selected over alternatives}

## Consequences

### Positive
- {Positive consequence 1}
- {Positive consequence 2}

### Negative
- {Negative consequence 1}
- {Negative consequence 2}

### Risks
- {Risk 1 and mitigation}
- {Risk 2 and mitigation}

## Implementation Notes

{Any notes about how this decision should be implemented}

## References

- {Link to relevant documentation}
- {Link to research}
- {Link to related ADRs}

## Review Schedule

- **Next Review**: {Date}
- **Review Trigger**: {What would cause this to be reconsidered}
```

---

## Example ADR

```markdown
# ADR-0001: Use PostgreSQL as Primary Database

**Date**: 2026-01-15
**Status**: Accepted
**Deciders**: Tech Lead, Backend Team

---

## Context

We need a relational database for our SaaS application that supports:
- Multi-tenancy with row-level security
- JSONB for flexible metadata
- Full-text search
- ACID transactions
- Strong ecosystem support

## Decision

Use PostgreSQL 17/18 as the primary database.

## Rationale

### Options Considered

#### Option 1: PostgreSQL
**Pros**:
- Excellent multi-tenancy support (RLS)
- JSONB for flexible data
- Full-text search built-in
- Strong TypeScript ecosystem (Prisma, Drizzle)
- Battle-tested at scale

**Cons**:
- More complex than MySQL for simple use cases
- Requires connection pooling for production

#### Option 2: MySQL 8
**Pros**:
- Simpler for basic use cases
- Wider hosting support

**Cons**:
- Weaker multi-tenancy support
- Limited JSONB capabilities
- No row-level security

#### Option 3: MongoDB
**Pros**:
- Flexible schema
- Easy to start with

**Cons**:
- No ACID transactions (multi-document)
- Weaker consistency guarantees
- Not ideal for relational data

### Why PostgreSQL

PostgreSQL provides the best balance of features for a multi-tenant SaaS application. RLS support, JSONB, and the TypeScript ecosystem make it the clear choice.

## Consequences

### Positive
- Strong multi-tenancy support with RLS
- Flexible data modeling with JSONB
- Excellent tooling with Prisma/Drizzle

### Negative
- Team needs PostgreSQL expertise
- Connection pooling required for production

### Risks
- Performance at extreme scale → Mitigation: Read replicas, connection pooling

## References
- https://www.postgresql.org/docs/
- https://www.prisma.io/docs/concepts/database-connectors/postgresql
```

---

## Naming Convention

```
NNNN-short-title.md
```

Examples:
- `0001-use-postgresql.md`
- `0002-use-nestjs.md`
- `0003-modular-monolith-architecture.md`
- `0004-jwt-authentication.md`

---

## ADR Index

Maintain an index file:

```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](0001-use-postgresql.md) | Use PostgreSQL | Accepted | 2026-01-15 |
| [0002](0002-use-nestjs.md) | Use NestJS | Accepted | 2026-01-15 |
| [0003](0003-modular-monolith.md) | Modular Monolith | Accepted | 2026-01-20 |
```

---

## Anti-Patterns

- **Too detailed**: Keep it concise
- **Too vague**: Include enough context
- **Not revisiting**: Review when circumstances change
- **No alternatives considered**: Always consider options
- **Missing consequences**: Document both positive and negative
