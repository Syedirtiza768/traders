# Infrastructure Security

## Purpose

Define infrastructure security practices for production deployments.

**Last Verified**: June 2026

---

## Network Security

### Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### VPC Configuration

```
Internet → Load Balancer (Public Subnet) → App Servers (Private Subnet) → Database (Private Subnet)
```

---

## Container Security

### Dockerfile Best Practices

```dockerfile
# Use specific versions
FROM node:24-slim AS builder

# Run as non-root
RUN addgroup --system app && adduser --system --group app

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:24-slim
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules

USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Container Scanning

```bash
# Trivy
trivy image myapp:latest

# Snyk
snyk container test myapp:latest
```

---

## TLS Configuration

### Nginx

```nginx
server {
    listen 443 ssl http2;
    
    ssl_certificate /etc/ssl/certs/site.crt;
    ssl_certificate_key /etc/ssl/private/site.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## Secrets Management

### Environment Variables

```bash
# .env.example (committed)
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=change-me

# .env (not committed)
DATABASE_URL=postgresql://prod_user:strong_password@db:5432/prod_db
JWT_SECRET=very-long-random-secret-at-least-32-chars
```

### AWS Secrets Manager

```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(name: string): Promise<Record<string, string>> {
  const response = await client.getSecretValue({ SecretId: name });
  return JSON.parse(response.SecretString);
}
```

---

## Monitoring and Alerting

### Security Monitoring

```typescript
// Alert on suspicious activity
@Injectable()
export class SecurityMonitor {
  async checkSuspiciousActivity(userId: string, ip: string): Promise<void> {
    const recentFailures = await this.getLoginFailures(userId, '15m');
    
    if (recentFailures >= 5) {
      await this.alertService.send({
        level: 'high',
        message: `Multiple login failures for user ${userId} from IP ${ip}`,
      });
    }
  }
}
```

---

## Backup Security

- Encrypt backups at rest
- Store encryption keys separately from backups
- Test restore procedures regularly
- Implement backup retention policies

---

## Anti-Patterns

- **Running as root**: Use non-root user in containers
- **Exposing unnecessary ports**: Minimize attack surface
- **Hard-coded secrets**: Use environment variables
- **Missing TLS**: Always use HTTPS in production
- **Unencrypted backups**: Encrypt all backups
- **Missing monitoring**: Monitor for security events

---

## Verification Checklist

- [ ] Firewall configured
- [ ] VPC/network security configured
- [ ] Containers run as non-root
- [ ] Container images scanned
- [ ] TLS configured properly
- [ ] Secrets in secure storage
- [ ] Security monitoring configured
- [ ] Backups encrypted
- [ ] Access logs enabled
