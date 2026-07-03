# Hexagonal Architecture (Ports and Adapters)

## Purpose

Define Hexagonal Architecture patterns for building applications with clear separation between business logic and external concerns.

**Last Verified**: June 2026

---

## Core Concept

The application core (hexagon) contains business logic. External systems (databases, UI, APIs) connect through ports (interfaces) and adapters (implementations).

```
                    ┌──────────────┐
           ┌───────│  REST API    │───────┐
           │       │  Adapter     │       │
           │       └──────────────┘       │
           │                               │
    ┌──────┴──────┐               ┌───────┴──────┐
    │   Inbound   │               │   Outbound   │
    │   Port      │               │   Port       │
    └──────┬──────┘               └───────┬──────┘
           │                               │
    ┌──────┴──────────────────────────────┴──────┐
    │                                             │
    │              Application Core               │
    │           (Business Logic)                  │
    │                                             │
    └──────┬──────────────────────────────┬──────┘
           │                               │
    ┌──────┴──────┐               ┌───────┴──────┐
    │   Inbound   │               │   Outbound   │
    │   Port      │               │   Port       │
    └──────┬──────┘               └───────┬──────┘
           │                               │
           │       ┌──────────────┐       │
           └───────│  Database    │───────┘
                   │  Adapter     │
                   └──────────────┘
```

---

## Ports

### Inbound Ports (Driving)

Define what the application can do. Called by external systems.

```typescript
// ports/inbound/create-order.port.ts
export interface CreateOrderPort {
  execute(input: CreateOrderInput): Promise<OrderOutput>;
}

// ports/inbound/get-order.port.ts
export interface GetOrderPort {
  execute(orderId: string): Promise<OrderOutput>;
}
```

### Outbound Ports (Driven)

Define what the application needs from external systems.

```typescript
// ports/outbound/order-repository.port.ts
export interface OrderRepositoryPort {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

// ports/outbound/inventory-service.port.ts
export interface InventoryServicePort {
  reserve(productId: string, quantity: number): Promise<string>;
  release(reservationId: string): Promise<void>;
}

// ports/outbound/event-publisher.port.ts
export interface EventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
}
```

---

## Adapters

### Inbound Adapters (Driving)

Implement the interface to receive external input:

```typescript
// adapters/inbound/rest/orders.controller.ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrderPort: CreateOrderPort) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.createOrderPort.execute({
      customerId: dto.customerId,
      items: dto.items,
    });
  }
}

// adapters/inbound/graphql/orders.resolver.ts
@Resolver()
export class OrdersResolver {
  constructor(private readonly createOrderPort: CreateOrderPort) {}

  @Mutation()
  async createOrder(@Args('input') input: CreateOrderInput) {
    return this.createOrderPort.execute(input);
  }
}
```

### Outbound Adapters (Driven)

Implement the interface to connect to external systems:

```typescript
// adapters/outbound/prisma-order.adapter.ts
@Injectable()
export class PrismaOrderAdapter implements OrderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(order: Order): Promise<void> {
    await this.prisma.order.create({ data: order.toPersistence() });
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({ where: { id } });
    return record ? Order.fromPersistence(record) : null;
  }
}

// adapters/outbound/http-inventory.adapter.ts
@Injectable()
export class HttpInventoryAdapter implements InventoryServicePort {
  constructor(private readonly httpService: HttpService) {}

  async reserve(productId: string, quantity: number): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post('http://inventory/reserve', { productId, quantity })
    );
    return response.data.reservationId;
  }
}
```

---

## Application Core

### Use Cases (Implements Inbound Ports)

```typescript
// application/use-cases/create-order.use-case.ts
@Injectable()
export class CreateOrderUseCase implements CreateOrderPort {
  constructor(
    private readonly orderRepository: OrderRepositoryPort,
    private readonly inventoryService: InventoryServicePort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<OrderOutput> {
    // Business logic
    const order = Order.create(input.customerId, input.items);

    // Orchestrate external services
    const reservationId = await this.inventoryService.reserve(
      input.items[0].productId,
      input.items[0].quantity,
    );

    // Persist
    await this.orderRepository.save(order);

    // Publish domain event
    await this.eventPublisher.publish(new OrderCreatedEvent(order));

    // Return output
    return OrderOutput.fromDomain(order);
  }
}
```

### Domain Entities

