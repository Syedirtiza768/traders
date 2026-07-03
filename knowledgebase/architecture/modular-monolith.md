# Modular Monolith Architecture

## Purpose

Define the modular monolith architecture pattern - the recommended default for new enterprise applications.

**Last Verified**: June 2026

---

## What is a Modular Monolith

A modular monolith is a single deployable unit organized into well-defined, loosely-coupled modules with clear boundaries. It combines the simplicity of monolithic deployment with the organizational benefits of microservices.

```
┌─────────────────────────────────────────────────┐
│                  Modular Monolith                │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Auth     │ │ Orders   │ │ Products │       │
│  │ Module   │ │ Module   │ │ Module   │       │
│  │          │ │          │ │          │       │
│  │ - Ctrl   │ │ - Ctrl   │ │ - Ctrl   │       │
│  │ - Svc    │ │ - Svc    │ │ - Svc    │       │
│  │ - Repo   │ │ - Repo   │ │ - Repo   │       │
│  │ - Entity │ │ - Entity │ │ - Entity │       │
│  │ - DTO    │ │ - DTO    │ │ - DTO    │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│       │             │             │              │
│  ┌────┴─────────────┴─────────────┴────┐       │
│  │        Shared Kernel                 │       │
│  │  (Common, Utils, Base Classes)       │       │
│  └─────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## Module Design Principles

### 1. High Cohesion, Low Coupling

Each module should contain everything related to a single business capability. Modules should depend on abstractions, not implementations.

### 2. Explicit Dependencies

Module dependencies are declared explicitly. Circular dependencies are forbidden.

```typescript
// Good: Module declares its dependencies
@Module({
  imports: [AuthModule, SharedModule],
})
export class OrdersModule {}

// Bad: Circular dependency
@Module({
  imports: [ProductsModule], // ProductsModule also imports OrdersModule
})
export class OrdersModule {}
```

### 3. Public API via Module Exports

Each module exposes a public API through its exports. Internal implementation is hidden.

```typescript
@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService], // Public API
})
export class OrdersModule {}
```

### 4. Communication via Services

Modules communicate through exported services, not direct database access.

```typescript
// Good: Use exported service
@Injectable()
export class BillingService {
  constructor(private readonly ordersService: OrdersService) {}
  
  async createInvoice(orderId: string) {
    const order = await this.ordersService.findById(orderId);
    // ...
  }
}

// Bad: Direct database access across modules
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}
  
  async createInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    // ...
  }
}
```

---

## Module Structure

### Standard Module Layout

```
src/
  modules/
    orders/
      orders.module.ts          # Module definition
      orders.controller.ts      # HTTP endpoints
      orders.service.ts         # Business logic
      orders.repository.ts      # Data access
      orders.queue.ts           # Queue processors
      entities/
        order.entity.ts         # Domain entities
      dto/
        create-order.dto.ts     # Input DTOs
        order-response.dto.ts   # Output DTOs
      interfaces/
        order.interface.ts      # Interfaces
      enums/
        order-status.enum.ts    # Enums
      __tests__/
        orders.service.spec.ts  # Unit tests
        orders.controller.spec.ts
      README.md                 # Module documentation
```

### Shared Kernel

```
src/
  shared/
    common/
      base.entity.ts           # Base entity with audit fields
      base.repository.ts       # Base repository
      pagination.dto.ts        # Common DTOs
    config/
      app.config.ts            # Application configuration
      database.config.ts       # Database configuration
    decorators/
      current-user.decorator.ts
      tenant.decorator.ts
    filters/
      http-exception.filter.ts
    guards/
      auth.guard.ts
      roles.guard.ts
    interceptors/
      logging.interceptor.ts
      transform.interceptor.ts
    pipes/
      validation.pipe.ts
    utils/
      date.util.ts
      string.util.ts
    database/
      prisma.service.ts        # Database connection
      migrations/              # Migrations
```

---

## Module Communication Patterns

### Synchronous (Service Calls)

For immediate, same-process operations:

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const product = await this.productsService.findById(dto.productId);
    await this.inventoryService.reserveStock(dto.productId, dto.quantity);
    // ...
  }
}
```

### Asynchronous (Events)

For decoupled, cross-module operations:

```typescript
// Event definition
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
  ) {}
}

// Publisher
@Injectable()
export class OrdersService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(
      order.id,
      order.customerId,
      order.total,
    ));
    return order;
  }
}

// Subscriber
@Injectable()
export class NotificationsService {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    await this.sendOrderConfirmation(event.customerId, event.orderId);
  }
}
```

### Via Queue (Background Processing)

For long-running, reliable operations:

```typescript
@Injectable()
export class OrdersService {
  constructor(
    @InjectQueue('orders') private readonly ordersQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    await this.ordersQueue.add('process-order', { orderId: order.id });
    return order;
  }
}

@Processor('orders')
export class OrdersProcessor {
  @WorkerHandler('process-order')
  async handleProcessOrder(job: Job<{ orderId: string }>) {
    // Long-running processing
  }
}
```

---

## When to Use Modular Monolith

### Use When

- Starting a new product (default choice)
- Team size < 20 developers
- Deployment simplicity is valued
- Business domain is not yet fully understood
- Rapid iteration is needed
- Infrastructure budget is limited

### Don't Use When

- Multiple teams need independent deployment
- Different modules need different tech stacks
- Extreme scale requirements (millions of concurrent users)
- Regulatory requirements mandate physical isolation

### Migration to Microservices

A well-designed modular monolith can be migrated to microservices by:

1. Extracting modules one at a time
2. Replacing service calls with HTTP/gRPC calls
3. Replacing events with message queue
4. Running both in parallel during migration

---

## NestJS Implementation

### Module Registration

```typescript
// app.module.ts
@Module({
  imports: [
    // Shared modules
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    OrdersModule,
    ProductsModule,
    BillingModule,
    NotificationsModule,
  ],
})
export class AppModule {}
```

### Feature Module

```typescript
// modules/orders/orders.module.ts
@Module({
  imports: [
    forwardRef(() => ProductsModule),
    forwardRef(() => InventoryModule),
    BullModule.registerQueue({ name: 'orders' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrdersProcessor],
  exports: [OrdersService],
})
export class OrdersModule {}
```

---

## Anti-Patterns

- **Shared database access**: Modules should not directly query other modules' tables
- **Circular dependencies**: Indicates poor module boundaries
- **God module**: Module doing too much - split it
- **Anemic modules**: Module with no business logic - merge or remove
- **Missing boundaries**: Module internals exposed to other modules
- **Synchronous chains**: Long synchronous chains across modules - use events or queues
- **Shared state**: Modules sharing mutable state

---

## Verification Checklist

- [ ] Each module has clear responsibility
- [ ] Module dependencies are explicit and acyclic
- [ ] Modules communicate through exported services or events
- [ ] No direct database access across module boundaries
- [ ] Shared kernel contains only truly shared code
- [ ] Each module has its own tests
- [ ] Module documentation exists
- [ ] Events are used for cross-module side effects
- [ ] Queues are used for long-running operations
