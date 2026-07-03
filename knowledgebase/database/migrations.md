# Migrations

## Purpose

Define migration strategies for database schema management.

**Last Verified**: June 2026

---

## Prisma Migrations

### Creating Migrations

```bash
# Create migration
npx prisma migrate dev --name add_orders_table

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Check migration status
npx prisma migrate status
```

### Migration File Structure

```prisma
// prisma/schema.prisma
model Order {
  id        String   @id @default(uuid())
  userId    String
  total     Decimal  @db.Decimal(10, 2)
  status    String   @default("PENDING")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
  items     OrderItem[]

  @@index([userId])
  @@index([status])
}
```

### Custom Migration SQL

```sql
-- prisma/migrations/20260628_add_orders_table/migration.sql
CREATE TABLE "orders" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");
CREATE INDEX "idx_orders_status" ON "orders"("status");

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
```

### Data Migrations

```typescript
// scripts/migrate-data.ts
import { PrismaClient } from '@prisma/client';

async function migrateData() {
  const prisma = new PrismaClient();

  // Migrate data
  const orders = await prisma.$queryRaw`SELECT * FROM old_orders`;
  
  for (const order of orders) {
    await prisma.order.create({
      data: {
        id: order.id,
        userId: order.user_id,
        total: order.total,
        status: order.status,
      },
    });
  }

  await prisma.$disconnect();
}

migrateData();
```

---

## Drizzle Migrations

### Creating Migrations

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate

# Push schema (development)
npx drizzle-kit push
```

### Schema Definition

```typescript
// drizzle/schema.ts
import { pgTable, uuid, text, decimal, timestamp } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: text('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## Migration Best Practices

### Forward-Only Migrations

- Never modify existing migration files
- Create new migrations for changes
- Test migrations on staging before production

### Migration Review Checklist

- [ ] Migration is reversible (has down migration or is safe to run forward-only)
- [ ] No data loss potential
- [ ] Indexes created CONCURRENTLY for large tables
- [ ] Foreign keys added after data migration
- [ ] Default values specified for new NOT NULL columns

### Large Table Migrations

```sql
-- Add column without lock (PostgreSQL 11+)
ALTER TABLE large_table ADD COLUMN new_column TEXT;

-- Create index concurrently
CREATE INDEX CONCURRENTLY idx_large_table_column ON large_table(column);

-- Add constraint without lock
ALTER TABLE large_table ADD CONSTRAINT check_value CHECK (value > 0) NOT VALID;
ALTER TABLE large_table VALIDATE CONSTRAINT check_value;
```

### Zero-Downtime Migrations

1. Add new column (nullable)
2. Deploy code that writes to both old and new columns
3. Backfill existing data
4. Add NOT NULL constraint
5. Deploy code that only uses new column
6. Drop old column (separate migration)

---

## Environment Strategy

### Development

```bash
npx prisma migrate dev --name description
```

### Staging

```bash
npx prisma migrate deploy
```

### Production

```bash
# Run during maintenance window or with zero-downtime approach
npx prisma migrate deploy
```

---

## Anti-Patterns

- **Modifying existing migrations**: Always create new migrations
- **Missing down migrations**: Provide rollback capability
- **Large table locks**: Use CONCURRENTLY for indexes
- **Data loss migrations**: Backup before destructive changes
- **Skipping staging**: Always test migrations on staging first
- **Auto-migration in production**: Never run `migrate dev` in production

---

## Verification Checklist

- [ ] Migration tool configured (Prisma/Drizzle)
- [ ] Migrations tested on staging
- [ ] Backup before production migrations
- [ ] Large table migrations use concurrent operations
- [ ] Data migrations separated from schema migrations
- [ ] Migration rollback plan exists
- [ ] CI/CD runs migration checks
