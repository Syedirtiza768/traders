# Database Design

## Purpose

Define database design principles for building scalable, maintainable database schemas.

**Last Verified**: June 2026

---

## Normalization

### Normal Forms

**1NF**: Each column contains atomic values, no repeating groups.

```sql
-- Bad (violates 1NF)
CREATE TABLE orders (
  id INT PRIMARY KEY,
  items TEXT  -- "item1:2, item2:3"
);

-- Good (1NF)
CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  product_id INT REFERENCES products(id),
  quantity INT
);
```

**2NF**: In 1NF + every non-key column depends on the entire primary key.

**3NF**: In 2NF + no transitive dependencies.

```sql
-- Bad (violates 3NF)
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  user_name TEXT,  -- Depends on user_id, not order id
  total DECIMAL
);

-- Good (3NF)
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total DECIMAL
);
-- user_name accessed via JOIN to users table
```

### When to Denormalize

- **Performance-critical reads**: Pre-computed counts, aggregations
- **Search indexes**: Redundant data for full-text search
- **CQRS read models**: Optimized for specific queries
- **Reporting**: Avoid complex JOINs

---

## Relationships

### One-to-Many

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Many-to-Many

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE product_categories (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
```

### One-to-One

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  avatar_url TEXT
);
```

---

## Constraints

### Check Constraints

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) CHECK (price > 0),
  quantity INT CHECK (quantity >= 0),
  status TEXT CHECK (status IN ('active', 'inactive', 'draft'))
);
```

### Unique Constraints

```sql
-- Single column
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Composite
ALTER TABLE order_items ADD CONSTRAINT uq_order_product 
  UNIQUE (order_id, product_id);
```

### Exclusion Constraints

```sql
-- Prevent overlapping bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  during TSTZRANGE NOT NULL,
  EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);
```

---

## Soft Deletes

### Implementation

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Partial index for active records
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- Query active records
SELECT * FROM users WHERE deleted_at IS NULL;

-- Soft delete
UPDATE users SET deleted_at = NOW() WHERE id = $1;

-- Restore
UPDATE users SET deleted_at = NULL WHERE id = $1;
```

### Prisma Soft Delete Middleware

```typescript
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst';
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === 'findMany') {
      params.args.where = { ...params.args.where, deletedAt: null };
    }
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }
  }
  return next(params);
});
```

---

## Temporal Data

### Valid-Time Tables

```sql
CREATE TABLE product_prices (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  price DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  EXCLUDE USING GIST (
    product_id WITH =,
    TSTZRANGE(valid_from, valid_to) WITH &&
  )
);

-- Current price
SELECT * FROM product_prices 
WHERE product_id = $1 
  AND valid_from <= NOW() 
  AND (valid_to IS NULL OR valid_to > NOW());
```

---

## Audit Trails

### Trigger-Based Audit

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_setting('app.current_user', true)::uuid);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user', true)::uuid);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_setting('app.current_user', true)::uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_audit
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Anti-Patterns

- **Storing derived data**: Calculate on query (except for performance)
- **Missing foreign keys**: Always define relationships
- **Missing NOT NULL**: Use NOT NULL where data is required
- **EAV pattern**: Avoid Entity-Attribute-Value, use JSONB
- **Over-normalizing**: Some denormalization is OK
- **Missing indexes on FK**: Always index foreign keys
- **Using TEXT for enums**: Use CHECK constraints or pg enum
- **Storing blobs**: Use object storage for files

---

## Verification Checklist

- [ ] Tables normalized to 3NF (unless denormalized for performance)
- [ ] Foreign keys defined for all relationships
- [ ] Indexes on foreign keys and frequently queried columns
- [ ] NOT NULL constraints where appropriate
- [ ] CHECK constraints for data validation
- [ ] Soft delete implemented where needed
- [ ] Audit trail implemented
- [ ] Naming conventions consistent
