# Backend Testing

## Purpose

Define backend testing patterns for NestJS and Node.js applications.

**Last Verified**: June 2026

---

## Unit Testing

### Service Tests

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: MockedObject<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useFactory: mockRepository },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
  });

  describe('create', () => {
    it('should create user', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw if email exists', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });
});
```

### Controller Tests

```typescript
describe('UsersController', () => {
  let controller: UsersController;
  let service: MockedObject<UsersService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useFactory: mockService }],
    }).compile();

    controller = module.get(UsersController);
    service = module.get(UsersService);
  });

  it('should return users', async () => {
    service.findAll.mockResolvedValue([mockUser]);

    const result = await controller.findAll();

    expect(result).toEqual([mockUser]);
  });
});
```

---

## Integration Testing

### Database Tests

```typescript
describe('UsersRepository (Integration)', () => {
  let repository: UsersRepository;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersRepository, PrismaService],
    }).compile();

    repository = module.get(UsersRepository);
    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should create and find user', async () => {
    const user = await repository.create({ email: 'test@example.com', name: 'Test' });
    const found = await repository.findByEmail('test@example.com');

    expect(found).toBeDefined();
    expect(found.email).toBe('test@example.com');
  });
});
```

### API Tests

```typescript
describe('Users API (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /users', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', name: 'Test' })
      .expect(201);

    expect(response.body.email).toBe('test@example.com');
  });
});
```

---

## Test Utilities

### Mock Factory

```typescript
export function createMock<T>(): MockedObject<T> {
  return {} as MockedObject<T>;
}

export function mockRepository<T>() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
```

### Test Data Factory

```typescript
export const createUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  ...overrides,
});

export const createOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order-1',
  userId: 'user-1',
  total: 100,
  status: 'PENDING',
  createdAt: new Date(),
  ...overrides,
});
```

---

## Anti-Patterns

- **Testing implementation details**: Test behavior
- **Shared test database**: Use isolated data
- **No cleanup**: Clean up after each test
- **Slow tests**: Mock external services
- **Flaky tests**: Fix or remove

---

## Verification Checklist

- [ ] Vitest configured
- [ ] Unit tests for services
- [ ] Unit tests for controllers
- [ ] Integration tests for repositories
- [ ] Integration tests for API endpoints
- [ ] Mock factories created
- [ ] Test data factories created
- [ ] Coverage thresholds set
