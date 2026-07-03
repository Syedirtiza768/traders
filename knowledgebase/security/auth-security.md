# Authentication Security

## Purpose

Define secure authentication practices for enterprise applications.

**Last Verified**: June 2026

---

## Password Security

### Hashing

```typescript
import { hash, verify } from 'argon2';

// Configuration (OWASP recommended)
const argon2Options = {
  type: argon2id,      // Hybrid of Argon2i and Argon2d
  memoryCost: 65536,   // 64 MB
  timeCost: 3,         // 3 iterations
  parallelism: 4,      // 4 threads
};

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return hash(password, argon2Options);
}

// Verify password
export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return verify(hashed, password);
}
```

### Password Policy

```typescript
const passwordSchema = z.string()
  .min(8, 'Minimum 8 characters')
  .max(128, 'Maximum 128 characters')
  .regex(/[A-Z]/, 'Requires uppercase letter')
  .regex(/[a-z]/, 'Requires lowercase letter')
  .regex(/[0-9]/, 'Requires number')
  .regex(/[^A-Za-z0-9]/, 'Requires special character');
```

### Breach Detection

```typescript
import { pwnedPassword } from 'hibp';

async function isPasswordBreached(password: string): Promise<boolean> {
  const count = await pwnedPassword(password);
  return count > 0;
}
```

---

## Token Security

### JWT Best Practices

```typescript
// Short-lived access tokens
const accessToken = jwt.sign(
  { sub: userId, email, roles },
  JWT_SECRET,
  { algorithm: 'RS256', expiresIn: '15m' }
);

// Refresh token rotation
async function rotateRefreshToken(oldToken: string): Promise<TokenPair> {
  const payload = jwt.verify(oldToken, JWT_SECRET);
  
  // Invalidate old token
  await refreshTokens.invalidate(oldToken);
  
  // Issue new pair
  return issueTokenPair(payload.sub);
}
```

### Token Storage

```typescript
// Web: httpOnly cookies
cookies.set('refresh_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
  path: '/api/auth/refresh',
});

// Mobile: Secure storage (Keychain/Keystore)
```

---

## MFA Security

### TOTP Implementation

```typescript
import { authenticator } from 'otplib';

// Generate secret
const secret = authenticator.generateSecret();

// Generate token (client-side)
const token = authenticator.generate(secret);

// Verify token (server-side)
const isValid = authenticator.verify({ token, secret });
```

### Backup Codes

```typescript
function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}
```

---

## Session Security

### Configuration

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: '__session',
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN,
  },
  resave: false,
  saveUninitialized: false,
}));
```

### Session Invalidation

```typescript
// Invalidate all user sessions
async function invalidateAllSessions(userId: string): Promise<void> {
  await redis.del(`sessions:${userId}`);
}

// Invalidate on password change
async function changePassword(userId: string, newPassword: string): Promise<void> {
  await users.updatePassword(userId, await hashPassword(newPassword));
  await invalidateAllSessions(userId);
}
```

---

## Anti-Patterns

- **MD5/SHA1 for passwords**: Use Argon2/bcrypt
- **Long-lived access tokens**: Use 15-minute expiry
- **No token rotation**: Rotate refresh tokens on use
- **Missing rate limiting**: Always rate limit login
- **Revealing user existence**: Use generic error messages
- **Storing tokens in localStorage**: Use httpOnly cookies
- **No MFA for sensitive ops**: Require MFA for admin actions
- **Missing session invalidation**: Invalidate on password change

---

## Verification Checklist

- [ ] Password hashing with Argon2id
- [ ] Password policy enforced
- [ ] Breach detection integrated
- [ ] Short-lived access tokens (15 min)
- [ ] Refresh token rotation
- [ ] Token invalidation on logout
- [ ] Rate limiting on login (5 attempts/15 min)
- [ ] Generic error messages
- [ ] MFA available
- [ ] Session management secure
