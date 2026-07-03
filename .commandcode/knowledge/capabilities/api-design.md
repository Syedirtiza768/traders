# API Design

## Purpose

Design APIs that are usable, maintainable, evolvable, and performant while meeting the needs of diverse clients and use cases.

## Inputs

- Client requirements
- Data models
- Use cases
- Performance requirements
- Security requirements
- Versioning needs

## Expected Outputs

- API specification
- Endpoint definitions
- Data schemas
- Error handling strategy
- Versioning strategy
- Documentation

## Decision Process

### 1. API Style Selection

**Style Comparison**

| Style | Best For | Characteristics |
|-------|----------|-----------------|
| REST | CRUD operations, resources | HTTP methods, stateless, cacheable |
| GraphQL | Flexible queries, multiple clients | Schema, single endpoint, client-driven |
| gRPC | Internal services, high performance | Binary, streaming, strongly typed |
| WebSocket | Real-time, bidirectional | Persistent connection, event-driven |

**Decision Tree**:
```
What is the primary use case?
├── CRUD operations on resources?
│   └── REST
│
├── Flexible queries from multiple clients?
│   └── GraphQL
│
├── High-performance internal communication?
│   └── gRPC
│
└── Real-time bidirectional communication?
    └── WebSocket
```

### 2. REST API Design

**Resource Modeling**

Identify resources as nouns:
```
Resources:
├── /users
├── /orders
├── /products
├── /customers
└── /invoices
```

**URL Design**

| Operation | Method | URL |
|-----------|--------|-----|
| List resources | GET | /resources |
| Create resource | POST | /resources |
| Get resource | GET | /resources/{id} |
| Update resource | PUT/PATCH | /resources/{id} |
| Delete resource | DELETE | /resources/{id} |

**Relationships**:
```
Parent-child:
GET /customers/{id}/orders
POST /customers/{id}/orders

Nested resources:
GET /orders/{id}/items
GET /orders/{id}/items/{itemId}
```

**HTTP Methods**

| Method | Safe | Idempotent | Use |
|--------|------|------------|-----|
| GET | Yes | Yes | Retrieve |
| POST | No | No | Create |
| PUT | No | Yes | Replace |
| PATCH | No | Yes | Partial update |
| DELETE | No | Yes | Delete |

**Status Codes**

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Conflict with state |
| 422 | Unprocessable | Validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Unexpected error |

### 3. Request/Response Design

**Request Format**
```
POST /orders
Content-Type: application/json

{
  "customerId": "cust_123",
  "items": [
    { "productId": "prod_456", "quantity": 2 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Boston",
    "zip": "02101"
  }
}
```

**Response Format**
```
201 Created
Location: /orders/order_789
Content-Type: application/json

{
  "id": "order_789",
  "customerId": "cust_123",
  "items": [
    { 
      "productId": "prod_456", 
      "quantity": 2,
      "price": 29.99
    }
  ],
  "total": 59.98,
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Pagination**
```
Request:
GET /orders?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

Cursor-based:
GET /orders?cursor=abc123&limit=20
{
  "data": [...],
  "nextCursor": "def456",
  "hasMore": true
}
```

**Filtering and Sorting**
```
GET /orders?status=pending&createdAfter=2024-01-01&sort=-createdAt

Query parameters:
├── status: Filter by status
├── createdAfter: Filter by date
└── sort: -createdAt (descending)
```

**Field Selection**
```
GET /orders?fields=id,status,total

Response:
{
  "data": [
    { "id": "order_1", "status": "pending", "total": 100 },
    { "id": "order_2", "status": "completed", "total": 200 }
  ]
}
```

### 4. Error Handling

**Error Response Format**
```
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "items[0].quantity",
        "message": "Quantity must be greater than 0"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error Categories**

| Category | HTTP Code | Example |
|----------|-----------|---------|
| Validation | 400, 422 | Invalid input |
| Authentication | 401 | Missing token |
| Authorization | 403 | Insufficient permissions |
| Not Found | 404 | Resource missing |
| Conflict | 409 | Duplicate resource |
| Rate Limit | 429 | Too many requests |
| Server | 500 | Unexpected error |

### 5. Versioning

**Versioning Strategies**

| Strategy | Example | Pros | Cons |
|----------|---------|------|------|
| URL path | /v1/orders | Clear, cacheable | URL changes |
| Header | Accept: application/vnd.api.v1+json | Clean URLs | Less visible |
| Query param | /orders?v=1 | Simple | Not RESTful |

**Backward Compatibility Rules**

| Change | Compatible? | Action |
|--------|-------------|--------|
| Add endpoint | Yes | Deploy |
| Add optional field | Yes | Deploy |
| Add optional parameter | Yes | Deploy |
| Remove field | No | Version bump |
| Change field type | No | Version bump |
| Make optional required | No | Version bump |

