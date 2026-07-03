# PostgreSQL Modern Standards

## Purpose

Define modern PostgreSQL patterns for building production-grade database architectures.

**Last Verified**: June 2026
**PostgreSQL Version**: v17/v18 stable, v19 beta

---

## Connection Management

### Connection Pooling

```
Application → pgBouncer → PostgreSQL
```

**pgBouncer Configuration**

```ini
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
```

### Prisma with Connection Pooling

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")        // Direct connection for migrations
  directUrl = env("DIRECT_DATABASE_URL") // For migrations
}

// Use pooled connection string for runtime
// DATABASE_URL = "postgresql://user:pass@pgbouncer:6432/db"
// DIRECT_DATABASE_URL = "postgresql://user:pass:5432/db"
```

---

## Schema Design

### Naming Conventions

```sql
-- Tables: snake_case, plural
CREATE TABLE users (...);
CREATE TABLE order_items (...);

-- Columns: snake_case
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes: idx_table_column
CREATE INDEX idx_users_email ON users(email);

-- Foreign keys: fk_table_referenced
ALTER TABLE orders ADD CONSTRAINT fk_orders_user 
  FOREIGN KEY (user_id) REFERENCES users(id);
```

### Audit Columns

```sql
-- Standard audit columns for every table
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
created_by UUID REFERENCES users(id),
updated_by UUID REFERENCES users(id),
deleted_at TIMESTAMPTZ,  -- Soft delete
```

### UUID vs Serial

```sql
-- UUID (Recommended for distributed systems)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Serial (Simpler, but exposes sequence)
id SERIAL PRIMARY KEY

-- ULID (Sortable, timestamp-embedded)
id TEXT PRIMARY KEY DEFAULT generate_ulid()
```

---

## Data Types

### Type Selection Guide

| Data Type | Use Case | Example |
|---|---|---|
| TEXT | Variable length strings | names, descriptions |
| VARCHAR(n) | Constrained strings | emails, codes |
| INTEGER | 32-bit integers | counts, quantities |
| BIGINT | 64-bit integers | large counters |
| DECIMAL(p,s) | Exact precision | money, measurements |
| NUMERIC | Exact precision | financial calculations |
| BOOLEAN | True/false | flags, toggles |
| TIMESTAMPTZ | Timestamps with timezone | created_at, updated_at |
| DATE | Date only | birth_date, due_date |
| JSONB | Flexible JSON data | metadata, settings |
| UUID | Unique identifiers | primary keys |
| JSONB | Semi-structured data | preferences, config |

### JSONB Usage

```sql
-- Store flexible metadata
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Query JSONB
SELECT * FROM products WHERE metadata->>'color' = 'red';
SELECT * FROM products WHERE metadata @> '{"size": "large"}';
SELECT * FROM products WHERE metadata->'tags' ? 'sale';

-- Index JSONB
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);
CREATE INDEX idx_products_color ON products ((metadata->>'color'));
```

---

## Indexing

### Index Types

```sql
-- B-tree (default, equality and range)
CREATE INDEX idx_users_email ON users(email);

-- GIN (JSONB, arrays, full-text search)
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);

-- GiST (geometric, range types)
CREATE INDEX idx_locations_coords ON locations USING GST(coords);

-- Partial index (conditional)
CREATE INDEX idx_orders_pending ON orders(created_at) 
  WHERE status = 'PENDING';

-- Composite index
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Covering index (INCLUDE)
CREATE INDEX idx_users_email_covering ON users(email) INCLUDE (name, created_at);
```

### Index Guidelines

- Index columns used in WHERE clauses
- Index foreign keys
- Index columns used in ORDER BY
- Use partial indexes for filtered queries
- Use covering indexes for frequently accessed columns
- Monitor unused indexes and remove them

---

## Transactions

### Isolation Levels

```sql
-- Read Committed (default)
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- Sees committed data only
COMMIT;

-- Repeatable Read
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- Consistent snapshot throughout transaction
COMMIT;

-- Serializable
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Full isolation, may retry on conflict
COMMIT;
```

### Prisma Transactions

```typescript
// Interactive transactions
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { userId, status: 'PENDING' } });
  
  await tx.inventory.update({
    where: { productId },
    data: { quantity: { decrement: quantity } },
  });

  return order;
});

// Batch transactions
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
]);
```

---

## Row-Level Security

### Setup

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Set tenant in session
SET app.current_tenant = 'tenant-uuid';
```

### Prisma RLS

```typescript
// Set tenant context before queries
await prisma.$executeRaw`SET app.current_tenant = ${tenantId}`;

// All subsequent queries are automatically filtered
const orders = await prisma.order.findMany();
```

---

## Full-Text Search

```sql
-- Add tsvector column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Populate search vector
UPDATE products SET search_vector = 
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''));

-- Create GIN index
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Search query
SELECT * FROM products 
WHERE search_vector @@ to_tsquery('english', 'laptop & gaming');

-- With ranking
SELECT *, ts_rank(search_vector, query) AS rank
FROM products, to_tsquery('english', 'laptop & gaming') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

---

## Performance

### Query Analysis

```sql
-- Explain analyze
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM orders WHERE user_id = 'uuid' AND status = 'COMPLETED';

-- pg_stat_statements
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Common Performance Issues

```sql
-- N+1 queries (use JOIN or eager loading)
-- Bad: Loop queries
SELECT * FROM orders WHERE user_id = $1;
SELECT * FROM order_items WHERE order_id = $2; -- For each order

-- Good: Single query with JOIN
SELECT o.*, oi.* 
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = $1;

-- Missing index (check with EXPLAIN)
-- Sequential scan on large table = missing index

-- Large result sets (use pagination)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 0;
```

---

## Backup and Recovery

### pg_dump

```bash
# Full backup
pg_dump -h localhost -U postgres -d mydb > backup.sql

# Custom format (parallel restore)
pg_dump -h localhost -U postgres -d mydb -Fc > backup.dump

# Restore
pg_restore -h localhost -U postgres -d mydb backup.dump
```

### Point-in-Time Recovery

```bash
# Enable WAL archiving
archive_mode = on
archive_command = 'cp %p /archive/%f'

# Base backup
pg_basebackup -h localhost -U replicator -D /backup/base -Fp -Xs -P

# Recovery
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-06-28 12:00:00'
```

---

## Anti-Patterns

- **Missing indexes on foreign keys**: Always index FK columns
- **SELECT ***: Select only needed columns
- **Missing LIMIT on queries**: Always paginate
- **Storing files in database**: Use object storage
- **Missing audit columns**: Add created_at, updated_at
- **Using SERIAL for distributed**: Use UUID
- **Missing connection pooling**: Use pgBouncer
- **Ignoring EXPLAIN output**: Analyze slow queries

---

## Verification Checklist

- [ ] Connection pooling configured
- [ ] Naming conventions defined
- [ ] Audit columns on all tables
- [ ] Indexes on foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Row-level security configured (if multi-tenant)
- [ ] Backup strategy defined
- [ ] Monitoring configured
- [ ] Slow query logging enabled
