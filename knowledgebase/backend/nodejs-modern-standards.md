# Node.js Modern Standards

## Purpose

Define modern Node.js patterns for building production-grade backend applications.

**Last Verified**: June 2026
**Node.js Version**: v24 LTS (Krypton)

---

## Runtime Configuration

### Minimum Versions

| Requirement | Version | Reason |
|---|---|---|
| Node.js | v24 LTS | LTS, Next.js 16 requires 20.9+ |
| TypeScript | v6.x | Latest stable, v7.0 RC available |
| pnpm | v9+ | Recommended package manager |

### ES Modules

```json
// package.json
{
  "type": "module",
  "engines": {
    "node": ">=20.9.0"
  }
}
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Project Structure

```
src/
  index.ts                 # Entry point
  app.ts                   # Application setup
  
  config/
    index.ts               # Config exports
    app.config.ts
    database.config.ts
  
  modules/
    users/
      users.controller.ts
      users.service.ts
      users.repository.ts
  
  common/
    middleware/
    guards/
    filters/
    interceptors/
    utils/
  
  shared/
    database/
    cache/
    queue/

tests/
  unit/
  integration/
  e2e/
```

---

## Environment Variables

### Validation with Zod

```typescript
// config/env.validation.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
```

---

## Logging

### Pino (Recommended)

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  redact: ['req.headers.authorization', '*.password', '*.token'],
});
```

### Request Logging Middleware

```typescript
import { randomUUID } from 'crypto';

export function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  req.log = logger.child({ requestId: req.id });
  
  const start = Date.now();
  res.on('finish', () => {
    req.log.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Date.now() - start,
    });
  });
  
  next();
}
```

---

## Error Handling

### Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = 'INTERNAL_ERROR',
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly errors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

### Global Error Handler

```typescript
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.errors && { details: err.errors }),
      },
    });
  }

  // Unexpected error - log and return generic message
  logger.error({ err }, 'Unexpected error');
  
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
```

---

## Graceful Shutdown

```typescript
import { createTerminus } from '@godaddy/terminus';

async function onSignal() {
  logger.info('Server is starting cleanup');
  await prisma.$disconnect();
  await redis.quit();
  await closeQueues();
}

async function onHealthCheck() {
  await prisma.$queryRaw`SELECT 1`;
  return { status: 'ok' };
}

createTerminus(server, {
  signal: 'SIGTERM',
  healthChecks: { '/health': onHealthCheck },
  onSignal,
  onShutdown: () => logger.info('Cleanup finished, server is shutting down'),
  beforeShutdown: () => {
    // Wait for existing connections to drain
    return new Promise(resolve => setTimeout(resolve, 5000));
  },
});
```

---

## Process Management

### Cluster Mode

```typescript
import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  logger.info(`Primary ${process.pid} is running`);
  logger.info(`Forking ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    logger.warn(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  startServer();
  logger.info(`Worker ${process.pid} started`);
}
```

---

## Security Practices

### Helmet

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

### CORS

```typescript
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
}));
```

---

## Performance

### Compression

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

### Connection Pooling

```typescript
// Prisma with connection pooling
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pooling via pgBouncer or Supabase/Neon built-in
}
```

---

## Anti-Patterns

- **Synchronous operations in request handlers**: Use async/await
- **Missing error handling**: Always handle errors
- **Console.log in production**: Use structured logger (Pino)
- **Hard-coded configuration**: Use environment variables
- **Missing input validation**: Validate all input
- **Global state**: Use dependency injection
- **Missing graceful shutdown**: Handle SIGTERM properly
- **Blocking the event loop**: Use worker threads for CPU-intensive tasks

---

## Verification Checklist

- [ ] ES Modules configured
- [ ] TypeScript strict mode enabled
- [ ] Environment variables validated
- [ ] Structured logging configured
- [ ] Error handling centralized
- [ ] Graceful shutdown implemented
- [ ] Security headers configured
- [ ] CORS configured
- [ ] Rate limiting configured
- [ ] Health checks implemented
