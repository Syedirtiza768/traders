# Clean Architecture

## Purpose

Define Clean Architecture patterns for building maintainable, testable enterprise applications.

**Last Verified**: June 2026

---

## Core Principles

### Dependency Rule

Dependencies point inward. Inner layers know nothing about outer layers.

```
┌─────────────────────────────────────────────────┐
│              Frameworks & Drivers                │
│  ┌─────────────────────────────────────────┐   │
│  │          Interface Adapters              │   │
│  │  ┌─────────────────────────────────┐    │   │
│  │  │       Application Business      │    │   │
│  │  │  ┌─────────────────────────┐    │    │   │
│  │  │  │    Enterprise Business   │    │    │   │
│  │  │  │        Rules            │    │    │   │
│  │  │  └─────────────────────────┘    │    │   │
│  │  └─────────────────────────────────┘    │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Layer Definitions

### 1. Enterprise Business Rules (Entities)

Domain entities with business logic. No dependencies on external frameworks.

```typescript
// entities/order.entity.ts
export class Order {
  private constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public status: OrderStatus,
    public readonly createdAt: Date,
  ) {}

  static create(customerId: string, items: OrderItem[]): Order {
    if (items.length === 0) {
      throw new DomainError('Order must have at least one item');
    }

    return new Order(
      generateId(),
      customerId,
      items,
      OrderStatus.PENDING,
      new Date(),
    );
  }

  get total(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  ship(): void {
    if (this.status !== OrderStatus.PAID) {
      throw new DomainError('Cannot ship unpaid order');
    }
    this.status = OrderStatus.SHIPPED;
  }
}
```

### 2. Application Business Rules (Use Cases)

Use cases orchestrate entity interactions. Depend on entities and interfaces.

```typescript
// use-cases/create-order.use-case.ts
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly inventoryService: InventoryPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new ApplicationError('Customer not found');
    }

    const order = Order.create(input.customerId, input.items);

    await this.inventoryService.reserveItems(input.items);
    await this.orderRepository.save(order);

    return order;
  }
}
```

### 3. Interface Adapters

Controllers, presenters, and gateways. Convert data between layers.

```typescript
// adapters/controllers/orders.controller.ts
@Controller('orders')
export class OrdersController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<OrderResponse> {
    const order = await this.createOrderUseCase.execute({
      customerId: dto.customerId,
      items: dto.items,
    });

    return OrderPresenter.toResponse(order);
  }
}

// adapters/presenters/order.presenter.ts
export class OrderPresenter {
  static toResponse(order: Order): OrderResponse {
    return {
      id: order.id,
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    };
  }
}
```

### 4. Frameworks & Drivers

External frameworks, databases, web servers, external services.

```typescript
// infrastructure/database/prisma-order.repository.ts
@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(order: Order): Promise<void> {
    await this.prisma.order.create({
      data: {
        id: order.id,
        customerId: order.customerId,
        status: order.status,
        items: {
          create: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!record) return null;

    return Order.fromPersistence(record);
  }
}
```

---

## Ports and Adapters

### Ports (Interfaces)

Define contracts that outer layers must implement:

```typescript
// ports/order.repository.ts
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
}

// ports/inventory.port.ts
export interface InventoryPort {
  reserveItems(items: OrderItem[]): Promise<void>;
  releaseReservation(reservationId: string): Promise<void>;
}

// ports/email.port.ts
export interface EmailPort {
  sendOrderConfirmation(order: Order): Promise<void>;
}
```

### Adapters (Implementations)

Implement port interfaces:

```typescript
// adapters/prisma-order.repository.ts
@Injectable()
export class PrismaOrderRepository implements OrderRepository { ... }

// adapters/http-inventory.adapter.ts
@Injectable()
export class HttpInventoryAdapter implements InventoryPort {
  constructor(private readonly httpService: HttpService) {}

  async reserveItems(items: OrderItem[]): Promise<void> {
    await firstValueFrom(
      this.httpService.post('http://inventory-service/reserve', { items })
    );
  }
}

// adapters/resend-email.adapter.ts
@Injectable()
export class ResendEmailAdapter implements EmailPort {
  constructor(private readonly resend: Resend) {}

  async sendOrderConfirmation(order: Order): Promise<void> {
    await this.resend.emails.send({
      from: 'orders@example.com',
      to: order.customerEmail,
      subject: `Order ${order.id} confirmed`,
      html: buildOrderConfirmationEmail(order),
    });
  }
}
```

---

## NestJS Module Structure

```
src/
  domain/
    entities/
      order.entity.ts
      customer.entity.ts
    value-objects/
      money.ts
      address.ts
    errors/
      domain.error.ts

  application/
    use-cases/
      create-order.use-case.ts
      get-order.use-case.ts
      ship-order.use-case.ts
    ports/
      order.repository.ts
      inventory.port.ts
      email.port.ts
    dto/
      create-order.input.ts
      order.output.ts

  infrastructure/
    database/
      prisma-order.repository.ts
      prisma-customer.repository.ts
    external/
      http-inventory.adapter.ts
      resend-email.adapter.ts
    config/
      app.config.ts

  adapters/
    controllers/
      orders.controller.ts
      customers.controller.ts
    presenters/
      order.presenter.ts
    guards/
      auth.guard.ts
    interceptors/
      logging.interceptor.ts
```

---

## Testing Strategy

### Unit Tests (Domain + Application)

```typescript
describe('Order', () => {
  it('should create order with valid items', () => {
    const order = Order.create('customer-1', [
      { productId: 'p1', quantity: 2, price: 10 },
    ]);

    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.total).toBe(20);
  });

  it('should throw error for empty order', () => {
    expect(() => Order.create('customer-1', [])).toThrow(DomainError);
  });
});

describe('CreateOrderUseCase', () => {
  it('should create order and reserve inventory', async () => {
    const orderRepo = mock<OrderRepository>();
    const customerRepo = mock<CustomerRepository>();
    const inventoryPort = mock<InventoryPort>();

    customerRepo.findById.mockResolvedValue(mockCustomer);
    orderRepo.save.mockResolvedValue(undefined);
    inventoryPort.reserveItems.mockResolvedValue(undefined);

    const useCase = new CreateOrderUseCase(orderRepo, customerRepo, inventoryPort);
    const result = await useCase.execute({ customerId: 'c1', items: [mockItem] });

    expect(result).toBeDefined();
    expect(inventoryPort.reserveItems).toHaveBeenCalled();
    expect(orderRepo.save).toHaveBeenCalled();
  });
});
```

### Integration Tests (Adapters)

```typescript
describe('PrismaOrderRepository', () => {
  it('should save and retrieve order', async () => {
    const order = Order.create('customer-1', [mockItem]);
    await repository.save(order);

    const found = await repository.findById(order.id);
    expect(found.id).toBe(order.id);
  });
});
```

---

## Anti-Patterns

- **Anemic domain model**: Entities with no business logic, only data
- **Business logic in controllers**: Controllers should only adapt request/response
- **Business logic in repositories**: Repositories should only handle data access
- **Direct database access in use cases**: Use repository interfaces
- **Missing ports**: Direct dependencies on external services
- **Over-abstraction**: Too many layers for simple operations

---

## Verification Checklist

- [ ] Entities contain business logic
- [ ] Use cases orchestrate entity interactions
- [ ] Controllers adapt request/response only
- [ ] Repositories implement port interfaces
- [ ] Dependencies point inward
- [ ] Domain layer has no external dependencies
- [ ] Use cases are testable in isolation
- [ ] External services behind port interfaces
