# Multi-Tenancy Patterns

## Purpose

Define multi-tenancy patterns for SaaS applications serving multiple customers from a shared infrastructure.

**Last Verified**: June 2026

---

## Tenancy Models

### 1. Shared Database, Shared Schema

**How**: All tenants in same tables, distinguished by `tenant_id` column.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL,
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_tenant_customer ON orders(tenant_id, customer_id);
```

**Pros**: Simple, cost-effective, easy cross-tenant analytics.
**Cons**: Noisy neighbor, data leak risk, no schema customization.
**Use when**: SMB SaaS, <1000 tenants, no strict compliance.

### 2. Shared Database, Separate Schemas

**How**: Each tenant gets a PostgreSQL schema.

```sql
CREATE SCHEMA tenant_abc;
CREATE TABLE tenant_abc.orders (...);

CREATE SCHEMA tenant_xyz;
CREATE TABLE tenant_xyz.orders (...);
```

**Pros**: Better isolation, per-tenant customization, easier backup.
**Cons**: Complex migrations, connection pool pressure.
**Use when**: Mid-market SaaS, 100-10000 tenants.

### 3. Separate Database per Tenant

**How**: Each tenant gets their own database.

```typescript
// Dynamic connection based on tenant
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

**Pros**: Strongest isolation, per-tenant backup, no noisy neighbor.
**Cons**: Highest cost, complex management.
**Use when**: Enterprise SaaS, <100 tenants, strict compliance.

### 4. Hybrid

**How**: Shared schema for small tenants, dedicated database for enterprise.

```typescript
@Injectable()
export class TenantResolver {
  constructor(private readonly tenantConfig: TenantConfigService) {}

  async resolve(tenantId: string): Promise<TenantContext> {
    const config = await this.tenantConfig.get(tenantId);
    
    if (config.isolation === 'dedicated') {
      return {
        type: 'dedicated',
        databaseUrl: config.databaseUrl,
      };
    }
    
    return {
      type: 'shared',
      tenantId,
    };
  }
}
```

---

## Implementation Patterns

### Row-Level Security (PostgreSQL)

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Set tenant context
SET app.current_tenant = 'tenant-uuid-here';
```

### Application-Level Tenant Isolation

```typescript
// Tenant-aware base repository
@Injectable()
export abstract class TenantAwareRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {}

  protected get tenantId(): string {
    return this.tenantContext.getTenantId();
  }

  protected addTenantFilter(query: any): any {
    return {
      ...query,
      where: {
        ...query.where,
        tenantId: this.tenantId,
      },
    };
  }
}

// Usage
@Injectable()
export class OrdersRepository extends TenantAwareRepository<Order> {
  async findAll(query?: any): Promise<Order[]> {
    return this.prisma.order.findMany(
      this.addTenantFilter(query || {})
    );
  }

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findFirst(
      this.addTenantFilter({ where: { id } })
    );
  }
}
```

### Tenant Context Service

```typescript
@Injectable()
export class TenantContextService {
  private tenantId: string;

  setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  getTenantId(): string {
    if (!this.tenantId) {
      throw new Error('Tenant context not set');
    }
    return this.tenantId;
  }
}
```

### Tenant Resolution Middleware

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // From JWT
    const tenantId = req.user?.tenantId;
    
    // From subdomain
    // const tenantId = this.resolveFromSubdomain(req.hostname);
    
    // From header
    // const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    this.tenantContext.setTenantId(tenantId);
    next();
  }
}
```

---

## Data Isolation Patterns

### Prisma Middleware

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    this.$use(async (params, next) => {
      const tenantId = getTenantFromContext();
      
      if (tenantId && this.isTenantModel(params.model)) {
        // Add tenant filter to queries
        if (params.action === 'findMany' || params.action === 'findFirst') {
          params.args.where = { ...params.args.where, tenantId };
        }
        if (params.action === 'create') {
          params.args.data = { ...params.args.data, tenantId };
        }
      }
      
      return next(params);
    });
  }

  private isTenantModel(model: string): boolean {
    const tenantModels = ['Order', 'Customer', 'Product'];
    return tenantModels.includes(model);
  }
}
```

### Drizzle Tenant Scoping

```typescript
export function withTenant<T extends PgTable>(
  table: T,
  tenantId: string,
) {
  return eq(table.tenantId, tenantId);
}

// Usage
const orders = await db
  .select()
  .from(ordersTable)
  .where(withTenant(ordersTable, currentTenantId));
```

---

## Tenant Provisioning

### Automated Provisioning

```typescript
@Injectable()
export class TenantProvisioningService {
  async provision(input: ProvisionTenantInput): Promise<Tenant> {
    // 1. Create tenant record
    const tenant = await this.tenantRepository.create({
      name: input.name,
      slug: input.slug,
      plan: input.plan,
    });

    // 2. Create default roles
    await this.rolesService.createDefaults(tenant.id);

    // 3. Create admin user
    await this.usersService.create({
      tenantId: tenant.id,
      email: input.adminEmail,
      role: 'admin',
    });

    // 4. Seed default data
    await this.seedService.seedDefaults(tenant.id);

    // 5. Send welcome email
    await this.notificationsService.sendWelcome(tenant);

    return tenant;
  }

  async deprovision(tenantId: string): Promise<void> {
    // 1. Soft-delete tenant
    await this.tenantRepository.softDelete(tenantId);

    // 2. Revoke all sessions
    await this.sessionsService.revokeAll(tenantId);

    // 3. Cancel subscriptions
    await this.billingService.cancel(tenantId);

    // 4. Schedule data deletion (GDPR)
    await this.jobsService.schedule('delete-tenant-data', { tenantId }, {
      delay: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
}
```

---

## Tenant-Specific Configuration

### Configuration Storage

```typescript
interface TenantConfig {
  features: Record<string, boolean>;
  limits: {
    maxUsers: number;
    maxStorage: number;
    maxApiCalls: number;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    customDomain?: string;
  };
  integrations: Record<string, any>;
}
```

### Feature Flags per Tenant

```typescript
@Injectable()
export class FeatureFlagService {
  async isEnabled(tenantId: string, feature: string): Promise<boolean> {
    const config = await this.tenantConfigService.get(tenantId);
    return config.features[feature] ?? false;
  }
}

// Guard
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const feature = this.reflector.get<string>('feature', context.getHandler());
    
    if (!feature) return true;
    
    return this.featureFlags.isEnabled(request.user.tenantId, feature);
  }
}

// Usage
@Feature('advanced-reporting')
@Get('reports/advanced')
async getAdvancedReports() { ... }
```

---

## Anti-Patterns

- **Missing tenant_id in queries**: Always scope queries to tenant
- **Cross-tenant data access**: Never allow it without explicit admin check
- **Shared sessions across tenants**: Always scope sessions
- **Missing tenant validation**: Validate tenant exists and is active
- **Hard-coded tenant limits**: Use configuration
- **Missing tenant cleanup**: Implement data retention policies
- **Not testing tenant isolation**: Write explicit tests for isolation

---

## Verification Checklist

- [ ] Tenant resolution implemented
- [ ] All queries scoped to tenant
- [ ] RLS policies configured (if using PostgreSQL RLS)
- [ ] Tenant provisioning automated
- [ ] Tenant deprovisioning handles data retention
- [ ] Feature flags per tenant working
- [ ] Tenant-specific configuration stored
- [ ] Cross-tenant access prevented
- [ ] Tenant isolation tested
- [ ] Backup/restore per tenant possible