```typescript
// domain/entities/order.ts
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    private _status: OrderStatus,
  ) {}

  static create(customerId: string, items: CreateOrderItemInput[]): Order {
    if (items.length === 0) throw new DomainError('Order must have items');
    
    return new Order(
      generateId(),
      customerId,
      items.map(item => OrderItem.create(item)),
      OrderStatus.CREATED,
    );
  }

  markAsPaid(): void {
    if (this._status !== OrderStatus.CREATED) {
      throw new DomainError('Can only pay for created orders');
    }
    this._status = OrderStatus.PAID;
  }

  get status(): OrderStatus {
    return this._status;
  }
}
```

---

## NestJS Module Structure

```
src/
  order/
    domain/
      entities/
        order.ts
        order-item.ts
      value-objects/
        money.ts
      events/
        order-created.event.ts
      errors/
        order.error.ts

    application/
      use-cases/
        create-order.use-case.ts
        get-order.use-case.ts
        update-order-status.use-case.ts
      dto/
        create-order.input.ts
        order.output.ts

    ports/
      inbound/
        create-order.port.ts
        get-order.port.ts
      outbound/
        order-repository.port.ts
        inventory-service.port.ts
        event-publisher.port.ts

    adapters/
      inbound/
        rest/
          orders.controller.ts
          orders.controller.spec.ts
        graphql/
          orders.resolver.ts
      outbound/
        persistence/
          prisma-order.adapter.ts
        external/
          http-inventory.adapter.ts
        messaging/
          bull-event-publisher.adapter.ts

    order.module.ts
```

### Module Definition

```typescript
@Module({
  controllers: [OrdersController],
  providers: [
    // Use cases
    CreateOrderUseCase,
    GetOrderUseCase,
    
    // Ports -> Adapters mapping
    { provide: CreateOrderPort, useExisting: CreateOrderUseCase },
    { provide: GetOrderPort, useExisting: GetOrderUseCase },
    { provide: OrderRepositoryPort, useClass: PrismaOrderAdapter },
    { provide: InventoryServicePort, useClass: HttpInventoryAdapter },
    { provide: EventPublisherPort, useClass: BullEventPublisherAdapter },
  ],
})
export class OrderModule {}
```

---

## Testing

### Test Domain (No Mocks Needed)

```typescript
describe('Order', () => {
  it('should create order', () => {
    const order = Order.create('customer-1', [
      { productId: 'p1', quantity: 2, price: 1000 },
    ]);

    expect(order.status).toBe(OrderStatus.CREATED);
  });
});
```

### Test Use Case (Mock Ports)

```typescript
describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let orderRepo: Mocked<OrderRepositoryPort>;
  let inventoryService: Mocked<InventoryServicePort>;

  beforeEach(() => {
    orderRepo = createMock<OrderRepositoryPort>();
    inventoryService = createMock<InventoryServicePort>();
    useCase = new CreateOrderUseCase(orderRepo, inventoryService, createMock());
  });

  it('should create order and reserve inventory', async () => {
    inventoryService.reserve.mockResolvedValue('reservation-1');
    
    const result = await useCase.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', quantity: 1, price: 100 }],
    });

    expect(orderRepo.save).toHaveBeenCalled();
    expect(inventoryService.reserve).toHaveBeenCalled();
  });
});
```

---

## Comparison with Clean Architecture

| Aspect | Hexagonal | Clean Architecture |
|---|---|---|
| Core concept | Ports and Adapters | Concentric layers |
| Focus | External integration | Layer separation |
| Naming | Ports (in/out) + Adapters | Entities, Use Cases, etc. |
| Flexibility | Very flexible boundaries | Stricter layer rules |
| Complexity | Simpler mental model | More prescriptive |
| NestJS fit | Excellent (modules as hexagons) | Good |

**Recommendation**: Use Hexagonal Architecture in NestJS. The module system maps naturally to hexagons with ports and adapters.

---

## Anti-Patterns

- **Adapter with business logic**: Adapters should only translate between formats
- **Missing port interface**: Always define port before adapter
- **Leaking adapter details**: Domain should not know about Prisma, HTTP, etc.
- **Over-abstraction**: Don't create ports for simple operations
- **Circular dependencies between hexagons**: Use events for cross-hexagon communication

---

## Verification Checklist

- [ ] Domain entities contain business logic
- [ ] Use cases implement inbound ports
- [ ] Repositories implement outbound ports
- [ ] External services behind outbound ports
- [ ] Adapters contain no business logic
- [ ] Dependencies point inward (domain has no external deps)
- [ ] Use cases testable with mocked ports
- [ ] Module structure maps to hexagons
