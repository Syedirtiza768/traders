# Multi-Tenant Data Modeling

## Purpose

Define data modeling patterns for multi-tenant applications.

**Last Verified**: June 2026

---

## Isolation Models

### 1. Shared Schema (tenant_id column)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_user ON orders(tenant_id, user_id);

-- Row-Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Pros**: Simple, cost-effective, easy analytics.
**Cons**: Noisy neighbor, data leak risk.
**Use when**: SMB SaaS, <1000 tenants.

### 2. Separate Schemas

```sql
CREATE SCHEMA tenant_abc;
CREATE TABLE tenant_abc.orders (...);

CREATE SCHEMA tenant_xyz;
CREATE TABLE tenant_xyz.orders (...);
```

**Pros**: Better isolation, per-tenant customization.
**Cons**: Complex migrations, connection pool pressure.
**Use when**: Mid-market SaaS, 100-10000 tenants.

### 3. Separate Databases

```typescript
// Dynamic connection per tenant
@Injectable()
export class TenantDatabaseService {
  private connections = new Map<string, PrismaClient>();

  getConnection(tenantId: string): PrismaClient {
    if (!this.connections.has(tenantId)) {
      const client = new PrismaClient({
        datasources: { db: { url: this.getTenantUrl(tenantId) } },
      });
      this.connections.set(tenantId, client);
    }
    return this.connections.get(tenantId)!;
  }
}
```

**Pros**: Strongest isolation, per-tenant backup.
**Cons**: Highest cost, complex management.
**Use when**: Enterprise SaaS, <100 tenants, strict compliance.

---

## Tenant-Aware Repository

```typescript
@Injectable()
export abstract class TenantAwareRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {}

  protected get tenantId(): string {
    return this.tenantContext.getTenantId();
  }

  protected tenantFilter(query: any = {}): any {
    return {
      ...query,
      where: { ...query.where, tenantId: this.tenantId },
    };
  }
}

@Injectable()
export class OrdersRepository extends TenantAwareRepository<Order> {
  async findAll(query?: any): Promise<Order[]> {
    return this.prisma.order.findMany(this.tenantFilter(query));
  }
}
```

---

## Tenant Provisioning

```typescript
@Injectable()
export class TenantProvisioningService {
  async provision(input: ProvisionTenantInput): Promise<Tenant> {
    const tenant = await this.tenantRepository.create({
      name: input.name,
      slug: input.slug,
      plan: input.plan,
    });

    await this.rolesService.createDefaults(tenant.id);
    await this.usersService.createAdmin(tenant.id, input.adminEmail);
    await this.seedService.seedDefaults(tenant.id);

    return tenant;
  }
}
```

---

## Anti-Patterns

- **Missing tenant_id**: Always include tenant context in queries
- **Cross-tenant access**: Always verify tenant ownership
- **Hard-coded limits**: Use per-tenant configuration
- **Missing cleanup**: Implement data retention policies

---

## Verification Checklist

- [ ] Tenant isolation model chosen
- [ ] tenant_id on all tenant-scoped tables
- [ ] RLS policies configured (if using shared schema)
- [ ] Tenant provisioning automated
- [ ] Tenant-scoped queries everywhere
- [ ] Cross-tenant access prevented
