# Microservices Architecture

## Purpose

Define microservices architecture patterns for enterprise applications that require independent deployment and scaling.

**Last Verified**: June 2026

---

## When to Use Microservices

### Use When

- **Multiple teams** (5+) need independent deployment cycles
- **Different scaling needs** per service (e.g., search vs. auth)
- **Different technology requirements** per service
- **Regulatory requirements** mandate service isolation
- **System is too large** for a single codebase
- **Proven modular monolith** that has outgrown single deployment

### Don't Use When

- **Team is small** (<20 developers)
- **Domain is not well understood** (start with modular monolith)
- **Infrastructure budget is limited**
- **Rapid iteration** is more important than independent deployment
- **First version** of the product

---

## Service Boundaries

### Domain-Driven Design (DDD) Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Bounded Contexts                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Identity │  │ Catalog  │  │ Ordering │  │ Billing  │   │
│  │ Context  │  │ Context  │  │ Context  │  │ Context  │   │
│  │          │  │          │  │          │  │          │   │
│  │ - Users  │  │ - Products│  │ - Orders │  │ - Invoices│  │
│  │ - Auth   │  │ - Categories│ │ - Cart  │  │ - Payments│  │
│  │ - Roles  │  │ - Inventory│  │ - Ship. │  │ - Subscr.│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Service Design Principles

1. **Single Responsibility**: Each service owns one business capability
2. **Database per Service**: Each service owns its data
3. **API-First**: Services communicate through well-defined APIs
4. **Event-Driven**: Use events for cross-service communication
5. **Independently Deployable**: No coordination needed for deployment

---

## Communication Patterns

### Synchronous (HTTP/gRPC)

```
Service A → HTTP/gRPC → Service B
```

**Use for**:
- Request-response operations
- Real-time queries
- Operations requiring immediate response

**Implementation**:
- REST APIs for external communication
- gRPC for internal service-to-service
- Circuit breaker for resilience

### Asynchronous (Message Queue)

```
Service A → Message Queue → Service B
```

**Use for**:
- Fire-and-forget operations
- Event notification
- Long-running processes
- Decoupled communication

**Implementation**:
- RabbitMQ for enterprise message broker
- Redis Streams for lightweight messaging
- Kafka for high-throughput event streaming

### Event-Driven

```
Service A → Event Bus → Multiple Subscribers
```

**Use for**:
- Domain events (order created, payment received)
- Cross-service data synchronization
- Audit logging
- Notification triggers

---

## Service Communication in NestJS

### HTTP Client (Synchronous)

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly httpService: HttpService) {}

  async createOrder(dto: CreateOrderDto) {
    // Call Products service
    const product = await firstValueFrom(
      this.httpService.get(`http://products-service/api/products/${dto.productId}`)
    );

    // Call Inventory service
    await firstValueFrom(
      this.httpService.post('http://inventory-service/api/reservations', {
        productId: dto.productId,
        quantity: dto.quantity,
      })
    );

    // Create order
    return this.ordersRepository.create(dto);
  }
}
```

### gRPC (Synchronous, High Performance)

```typescript
// orders.proto
service OrdersService {
  rpc CreateOrder (CreateOrderRequest) returns (Order);
  rpc GetOrder (GetOrderRequest) returns (Order);
}

// orders.controller.ts
@Controller()
export class OrdersController {
  @GrpcMethod('OrdersService')
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    return this.ordersService.create(request);
  }
}
```

### Message Queue (Asynchronous)

```typescript
// Publisher
@Injectable()
export class OrdersService {
  constructor(
    @InjectQueue('orders') private readonly ordersQueue: Queue,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.ordersRepository.create(dto);
    
    // Publish event
    await this.ordersQueue.add('order.created', {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
    });

    return order;
  }
}

