# API Security

## Purpose

Define API security patterns for protecting REST, GraphQL, and gRPC interfaces.

**Last Verified**: June 2026

---

## Authentication

### Bearer Token

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ApiController {}
```

### API Key

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) throw new UnauthorizedException();
    
    return this.apiKeyService.validate(apiKey);
  }
}
```

---

## Authorization

### Resource Ownership

```typescript
async function verifyOwnership(userId: string, resourceId: string): Promise<boolean> {
  const resource = await this.repository.findById(resourceId);
  return resource?.userId === userId;
}
```

### Role-Based

```typescript
@Roles(Role.ADMIN)
@Delete(':id')
async delete(@Param('id') id: string) {
  return this.service.delete(id);
}
```

---

## Rate Limiting

### Per-Endpoint

```typescript
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api/users')
export class UsersController {}

@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() { ... }
```

### Per-User

```typescript
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    const key = `rate:${user.id}`;
    
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    
    return count <= 100;
  }
}
```

---

## Input Validation

### Request Validation

```typescript
@Injectable()
export class ValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten().fieldErrors);
    }
    return result.data;
  }
}
```

### File Upload Validation

```typescript
@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
    if (file.size > maxSize) {
      throw new BadRequestException('File too large');
    }

    return file;
  }
}
```

---

## Response Security

### Sanitize Output

```typescript
@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.sanitize(data)),
    );
  }

  private sanitize(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }
    if (data && typeof data === 'object') {
      const { password, token, secret, ...safe } = data;
      return safe;
    }
    return data;
  }
}
```

### Security Headers

```typescript
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
```

---

## SSRF Prevention

```typescript
import { isPrivateIp } from './utils/network';

@Injectable()
export class SsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { url } = context.switchToHttp().getRequest().body;
    
    if (url) {
      const parsed = new URL(url);
      if (isPrivateIp(parsed.hostname)) {
        throw new ForbiddenException('Private URLs not allowed');
      }
    }

    return true;
  }
}
```

---

## GraphQL Security

```typescript
// Query complexity limit
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 }),
      ],
    }),
  ],
});

// Depth limit
app.use(graphqlExpress({
  schema,
  validationRules: [depthLimit(10)],
}));
```

---

## Anti-Patterns

- **Missing authentication**: Always authenticate API requests
- **Missing input validation**: Validate all input
- **Exposing internal errors**: Hide error details in production
- **Missing rate limiting**: Always rate limit
- **CORS wildcard**: Use specific origins
- **Missing SSRF protection**: Validate URLs before fetching
- **Logging sensitive data**: Redact tokens and passwords

---

## Verification Checklist

- [ ] Authentication on all endpoints
- [ ] Authorization checks implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Output sanitization configured
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] SSRF prevention implemented
- [ ] File upload validation configured
