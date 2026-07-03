# Event-Driven Architecture

## Purpose

Define event-driven architecture patterns for building decoupled, scalable systems.

**Last Verified**: June 2026

---

## Core Concepts

### Events

An event represents a fact that something happened. Events are immutable and past-tense.

```
OrderCreated
PaymentProcessed
UserRegistered
InventoryReserved
```

### Commands

A command represents a request to do something. Commands are imperative and can fail.

```
CreateOrder
ProcessPayment
RegisterUser
ReserveInventory
```

### Queries

A query represents a request for data. Queries are side-effect free.

```
GetOrderById
FindProductsByCategory
GetUserPermissions
```

---

## Event Patterns

### Event Notification

Lightweight event that notifies subscribers something happened:

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly timestamp: Date,
  ) {}
}
```

### Event-Carried State Transfer

Event contains all data subscribers need:

```typescript
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly items: Array<{ productId: string; quantity: number; price: number }>,
    public readonly total: number,
    public readonly shippingAddress: Address,
    public readonly timestamp: Date,
  ) {}
}
```

### Event Sourcing

Store events instead of current state:

```
Events:
  OrderCreated { orderId: "1", items: [...] }
  OrderItemAdded { orderId: "1", item: {...} }
  OrderShipped { orderId: "1", trackingNumber: "..." }
  OrderDelivered { orderId: "1", timestamp: "..." }

Replay events → Current State
```

---

## Implementation in NestJS

### Event Emitter (In-Process)

```typescript
// Module setup
@Module({
  imports: [EventEmitterModule.forRoot()],
})
export class AppModule {}

// Publisher
@Injectable()
export class OrdersService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(
      order.id,
      order.customerId,
      order.items,
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

@Injectable()
export class AnalyticsService {
  @OnEvent('order.created')
  async trackOrderCreated(event: OrderCreatedEvent) {
    await this.trackEvent('order_created', { orderId: event.orderId });
  }
}
```

### Message Queue (Cross-Service)

```typescript
// Publisher
@Injectable()
export class OrdersService {
  constructor(
    @InjectQueue('events') private readonly eventsQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    
    await this.eventsQueue.add('order.created', {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      total: order.total,
    });

    return order;
  }
}

// Consumer
@Processor('events')
export class EventsConsumer {
  @WorkerHandler('order.created')
  async handleOrderCreated(job: Job<OrderCreatedEvent>) {
    // Process event
  }
}
```

### Redis Pub/Sub (Real-Time)

```typescript
// Publisher
@Injectable()
export class OrdersService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    
    await this.redis.publish('order.created', JSON.stringify({
      orderId: order.id,
      customerId: order.customerId,
    }));

    return order;
  }
}

// Subscriber
@Injectable()
export class OrderEventsListener implements OnModuleInit {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onModuleInit() {
    await this.redis.subscribe('order.created', (message) => {
      const event = JSON.parse(message);
      // Handle event
    });
  }
}
```

---

## Event Schema Design

### Event Envelope

```typescript
interface EventEnvelope<T> {
  eventId: string;           // Unique event ID
  eventType: string;         // Event type (e.g., 'order.created')
  version: number;           // Schema version
  timestamp: Date;           // When event occurred
  source: string;            // Service that produced event
  correlationId: string;     // Request correlation ID
  data: T;                   // Event payload
}
```

### Event Versioning

```typescript
// V1
export class OrderCreatedEventV1 {
  readonly version = 1;
  orderId: string;
  customerId: string;
  total: number;
}

// V2 (backward compatible)
export class OrderCreatedEventV2 {
  readonly version = 2;
  orderId: string;
  customerId: string;
  total: number;
  currency: string;  // New field
}
```

---

## CQRS Pattern

### Command Query Responsibility Segregation

```
┌──────────────┐                    ┌──────────────┐
│   Commands   │                    │   Queries    │
│  (Writes)    │                    │  (Reads)     │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│   Write DB   │ ──── Events ────▶ │   Read DB    │
│  (PostgreSQL)│                    │  (Optimized) │
└──────────────┘                    └──────────────┘
```

### NestJS CQRS Implementation

```typescript
// Command
export class CreateOrderCommand {
  constructor(
    public readonly customerId: string,
    public readonly items: OrderItem[],
  ) {}
}

// Command Handler
@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  async execute(command: CreateOrderCommand) {
    const order = Order.create(command.customerId, command.items);
    await this.ordersRepository.save(order);
    return order;
  }
}

// Query
export class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}

// Query Handler
@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  async execute(query: GetOrderQuery) {
    return this.ordersReadRepository.findById(query.orderId);
  }
}

// Controller
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.commandBus.execute(
      new CreateOrderCommand(dto.customerId, dto.items)
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(id));
  }
}
```

---

## Event Store

### When to Use Event Sourcing

- **Audit requirements**: Need complete history of all changes
- **Complex business logic**: Need to replay events for debugging
- **Temporal queries**: Need to query state at any point in time
- **Integration**: Need to publish events to external systems

### When NOT to Use Event Sourcing

- **Simple CRUD**: Overhead not justified
- **Small team**: Complexity requires experienced team
- **Performance-critical reads**: Replaying events is slow
- **Unclear domain**: Domain must be well-understood

### Event Store Implementation

```typescript
@Injectable()
export class EventStore {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: EventEnvelope<any>): Promise<void> {
    await this.prisma.event.create({
      data: {
        eventId: event.eventId,
        eventType: event.eventType,
        version: event.version,
        timestamp: event.timestamp,
        source: event.source,
        correlationId: event.correlationId,
        data: event.data,
      },
    });
  }

  async getEvents(aggregateId: string): Promise<EventEnvelope<any>[]> {
    return this.prisma.event.findMany({
      where: { aggregateId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
```

---

## Anti-Patterns

- **Missing event versioning**: Events should be versioned for schema evolution
- **Missing idempotency**: Event handlers should be idempotent
- **Missing dead letter queue**: Failed events should be retried or stored
- **Tight coupling**: Events should be self-contained, not require callback
- **Missing correlation IDs**: Events should carry correlation IDs for tracing
- **Missing event ordering**: Events should be processed in order when needed
- **Over-using events**: Not everything needs to be an event

---

## Verification Checklist

- [ ] Event types defined and documented
- [ ] Event schemas versioned
- [ ] Event handlers are idempotent
- [ ] Dead letter queue configured
- [ ] Event ordering considered where needed
- [ ] Correlation IDs included in events
- [ ] Event replay capability exists (if using event sourcing)
- [ ] Monitoring for event processing latency
- [ ] Retry logic for failed event processing
- [ ] Event schema evolution strategy defined
