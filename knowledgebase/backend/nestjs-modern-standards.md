# NestJS Modern Standards

## Purpose

Define modern NestJS v11 patterns for building enterprise-grade backend applications.

**Last Verified**: June 2026
**NestJS Version**: v11.x

---

## Project Structure

### Recommended Structure

```
src/
  app.module.ts                    # Root module
  
  common/                          # Shared across modules
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
      tenant.decorator.ts
    dto/
      pagination.dto.ts
      api-response.dto.ts
    filters/
      all-exceptions.filter.ts
      http-exception.filter.ts
    guards/
      auth.guard.ts
      roles.guard.ts
      throttler.guard.ts
    interceptors/
      logging.interceptor.ts
      transform.interceptor.ts
      cache.interceptor.ts
      timeout.interceptor.ts
    pipes/
      parse-uuid.pipe.ts
      validation.pipe.ts
    utils/
      hash.util.ts
      date.util.ts

  config/
    app.config.ts
    database.config.ts
    redis.config.ts
    jwt.config.ts
    queue.config.ts

  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/
        jwt.strategy.ts
        local.strategy.ts
      dto/
        login.dto.ts
        register.dto.ts
      guards/
        local-auth.guard.ts
      __tests__/
        auth.service.spec.ts

    users/
      users.module.ts
      users.controller.ts
      users.service.ts
      users.repository.ts
      entities/
        user.entity.ts
      dto/
        create-user.dto.ts
        update-user.dto.ts
      __tests__/
        users.service.spec.ts

    # ... more modules
```

---

## Module Patterns

### Feature Module

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```

### Dynamic Module

```typescript
@Module({})
export class RedisModule {
  static forRoot(options: RedisOptions): DynamicModule {
    return {
      module: RedisModule,
      global: true,
      providers: [
        {
          provide: REDIS_CLIENT,
          useFactory: () => new Redis(options),
        },
      ],
      exports: [REDIS_CLIENT],
    };
  }
}
```

### Async Module

```typescript
@Module({})
export class DatabaseModule {
  static forRootAsync(options: DatabaseAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: options.imports || [],
      providers: [
        {
          provide: DATABASE_CONNECTION,
          useFactory: async (...args) => {
            const config = await options.useFactory(...args);
            return createConnection(config);
          },
          inject: options.inject || [],
        },
      ],
      exports: [DATABASE_CONNECTION],
    };
  }
}
```

---

## Controller Patterns

### RESTful Controller

```typescript
@Controller('users')
@UseGuards(AuthGuard)
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user' })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  async findAll(@Query() query: PaginationDto): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

### Versioned Controller

```typescript
@Controller({ version: '1', path: 'users' })
export class UsersControllerV1 { ... }

@Controller({ version: '2', path: 'users' })
export class UsersControllerV2 { ... }
```

---

## Service Patterns

### Standard Service

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const user = await this.usersRepository.create({
      ...dto,
      password: await hash(dto.password),
    });

    this.eventEmitter.emit('user.created', new UserCreatedEvent(user));

    return user;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
```

### Transactional Service

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { ...dto, status: 'PENDING' },
      });

      await tx.inventory.update({
        where: { productId: dto.productId },
        data: { quantity: { decrement: dto.quantity } },
      });

      await tx.auditLog.create({
        data: { action: 'ORDER_CREATED', entityId: order.id },
      });

      return order;
    });
  }
}
```

---

## Dependency Injection

### Constructor Injection

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
  ) {}
}
```

### Property Injection

```typescript
@Injectable()
export class UsersService {
  @Inject(UsersRepository)
  private readonly usersRepository: UsersRepository;
}
```

### Custom Provider

```typescript
// Value provider
{
  provide: 'APP_CONFIG',
  useValue: { apiUrl: 'https://api.example.com' },
}

// Factory provider
{
  provide: 'ASYNC_CONFIG',
  useFactory: async (configService: ConfigService) => {
    return configService.get('database');
  },
  inject: [ConfigService],
}

// Class provider
{
  provide: UsersRepository,
  useClass: PrismaUsersRepository,
}

// Existing provider
{
  provide: 'ALIAS',
  useExisting: UsersService,
}
```

---

## Guards

### JWT Authentication Guard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Roles Guard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Throttler Guard

```typescript
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    return req.ips.length ? req.ips[0] : req.ip;
  }
}
```

---

## Interceptors

### Transform Interceptor

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: context.switchToHttp().getRequest().headers['x-request-id'],
        },
      })),
    );
  }
}
```

### Logging Interceptor

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(`${method} ${url} ${response.statusCode} ${Date.now() - now}ms`);
      }),
    );
  }
}
```

---

## Exception Filters

### Global Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

---

## Pipes

### Global Validation Pipe

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

### Custom Pipe

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('Invalid ID format');
    }
    return value;
  }
}
```

---

## Configuration

### Config Module

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      load: [appConfig, databaseConfig, jwtConfig],
    }),
  ],
})
export class AppModule {}
```

### Config Validation with Zod

```typescript
// config/app.config.ts
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
}));

// config/validation.ts
export function validateConfig(config: Record<string, unknown>) {
  const schema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRATION: z.string().default('15m'),
    REDIS_URL: z.string().url(),
  });

  return schema.parse(config);
}
```

---

## Health Checks

```typescript
@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: 'pretty',
    }),
  ],
})
export class HealthModule {}

@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
```

---

## Anti-Patterns

- **Fat controllers**: Keep controllers thin, delegate to services
- **Business logic in DTOs**: DTOs are for data transfer only
- **Missing validation**: Always validate input with pipes
- **Global state**: Use dependency injection, not global variables
- **Synchronous operations in controllers**: Use async/await
- **Missing error handling**: Use exception filters
- **Over-using decorators**: Keep decorators focused
- **Circular module dependencies**: Use forwardRef() sparingly

---

## Verification Checklist

- [ ] Modules organized by feature
- [ ] Controllers are thin (delegate to services)
- [ ] Services contain business logic
- [ ] DTOs validated with pipes
- [ ] Guards handle auth/authz
- [ ] Interceptors for cross-cutting concerns
- [ ] Exception filters for error handling
- [ ] Configuration validated with schema
- [ ] Health checks implemented
- [ ] OpenAPI documentation generated
