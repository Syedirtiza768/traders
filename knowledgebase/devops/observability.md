# Observability

## Purpose

Define observability standards using OpenTelemetry, Grafana, and related tools.

**Last Verified**: June 2026

---

## Three Pillars

### Logs

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Structured logging
logger.info({
  userId: '123',
  action: 'create_order',
  orderId: '456',
  duration: 150,
}, 'Order created successfully');
```

### Metrics

```typescript
import { Counter, Histogram } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
```

### Traces

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('app');

async function createOrder(dto: CreateOrderDto) {
  return tracer.startActiveSpan('createOrder', async (span) => {
    try {
      span.setAttribute('userId', dto.userId);
      
      const order = await this.ordersRepository.create(dto);
      
      span.setAttribute('orderId', order.id);
      return order;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## OpenTelemetry Setup

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'my-app',
  traceExporter: new JaegerExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

---

## Grafana Stack

### Components

| Tool | Purpose |
|---|---|
| Grafana | Visualization and dashboards |
| Loki | Log aggregation |
| Prometheus | Metrics collection |
| Tempo | Distributed tracing |
| Alerting | Alert management |

### Docker Compose

```yaml
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  tempo:
    image: grafana/tempo:latest
    ports:
      - "3200:3200"
```

---

## Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION,
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  async ready() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    const allHealthy = checks.every(c => c.status === 'fulfilled');

    return {
      status: allHealthy ? 'ready' : 'degraded',
      checks: {
        database: checks[0].status === 'fulfilled' ? 'ok' : 'error',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'error',
      },
    };
  }
}
```

---

## Alerting

### Alert Rules

```yaml
# prometheus/rules.yml
groups:
  - name: app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
```

---

## Anti-Patterns

- **Missing structured logs**: Use JSON logging
- **Missing correlation IDs**: Include request IDs in logs
- **Logging sensitive data**: Redact PII and secrets
- **No alerting**: Configure alerts for critical metrics
- **Missing health checks**: Always implement health endpoints

---

## Verification Checklist

- [ ] Structured logging configured
- [ ] Metrics collected
- [ ] Distributed tracing configured
- [ ] Health checks implemented
- [ ] Dashboards configured
- [ ] Alerts configured
- [ ] Log retention policy defined