**Version Lifecycle**
```
v1 released
    ↓
v2 released (v1 deprecated)
    ↓
v1 sunset period (6 months)
    ↓
v1 removed
```

### 6. GraphQL Design

**Schema Definition**
```graphql
type Query {
  order(id: ID!): Order
  orders(filter: OrderFilter, limit: Int): [Order!]!
}

type Mutation {
  createOrder(input: CreateOrderInput!): Order!
  updateOrder(id: ID!, input: UpdateOrderInput!): Order!
}

type Order {
  id: ID!
  customer: Customer!
  items: [OrderItem!]!
  total: Money!
  status: OrderStatus!
  createdAt: DateTime!
}

input CreateOrderInput {
  customerId: ID!
  items: [OrderItemInput!]!
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}
```

**Best Practices**
- Use non-null by default
- Provide meaningful descriptions
- Use connections for lists
- Implement pagination
- Handle errors in schema

### 7. gRPC Design

**Protocol Buffer Definition**
```protobuf
syntax = "proto3";

package orders;

service OrderService {
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc StreamOrders(StreamOrdersRequest) returns (stream Order);
}

message Order {
  string id = 1;
  string customer_id = 2;
  repeated OrderItem items = 3;
  string status = 4;
  int64 created_at = 5;
}

message GetOrderRequest {
  string id = 1;
}
```

**Best Practices**
- Use meaningful service and method names
- Version proto files
- Handle errors with status codes
- Use streaming for real-time data

### 8. Security

**Authentication**

| Method | Use Case | Implementation |
|--------|----------|----------------|
| API Key | Server-to-server | Header: X-API-Key |
| OAuth 2.0 | User authorization | Bearer token |
| JWT | Stateless auth | Bearer token |
| mTLS | Service-to-service | Client certificates |

**Authorization**
```
Role-Based Access Control (RBAC):
├── Admin: Full access
├── Manager: Read/write own resources
└── User: Read own resources

Scope-Based:
├── orders:read
├── orders:write
└── orders:delete
```

**Rate Limiting**
```
Rate Limit Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567

Rate Limit Response (429):
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

### 9. Documentation

**OpenAPI Specification**
```yaml
openapi: 3.0.0
info:
  title: Order API
  version: 1.0.0
paths:
  /orders:
    get:
      summary: List orders
      parameters:
        - name: status
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of orders
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderList'
```

**Documentation Requirements**
- All endpoints documented
- Request/response examples
- Error responses
- Authentication requirements
- Rate limits

## Evaluation Criteria

### API Quality Scorecard

| Aspect | 1 (Poor) | 3 (Adequate) | 5 (Excellent) |
|--------|-----------|--------------|---------------|
| Consistency | Inconsistent | Mostly consistent | Fully consistent |
| Documentation | Missing | Basic | Comprehensive |
| Error handling | Generic | Specific codes | Detailed errors |
| Versioning | None | Basic | Full lifecycle |
| Security | Minimal | Basic auth | OAuth, rate limiting |

## Trade-offs

### REST vs GraphQL

| Aspect | REST | GraphQL |
|--------|------|---------|
| Flexibility | Fixed endpoints | Client-driven queries |
| Caching | HTTP caching | Custom caching |
| Learning curve | Lower | Higher |
| Over-fetching | Common | Avoided |

### Granularity

| Granularity | Pros | Cons |
|-------------|------|------|
| Fine-grained | Flexible | Many requests |
| Coarse-grained | Fewer requests | Over-fetching |

**Guidance**: Design for common use cases, allow flexibility

## Validation Checklist

- [ ] API style matches use case
- [ ] Resources are properly modeled
- [ ] HTTP methods used correctly
- [ ] Status codes are appropriate
- [ ] Error handling is comprehensive
- [ ] Versioning strategy is defined
- [ ] Security is implemented
- [ ] Rate limiting is configured
- [ ] Documentation is complete
- [ ] Backward compatibility is maintained

## Common Pitfalls

1. **Inconsistent naming**: Different conventions across endpoints
2. **Poor error messages**: Generic errors without details
3. **No versioning**: Breaking changes without migration
4. **Over-fetching**: Returning too much data
5. **Under-fetching**: Requiring multiple requests
6. **No documentation**: Undocumented APIs
7. **Ignoring caching**: Not using HTTP caching
8. **No rate limiting**: Vulnerable to abuse

## References

- Building Microservices (Newman)
- Microservices Patterns (Richardson)
- Enterprise Integration Patterns (Hohpe, Woolf)
- API Design Patterns (Joyce)

## Related Capabilities

- Integration Strategy
- Microservice Design
- Security Review
- System Design
