# API Design

## Purpose

Define API design standards for REST, GraphQL, and gRPC interfaces.

**Last Verified**: June 2026

---

## REST API Design

### URL Structure

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{sub-resource}
```

### HTTP Methods

| Method | Use | Idempotent | Safe |
|---|---|---|---|
| GET | Retrieve resource | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Delete resource | Yes | No |

### Status Codes

| Code | Meaning | Use |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Business logic error |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Unexpected error |

### Response Format

```json
// Success (single resource)
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "meta": {
    "requestId": "uuid"
  }
}

// Success (collection)
{
  "data": [
    { "id": "uuid", "name": "John Doe" },
    { "id": "uuid", "name": "Jane Doe" }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  },
  "meta": {
    "requestId": "uuid"
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Must be a valid email address"],
      "name": ["Required field"]
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

### Filtering

```
GET /api/v1/users?status=active&role=admin
GET /api/v1/orders?createdAfter=2026-01-01&total[gte]=100
```

### Sorting

```
GET /api/v1/users?sort=name:asc
GET /api/v1/orders?sort=createdAt:desc,total:asc
```

### Pagination

```
GET /api/v1/users?page=1&perPage=20
GET /api/v1/users?cursor=uuid&limit=20
```

### Field Selection

```
GET /api/v1/users?fields=id,name,email
GET /api/v1/users?include=orders,profile
```

---

## GraphQL Design

### Schema Structure

```graphql
type Query {
  user(id: ID!): User
  users(filter: UserFilter, pagination: PaginationInput): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  name: String!
  email: String!
  orders(first: Int, after: String): OrderConnection!
  createdAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
  password: String!
}

input UserFilter {
  status: UserStatus
  role: UserRole
  search: String
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

### DataLoader for N+1 Prevention

```typescript
@Injectable()
export class UserDataLoader {
  constructor(private readonly usersService: UsersService) {}

  create() {
    return new DataLoader<string, User>(async (ids) => {
      const users = await this.usersService.findByIds(ids);
      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    });
  }
}
```

---

## gRPC Design

### Proto Definition

```protobuf
syntax = "proto3";

package users;

service UsersService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (User);
  rpc UpdateUser (UpdateUserRequest) returns (User);
  rpc DeleteUser (DeleteUserRequest) returns (google.protobuf.Empty);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  string created_at = 4;
}

message GetUserRequest {
  string id = 1;
}

message ListUsersRequest {
  int32 page = 1;
  int32 per_page = 2;
  string filter = 3;
}
```

---

## Versioning

### URL Versioning (Recommended)

```
/api/v1/users
/api/v2/users
```

### Header Versioning

```
Accept: application/vnd.api.v1+json
```

### Versioning Strategy

- **v1**: Initial stable version
- **v2**: Breaking changes with migration path
- Support at least 2 major versions simultaneously
- Deprecate old versions with sunset headers

---

## Documentation

### OpenAPI 3.1

```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
paths:
  /api/v1/users:
    get:
      summary: List users
      operationId: listUsers
      tags: [Users]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: perPage
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserListResponse'
```

### NestJS OpenAPI

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('API')
  .setDescription('API documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Users', 'User management')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## Anti-Patterns

- **Inconsistent naming**: Use consistent plural nouns for resources
- **Verb in URL**: Use HTTP methods, not verbs in URLs
- **Missing versioning**: Always version your API
- **Missing pagination**: Always paginate collections
- **Missing error format**: Use consistent error response format
- **Over-fetching**: Use field selection to limit data
- **Under-fetching**: Use includes/GraphQL for related data
- **Missing rate limiting**: Always rate limit public APIs
- **Missing CORS**: Configure CORS properly
- **Exposing internal IDs**: Use UUIDs, not sequential IDs

---

## Verification Checklist

- [ ] RESTful URL structure
- [ ] Consistent HTTP methods
- [ ] Proper status codes
- [ ] Consistent response format
- [ ] Pagination implemented
- [ ] Filtering implemented
- [ ] Sorting implemented
- [ ] Versioning strategy defined
- [ ] OpenAPI documentation generated
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] Error format consistent