// Consumer (in another service)
@Processor('orders')
export class OrdersConsumer {
  @WorkerHandler('order.created')
  async handleOrderCreated(job: Job) {
    // Process order in another service
  }
}
```

---

## Data Management

### Database per Service

```
┌───────────┐    ┌───────────┐    ┌───────────┐
│  Orders   │    │  Products │    │  Billing  │
│  Service  │    │  Service  │    │  Service  │
└─────┬─────┘    └─────┬─────┘    └─────┬─────┘
      │                │                │
┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
│  Orders   │    │  Products │    │  Billing  │
│  Database │    │  Database │    │  Database │
└───────────┘    └───────────┘    └───────────┘
```

### Saga Pattern for Distributed Transactions

```typescript
// Order Saga
@Injectable()
export class OrderSaga {
  async execute(createOrderDto: CreateOrderDto) {
    // Step 1: Reserve inventory
    const reservation = await this.inventoryService.reserve({
      productId: createOrderDto.productId,
      quantity: createOrderDto.quantity,
    });

    try {
      // Step 2: Process payment
      const payment = await this.billingService.charge({
        customerId: createOrderDto.customerId,
        amount: createOrderDto.total,
      });

      try {
        // Step 3: Create order
        const order = await this.ordersService.create({
          ...createOrderDto,
          paymentId: payment.id,
        });

        return order;
      } catch (error) {
        // Compensate: Refund payment
        await this.billingService.refund(payment.id);
        throw error;
      }
    } catch (error) {
      // Compensate: Release inventory
      await this.inventoryService.release(reservation.id);
      throw error;
    }
  }
}
```

---

## Service Discovery

### DNS-Based

```
http://products-service.internal:3000/api/products
```

### Load Balancer-Based

```
http://api-gateway/products
```

### Environment Variable-Based

```env
PRODUCTS_SERVICE_URL=http://products-service:3000
INVENTORY_SERVICE_URL=http://inventory-service:3000
```

---

## API Gateway

### Responsibilities

- Request routing
- Authentication/Authorization
- Rate limiting
- Request/Response transformation
- Load balancing
- SSL termination
- CORS handling
- Request logging

### NestJS API Gateway

```typescript
@Controller('api')
export class GatewayController {
  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }
}
```

---

## Resilience Patterns

### Circuit Breaker

```typescript
@Injectable()
export class ProductsService {
  private circuitBreaker = new CircuitBreaker(this.fetchProduct.bind(this), {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });

  async getProduct(id: string) {
    return this.circuitBreaker.fire(id);
  }
}
```

### Retry with Exponential Backoff

```typescript
@Injectable()
export class ExternalService {
  async callExternalApi() {
    return retry(
      async () => this.httpService.get('https://api.external.com'),
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
      }
    );
  }
}
```

### Bulkhead

Isolate failures to prevent cascade:

```typescript
@Injectable()
export class ProductsService {
  private bulkhead = new Bulkhead(10, 100); // max 10 concurrent, 100 queued

  async getProduct(id: string) {
    return this.bulkhead.execute(() => this.fetchProduct(id));
  }
}
```

---

## Anti-Patterns

- **Distributed monolith**: Services tightly coupled, must deploy together
- **Shared database**: Multiple services sharing the same database
- **Synchronous chains**: Long synchronous call chains across services
- **Missing circuit breakers**: No resilience patterns for external calls
- **Missing retries**: No retry logic for transient failures
- **Over-microservicing**: Too many small services for a small team
- **Missing observability**: No distributed tracing across services
- **Missing API versioning**: Breaking changes without version management

---

## Verification Checklist

- [ ] Service boundaries defined by business capability
- [ ] Each service owns its database
- [ ] Communication patterns chosen (sync/async/events)
- [ ] API gateway configured
- [ ] Circuit breakers implemented for external calls
- [ ] Distributed tracing configured
- [ ] Health checks for each service
- [ ] Service discovery mechanism chosen
- [ ] Deployment strategy defined per service
- [ ] Monitoring and alerting per service
