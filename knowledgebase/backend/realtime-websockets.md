# Real-Time WebSockets

## Purpose

Define patterns for real-time communication using WebSockets and Server-Sent Events.

**Last Verified**: June 2026

---

## WebSocket Patterns

### NestJS Gateway

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Authenticate
    const token = client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = this.jwtService.verify(token);
      client.data.user = user;
      
      // Join user-specific room
      client.join(`user:${user.id}`);
      
      // Join tenant-specific room
      client.join(`tenant:${user.tenantId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Send to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Send to all users in tenant
  sendToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  // Broadcast to all
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
```

### Room-Based Messaging

```typescript
@Injectable()
export class ChatService {
  constructor(private readonly gateway: NotificationsGateway) {}

  async sendMessage(channelId: string, userId: string, message: string) {
    // Persist message
    const saved = await this.messageRepository.create({
      channelId,
      userId,
      message,
    });

    // Broadcast to channel room
    this.gateway.server.to(`channel:${channelId}`).emit('message', {
      id: saved.id,
      userId,
      message,
      timestamp: saved.createdAt,
    });

    return saved;
  }

  async joinChannel(client: Socket, channelId: string) {
    client.join(`channel:${channelId}`);
    
    // Notify channel members
    this.gateway.server.to(`channel:${channelId}`).emit('user-joined', {
      userId: client.data.user.id,
      channelId,
    });
  }
}
```

### Authentication Middleware

```typescript
@WebSocketGateway()
export class NotificationsGateway {
  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const payload = await this.jwtService.verify(token);
        socket.data.user = payload;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });
  }
}
```

---

## Server-Sent Events (SSE)

### When to Use SSE vs WebSockets

| Feature | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client | Bidirectional |
| Protocol | HTTP | WebSocket |
| Auto-reconnect | Built-in | Manual |
| Text only | Yes | Binary + Text |
| Connection limit | HTTP/1.1: 6 per domain | No limit |
| Use case | Notifications, feeds | Chat, gaming, collaboration |

### NestJS SSE

```typescript
@Controller('events')
export class EventsController {
  @Sse('stream')
  stream(@Query('userId') userId: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'notification')
      .pipe(
        filter((event: any) => event.userId === userId),
        map((event: any) => ({
          data: JSON.stringify(event),
          type: 'notification',
          id: event.id,
        })),
      );
  }
}
```

---

## Real-Time Patterns

### Presence System

```typescript
@Injectable()
export class PresenceService {
  private readonly presenceKey = 'presence:online';

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async userOnline(userId: string, socketId: string): Promise<void> {
    await this.redis.hset(this.presenceKey, userId, JSON.stringify({
      socketId,
      lastSeen: new Date().toISOString(),
    }));
    
    await this.redis.sadd(`user:${userId}:sockets`, socketId);
  }

  async userOffline(userId: string, socketId: string): Promise<void> {
    await this.redis.srem(`user:${userId}:sockets`, socketId);
    
    const remaining = await this.redis.scard(`user:${userId}:sockets`);
    if (remaining === 0) {
      await this.redis.hdel(this.presenceKey, userId);
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.scard(`user:${userId}:sockets`)) > 0;
  }

  async getOnlineUsers(): Promise<string[]> {
    return this.redis.hkeys(this.presenceKey);
  }
}
```

### Typing Indicators

```typescript
@SubscribeMessage('typing-start')
async handleTypingStart(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { channelId: string },
) {
  this.gateway.server.to(`channel:${data.channelId}`).emit('typing-start', {
    userId: client.data.user.id,
    channelId: data.channelId,
  });
}

@SubscribeMessage('typing-stop')
async handleTypingStop(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { channelId: string },
) {
  this.gateway.server.to(`channel:${data.channelId}`).emit('typing-stop', {
    userId: client.data.user.id,
    channelId: data.channelId,
  });
}
```

---

## Scaling WebSockets

### Redis Adapter for Multi-Instance

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

@Module({
  imports: [RedisModule],
})
export class NotificationsModule {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  configure(consumer: MiddlewareConsumer) {
    // Configure Redis adapter for Socket.IO
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();
    
    this.gateway.server.adapter(createAdapter(pubClient, subClient));
  }
}
```

---

## Anti-Patterns

- **No authentication**: Always authenticate WebSocket connections
- **No rate limiting**: Rate limit WebSocket messages
- **Broadcasting sensitive data**: Use rooms for targeted delivery
- **No heartbeat/ping**: Implement keep-alive mechanism
- **Storing state in memory**: Use Redis for multi-instance state
- **No reconnection handling**: Client should handle reconnection
- **Missing message validation**: Validate all incoming messages

---

## Verification Checklist

- [ ] WebSocket authentication implemented
- [ ] Room-based messaging configured
- [ ] Redis adapter for multi-instance scaling
- [ ] Presence system implemented (if needed)
- [ ] Rate limiting on WebSocket messages
- [ ] Message validation implemented
- [ ] Client reconnection handling
- [ ] Monitoring WebSocket connections
