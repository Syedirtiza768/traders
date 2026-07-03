# Security Standards

## Purpose

Define comprehensive security standards for enterprise applications.

**Last Verified**: June 2026

---

## Security Principles

### Defense in Depth

Multiple layers of security controls. No single point of failure.

### Least Privilege

Grant minimum permissions required. Default deny.

### Zero Trust

Never trust, always verify. Authenticate and authorize every request.

### Secure by Default

Security enabled by default. Opt-in for less secure options.

---

## Authentication Security

### Password Hashing

```typescript
import { hash, verify } from 'argon2';

// Hash (argon2id recommended)
const hashed = await hash(password, {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

// Verify
const isValid = await verify(hashed, password);
```

### JWT Security

```typescript
// Short-lived access tokens (15 min)
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Refresh tokens with rotation
const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, secret, { expiresIn: '7d' });

// Store refresh token hash in database
await refreshTokens.create({
  token: await hash(refreshToken),
  userId,
  expiresAt: addDays(new Date(), 7),
});
```

### Session Security

```typescript
cookies.set('session', token, {
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // HTTPS only
  sameSite: 'lax',     // CSRF protection
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
});
```

---

## Authorization Security

### RBAC Implementation

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles.includes(role));
  }
}
```

### Permission Checks

```typescript
// Always check at service level, not just guard level
@Injectable()
export class OrdersService {
  async delete(orderId: string, userId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    
    if (!order) throw new NotFoundException();
    if (order.userId !== userId && !this.hasRole(userId, 'admin')) {
      throw new ForbiddenException();
    }

    await this.ordersRepository.delete(orderId);
  }
}
```

---

## Input Validation

### Zod Validation

```typescript
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: z.object({
    street: z.string().min(1).max(200),
    city: z.string().min(1).max(100),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/),
  }),
});

// Validate at API boundary
const validated = createOrderSchema.parse(req.body);
```

### Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML input
const clean = DOMPurify.sanitize(userInput);

// Escape SQL (use parameterized queries)
const users = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;
```

---

## Rate Limiting

### NestJS Throttler

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: 60000, limit: 100 },  // 100 requests per minute
        { ttl: 1000, limit: 10 },     // 10 requests per second
      ],
    }),
  ],
})
export class AppModule {}
```

### Custom Rate Limiting

```typescript
// Per-user rate limiting
@Injectable()
export class RateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `rate_limit:${request.user?.id || request.ip}`;
    
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 60);
    }

    if (current > 100) {
      throw new ThrottlerException();
    }

    return true;
  }
}
```

---

## Security Headers

### Helmet Configuration

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.API_URL],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## CORS Configuration

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});
```

---

## Secrets Management

### Environment Variables

```typescript
// Never commit secrets to version control
// Use .env files for local development
// Use secret managers for production

// AWS Secrets Manager
const secret = await secretsManager.getSecretValue({ SecretId: 'my-app/prod' }).promise();

// HashiCorp Vault
const secret = await vault.read('secret/data/my-app');
```

### Configuration Validation

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  // Never log these values
});
```

---

## Audit Logging

```typescript
@Injectable()
export class AuditService {
  async log(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: event.metadata,
      },
    });
  }
}
```

---

## Anti-Patterns

- **Storing passwords in plain text**: Always hash passwords
- **Using MD5/SHA1 for passwords**: Use Argon2/bcrypt
- **Long-lived tokens**: Use short-lived access tokens
- **Missing input validation**: Validate all input
- **SQL string concatenation**: Use parameterized queries
- **Exposing error details**: Hide internal errors in production
- **Missing security headers**: Use Helmet
- **Logging sensitive data**: Redact passwords, tokens, PII
- **Missing rate limiting**: Always rate limit auth endpoints
- **Storing secrets in code**: Use environment variables

---

## Verification Checklist

- [ ] Password hashing with Argon2
- [ ] Short-lived JWT access tokens (15 min)
- [ ] Refresh token rotation
- [ ] Input validation with Zod
- [ ] Rate limiting configured
- [ ] Security headers (Helmet)
- [ ] CORS configured
- [ ] Secrets in environment variables
- [ ] Audit logging implemented
- [ ] HTTPS enforced
