# Authentication and Authorization

## Purpose

Define authentication and authorization patterns for enterprise applications.

**Last Verified**: June 2026

---

## Authentication Patterns

### JWT Authentication

**Access Token + Refresh Token Pattern**

```
Login → Access Token (15min) + Refresh Token (7 days)
Request → Bearer Access Token → Validate → Process
Refresh → Refresh Token → New Access Token + New Refresh Token
```

**Implementation**

```typescript
// JWT Strategy
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      tenantId: payload.tenantId,
    };
  }
}

// Auth Service
@Injectable()
export class AuthService {
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);
    
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    
    await this.refreshTokenRepository.save({
      token: await hash(refreshToken),
      userId: user.id,
      expiresAt: addDays(new Date(), 7),
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);
    const storedToken = await this.refreshTokenRepository.findValid(payload.sub);
    
    if (!storedToken || !await compare(refreshToken, storedToken.token)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate refresh token
    await this.refreshTokenRepository.invalidate(storedToken.id);
    
    const user = await this.usersService.findById(payload.sub);
    return this.login(user); // Generate new token pair
  }

  private generateAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      tenantId: user.tenantId,
    }, { expiresIn: '15m' });
  }

  private generateRefreshToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      type: 'refresh',
    }, { expiresIn: '7d' });
  }
}
```

### Session-Based Authentication

```typescript
// For SSR applications (Next.js)
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
```

---

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
// Role definitions
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer',
}

// Role hierarchy
export const roleHierarchy: Record<Role, Role[]> = {
  [Role.SUPER_ADMIN]: [Role.ADMIN, Role.MANAGER, Role.USER, Role.VIEWER],
  [Role.ADMIN]: [Role.MANAGER, Role.USER, Role.VIEWER],
  [Role.MANAGER]: [Role.USER, Role.VIEWER],
  [Role.USER]: [Role.VIEWER],
  [Role.VIEWER]: [],
};

// Roles decorator
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Roles guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => 
      user.roles.includes(role) || 
      user.roles.some(userRole => roleHierarchy[userRole]?.includes(role))
    );
  }
}

// Usage
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {
  @Get('users')
  @Roles(Role.ADMIN)
  async getUsers() { ... }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN)
  async deleteUser(@Param('id') id: string) { ... }
}
```

### Attribute-Based Access Control (ABAC)

```typescript
// Policy definition
export interface Policy {
  subject: string;
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

// Policy engine
@Injectable()
export class PolicyEngine {
  private policies: Policy[] = [
    {
      subject: 'user',
      action: 'read',
      resource: 'user',
      conditions: { 'resource.id': '$subject.id' }, // Can read own profile
    },
    {
      subject: 'admin',
      action: 'manage',
      resource: 'user', // Can manage all users
    },
  ];

  evaluate(subject: any, action: string, resource: any): boolean {
    return this.policies.some(policy => 
      this.matchPolicy(policy, subject, action, resource)
    );
  }
}

// Guard
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly policyEngine: PolicyEngine) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const action = this.reflector.get<string>('action', context.getHandler());
    const resource = this.reflector.get<string>('resource', context.getHandler());

    return this.policyEngine.evaluate(request.user, action, {
      type: resource,
      ...request.params,
    });
  }
}
```

### Permission-Based Authorization

```typescript
// Permission definitions
export const PERMISSIONS = {
  users: {
    create: 'users:create',
    read: 'users:read',
    update: 'users:update',
    delete: 'users:delete',
  },
  orders: {
    create: 'orders:create',
    read: 'orders:read',
    update: 'orders:update',
    delete: 'orders:delete',
    approve: 'orders:approve',
  },
} as const;

// Role-permission mapping
export const rolePermissions: Record<Role, string[]> = {
  [Role.ADMIN]: Object.values(PERMISSIONS).flatMap(p => Object.values(p)),
  [Role.MANAGER]: [
    PERMISSIONS.users.read,
    PERMISSIONS.orders.create,
    PERMISSIONS.orders.read,
    PERMISSIONS.orders.update,
    PERMISSIONS.orders.approve,
  ],
  [Role.USER]: [
    PERMISSIONS.orders.create,
    PERMISSIONS.orders.read,
  ],
};

// Permission guard
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions = rolePermissions[user.role] || [];

    return requiredPermissions.every(p => userPermissions.includes(p));
  }
}
```

---

## Multi-Tenant Authentication

### JWT with Tenant Claims

```typescript
interface TenantJwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantRole: string;
  permissions: string[];
}

// Tenant-aware guard
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as TenantJwtPayload;
    
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    // Validate user belongs to requested tenant
    const requestedTenantId = request.params.tenantId || request.headers['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }

    return true;
  }
}
```

---

## Password Security

### Hashing with Argon2

```typescript
import { hash, verify } from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
```

### Password Policy

```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

---

## MFA (Multi-Factor Authentication)

### TOTP Implementation

```typescript
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  async generateSecret(userId: string): Promise<MfaSetupResult> {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(userId, 'MyApp', secret);
    
    await this.usersService.updateMfaSecret(userId, secret);
    
    return { secret, qrCode: await QRCode.toDataURL(otpauth) };
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    return authenticator.verify({ token, secret: user.mfaSecret });
  }

  async enableMfa(userId: string, token: string): Promise<boolean> {
    const isValid = await this.verifyToken(userId, token);
    if (!isValid) throw new BadRequestException('Invalid MFA token');
    
    await this.usersService.enableMfa(userId);
    return true;
  }
}
```

---

## OAuth2 / OpenID Connect

### Passport.js Integration

```typescript
// Google OAuth
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: GoogleProfile) {
    return this.authService.findOrCreateOAuthUser({
      provider: 'google',
      providerId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
    });
  }
}
```

---

## Anti-Patterns

- **Storing passwords in plain text**: Always hash passwords
- **Using MD5/SHA for passwords**: Use Argon2, bcrypt, or scrypt
- **Long-lived access tokens**: Use short-lived access tokens (15 min)
- **No token rotation**: Rotate refresh tokens on use
- **Missing rate limiting on auth endpoints**: Always rate limit login attempts
- **Exposing user existence**: Return same error for invalid email/password
- **Storing JWT in localStorage**: Use httpOnly cookies for web apps
- **No MFA for sensitive operations**: Require MFA for admin actions
- **Hard-coded secrets**: Use environment variables
- **Missing audit logging**: Log all authentication events

---

## Verification Checklist

- [ ] Password hashing with Argon2/bcrypt
- [ ] Short-lived access tokens (15 min)
- [ ] Refresh token rotation implemented
- [ ] Token invalidation on logout
- [ ] Rate limiting on login endpoint
- [ ] MFA available for sensitive operations
- [ ] RBAC/ABAC implemented
- [ ] Permission checks at guard and service level
- [ ] Audit logging for auth events
- [ ] Session management configured
