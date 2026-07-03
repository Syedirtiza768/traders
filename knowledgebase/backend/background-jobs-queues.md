# Background Jobs and Queues

## Purpose

Define patterns for background job processing and message queue systems.

**Last Verified**: June 2026
**BullMQ Version**: v5.66+

---

## BullMQ with NestJS

### Module Setup

```typescript
// queue.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'notifications' },
      { name: 'reports' },
      { name: 'file-processing' },
    ),
  ],
})
export class QueueModule {}
```

### Job Producer

```typescript
@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string): Promise<void> {
    await this.emailQueue.add('welcome', {
      userId,
      template: 'welcome',
    }, {
      priority: 1,
    });
  }

  async sendBulkEmails(userIds: string[]): Promise<void> {
    const jobs = userIds.map(id => ({
      name: 'bulk-email',
      data: { userId: id, template: 'newsletter' },
    }));

    await this.emailQueue.addBulk(jobs);
  }

  async scheduleReport(userId: string, reportType: string): Promise<void> {
    await this.emailQueue.add('scheduled-report', {
      userId,
      reportType,
    }, {
      delay: 0, // Immediate
      repeat: {
        pattern: '0 9 * * 1', // Every Monday at 9am
      },
    });
  }
}
```

### Job Consumer (Processor)

```typescript
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  @WorkerHandler('welcome')
  async handleWelcome(job: Job<{ userId: string }>) {
    this.logger.log(`Processing welcome email for user ${job.data.userId}`);
    
    const user = await this.userService.findById(job.data.userId);
    await this.mailService.send({
      to: user.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: { name: user.name },
    });

    return { sent: true, email: user.email };
  }

  @WorkerHandler('bulk-email')
  async handleBulkEmail(job: Job<{ userId: string; template: string }>) {
    // Process individual bulk email
  }

  @WorkerHandler('scheduled-report')
  async handleScheduledReport(job: Job<{ userId: string; reportType: string }>) {
    // Generate and send report
  }
}
```

### Flow Producer (Job Chains)

```typescript
@Injectable()
export class ReportService {
  constructor(private readonly flowProducer: FlowProducer) {}

  async generateReport(userId: string, reportType: string): Promise<void> {
    await this.flowProducer.add({
      name: 'generate-report',
      queueName: 'reports',
      data: { userId, reportType },
      children: [
        {
          name: 'fetch-data',
          queueName: 'reports',
          data: { userId, reportType },
        },
        {
          name: 'process-data',
          queueName: 'reports',
          data: { userId, reportType },
          opts: { priority: 1 },
        },
      ],
    });
  }
}
```

---

## Job Patterns

### Retry with Backoff

```typescript
await queue.add('unreliable-task', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
});
```

### Delayed Jobs

```typescript
await queue.add('send-reminder', data, {
  delay: 24 * 60 * 60 * 1000, // 24 hours
});
```

### Rate Limiting

```typescript
const queue = new Queue('api-calls', {
  connection: redis,
  limiter: {
    max: 100,
    duration: 60000, // 100 jobs per minute
  },
});
```

### Priority Jobs

```typescript
await queue.add('urgent-notification', data, { priority: 1 });
await queue.add('normal-notification', data, { priority: 5 });
await queue.add('low-priority-task', data, { priority: 10 });
```

### Scheduled/Recurring Jobs

```typescript
await queue.add('cleanup', {}, {
  repeat: {
    pattern: '0 0 * * *', // Every day at midnight
  },
});

await queue.add('sync', {}, {
  repeat: {
    every: 60000, // Every minute
  },
});
```

---

## Job Monitoring

### Queue Events

```typescript
@Processor('email')
export class EmailProcessor extends WorkerHost {
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.warn(`Job ${job.id} stalled`);
  }
}
```

### Bull Board (Dashboard)

```typescript
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/bullmq';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: 'email', adapter: BullMQAdapter },
      { name: 'reports', adapter: BullMQAdapter },
    ),
  ],
})
export class MonitoringModule {}
```

---

## Job Best Practices

### Idempotent Jobs

```typescript
@WorkerHandler('process-payment')
async handlePayment(job: Job<{ paymentId: string }>) {
  // Check if already processed
  const payment = await this.paymentRepo.findById(job.data.paymentId);
  if (payment.status === 'COMPLETED') {
    this.logger.log(`Payment ${job.data.paymentId} already processed, skipping`);
    return { skipped: true };
  }

  // Process payment
  await this.processPayment(payment);
  return { processed: true };
}
```

### Job Timeouts

```typescript
await queue.add('long-task', data, {
  timeout: 300000, // 5 minutes
});
```

### Manual Acknowledgment

```typescript
@WorkerHandler('critical-task')
async handleCriticalTask(job: Job) {
  try {
    await this.processTask(job.data);
    // Job is automatically marked as completed
  } catch (error) {
    // Job is automatically marked as failed and may be retried
    throw error;
  }
}
```

---

## Alternative Queue Systems

### When to Use Each

| System | Use Case | Complexity |
|---|---|---|
| BullMQ | Standard background jobs, NestJS integration | Low |
| Temporal | Complex workflows, durable execution | High |
| AWS SQS | Serverless, managed infrastructure | Medium |
| RabbitMQ | Enterprise message broker, complex routing | High |
| Redis Streams | Lightweight event streaming | Medium |
| Kafka | High-throughput event streaming | High |

---

## Anti-Patterns

- **Non-idempotent jobs**: Jobs should handle duplicate execution
- **Missing retry logic**: Always configure retries for transient failures
- **Missing job timeouts**: Always set timeouts to prevent hung jobs
- **Large job payloads**: Keep payloads small, store data externally
- **Synchronous job processing**: Jobs should not block the main thread
- **Missing monitoring**: Monitor queue health and job failures
- **Missing dead letter queue**: Configure DLQ for permanently failed jobs

---

## Verification Checklist

- [ ] Queue module configured with Redis
- [ ] Job producers in services
- [ ] Job consumers (processors) implemented
- [ ] Retry logic configured with backoff
- [ ] Job timeouts configured
- [ ] Idempotent job handlers
- [ ] Queue monitoring configured
- [ ] Dead letter queue configured
- [ ] Job logging implemented
- [ ] Queue dashboard available (Bull Board)
