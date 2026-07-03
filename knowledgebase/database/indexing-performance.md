# Indexing and Performance

## Purpose

Define indexing strategies and query optimization patterns for PostgreSQL.

**Last Verified**: June 2026

---

## Index Types

### B-Tree (Default)

```sql
-- Single column
CREATE INDEX idx_users_email ON users(email);

-- Composite (order matters)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Covering index
CREATE INDEX idx_users_email_covering ON users(email) INCLUDE (name, created_at);
```

### GIN (Generalized Inverted Index)

```sql
-- JSONB
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);

-- Full-text search
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Arrays
CREATE INDEX idx_tags ON items USING GIN(tags);
```

### Partial Index

```sql
-- Index only active records
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'PENDING';

-- Index only non-deleted
CREATE INDEX idx_users_active ON users(email) WHERE deleted_at IS NULL;
```

### Expression Index

```sql
-- Index on expression
CREATE INDEX idx_users_lower_email ON users(lower(email));

-- Index on function result
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
```

---

## Query Optimization

### EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders 
WHERE user_id = 'uuid' AND status = 'COMPLETED'
ORDER BY created_at DESC
LIMIT 20;
```

### Common Issues

```sql
-- Sequential scan on large table → Add index
-- Nested loop with high row count → Restructure query
-- Sort with high memory → Add index on ORDER BY columns
-- Bitmap heap scan with many pages → Reduce rows returned
```

### N+1 Prevention

```typescript
// Bad: N+1 queries
const orders = await prisma.order.findMany();
for (const order of orders) {
  const user = await prisma.user.findUnique({ where: { id: order.userId } });
}

// Good: Eager loading
const orders = await prisma.order.findMany({
  include: { user: true },
});

// Good: Batch loading
const userIds = orders.map(o => o.userId);
const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
```

---

## Connection Pooling

### pgBouncer Configuration

```ini
[pgbouncer]
pool_mode = transaction
default_pool_size = 20
max_client_conn = 1000
```

### Prisma with pgBouncer

```env
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true"
DIRECT_DATABASE_URL="postgresql://user:pass@db:5432/db"
```

---

## Monitoring

### pg_stat_statements

```sql
-- Enable
CREATE EXTENSION pg_stat_statements;

-- Top queries by time
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Slow Query Logging

```ini
# postgresql.conf
log_min_duration_statement = 1000  # Log queries > 1s
```

---

## Anti-Patterns

- **Missing indexes on foreign keys**: Always index FK columns
- **Over-indexing**: Each index slows writes
- **SELECT ***: Select only needed columns
- **Missing LIMIT**: Always paginate large results
- **Functions on indexed columns**: Use expression indexes instead

---

## Verification Checklist

- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Partial indexes for filtered queries
- [ ] Composite indexes for multi-column queries
- [ ] Unused indexes identified and removed
- [ ] pg_stat_statements enabled
- [ ] Slow query logging configured
