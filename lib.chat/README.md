# Chat Library

Real-time chat functionality and components.

## Documentation

See the centralized documentation: [docs/libraries/chat.md](../docs/libraries/chat.md)

## Installation

````bash
npm install @adopt-dont-shop/lib-chat
```p/lib-chat

Real-time chat and messaging functionality

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-chat

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-chat": "workspace:*"
  }
}
````

## 🚀 Quick Start

```typescript
import { ChatService, ChatServiceConfig } from '@adopt-dont-shop/lib-chat';

// Using the singleton instance
import { chatService } from '@adopt-dont-shop/lib-chat';

// Basic usage
const result = await chatService.exampleMethod({ test: 'data' });
console.log(result);

// Or create a custom instance
const config: ChatServiceConfig = {
  apiUrl: 'https://api.example.com',
  debug: true,
};

const customService = new ChatService(config);
const customResult = await customService.exampleMethod({ custom: 'data' });
```

## 🔧 Configuration

### ChatServiceConfig

| Property             | Type                           | Default                                  | Description                                      |
| -------------------- | ------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| `apiUrl`             | `string`                       | `/api`                                   | Base API URL for REST endpoints                  |
| `socketUrl`          | `string`                       | Same as `apiUrl`                         | WebSocket URL for Socket.IO connection           |
| `debug`              | `boolean`                      | `false`                                  | Enable debug logging                             |
| `headers`            | `Record<string, string>`       | `{}`                                     | Custom headers for REST requests                 |
| `reconnection`       | `Partial<ReconnectionConfig>`  | See below                                | Socket.IO reconnection configuration             |
| `enableMessageQueue` | `boolean`                      | `true`                                   | Enable message queuing during disconnection      |
| `maxQueueSize`       | `number`                       | `50`                                     | Maximum number of messages to queue              |

### ReconnectionConfig

| Property            | Type      | Default | Description                              |
| ------------------- | --------- | ------- | ---------------------------------------- |
| `enabled`           | `boolean` | `true`  | Enable automatic reconnection            |
| `initialDelay`      | `number`  | `1000`  | Initial delay in milliseconds            |
| `maxDelay`          | `number`  | `30000` | Maximum delay in milliseconds            |
| `maxAttempts`       | `number`  | `10`    | Maximum number of reconnection attempts  |
| `backoffMultiplier` | `number`  | `1.5`   | Exponential backoff multiplier           |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 🔌 Socket.IO Real-time Connection

The library provides full Socket.IO support for real-time chat functionality with automatic reconnection, message queuing, and connection status tracking.

### Basic Connection

```typescript
import { ChatService } from '@adopt-dont-shop/lib-chat';

const chatService = new ChatService({
  socketUrl: 'https://api.example.com',
  debug: true,
});

// Connect with authentication
chatService.connect(userId, authToken);

// Listen for connection status changes
chatService.onConnectionStatusChange((status) => {
  console.log('Connection status:', status);
  // status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
});

// Disconnect when done
chatService.disconnect();
```

### Reconnection with Exponential Backoff

The library automatically handles reconnection with configurable exponential backoff:

```typescript
const chatService = new ChatService({
  socketUrl: 'https://api.example.com',
  reconnection: {
    enabled: true,
    initialDelay: 1000,      // Start with 1 second
    maxDelay: 30000,         // Max 30 seconds
    maxAttempts: 10,         // Try 10 times
    backoffMultiplier: 1.5,  // Increase delay by 1.5x each attempt
  },
});

// Monitor reconnection attempts
chatService.onConnectionStatusChange((status) => {
  if (status === 'reconnecting') {
    const attempts = chatService.getReconnectionAttempts();
    console.log(`Reconnecting... (attempt ${attempts})`);
  }
});
```

### Message Queuing During Disconnection

Messages sent while disconnected are automatically queued and sent when connection is restored:

```typescript
const chatService = new ChatService({
  enableMessageQueue: true,
  maxQueueSize: 50,
});

// Messages are queued automatically when disconnected
await chatService.sendMessage(conversationId, 'Hello!');

// Check queued messages
const queuedMessages = chatService.getQueuedMessages();
console.log(`${queuedMessages.length} messages queued`);

// Clear queue if needed
chatService.clearMessageQueue();
```

### Real-time Event Handlers

```typescript
// Listen for new messages
chatService.onMessage((message) => {
  console.log('New message:', message);
  // message: { id, conversationId, senderId, content, timestamp, ... }
});

// Listen for typing indicators
chatService.onTyping((typing) => {
  console.log(`${typing.userName} is typing...`);
  // typing: { conversationId, userId, userName, startedAt }
});

// Listen for connection errors
chatService.onConnectionError((error) => {
  console.error('Connection error:', error);
});

// Remove event listeners
chatService.off('message');
chatService.off('typing');
```

### Connection Status Hook (React)

Use the provided hook to track connection status in React components:

```typescript
import { useConnectionStatus } from '@adopt-dont-shop/lib-chat';

function ChatComponent() {
  const {
    status,
    isConnected,
    isConnecting,
    isReconnecting,
    isDisconnected,
    hasError,
    reconnectionAttempts,
  } = useConnectionStatus(chatService);

  if (isReconnecting) {
    return (
      <Banner variant="warning">
        Reconnecting to chat... (attempt {reconnectionAttempts})
      </Banner>
    );
  }

  if (hasError) {
    return <Banner variant="error">Connection error. Please refresh.</Banner>;
  }

  if (!isConnected) {
    return <Banner variant="info">Connecting to chat...</Banner>;
  }

  return <ChatInterface />;
}
```

### Full Example

```typescript
import { ChatService, useConnectionStatus } from '@adopt-dont-shop/lib-chat';
import { useEffect, useState } from 'react';

// Initialize service
const chatService = new ChatService({
  socketUrl: process.env.VITE_SOCKET_URL,
  debug: process.env.NODE_ENV === 'development',
  reconnection: {
    enabled: true,
    initialDelay: 1000,
    maxDelay: 30000,
    maxAttempts: 10,
  },
  enableMessageQueue: true,
  maxQueueSize: 50,
});

function ChatApp() {
  const [messages, setMessages] = useState([]);
  const { isConnected, isReconnecting, reconnectionAttempts } =
    useConnectionStatus(chatService);

  useEffect(() => {
    // Connect to chat
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');

    if (token && userId) {
      chatService.connect(userId, token);
    }

    // Listen for new messages
    chatService.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Cleanup on unmount
    return () => {
      chatService.disconnect();
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    try {
      await chatService.sendMessage(conversationId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div>
      {isReconnecting && (
        <Banner>Reconnecting... (attempt {reconnectionAttempts})</Banner>
      )}

      <MessageList messages={messages} />

      <MessageInput
        onSend={handleSendMessage}
        disabled={!isConnected}
      />
    </div>
  );
}
```

### Testing with Network Interruptions

The Socket.IO implementation handles various network scenarios:

1. **Temporary disconnection**: Automatically reconnects with exponential backoff
2. **Extended outage**: Queues messages and sends when reconnected
3. **Authentication failure**: Emits error and stops reconnection
4. **Max attempts reached**: Stops reconnecting after configured attempts

```typescript
// Simulate network interruption (for testing)
chatService.simulateDisconnect();

// Simulate successful reconnection (for testing)
chatService.simulateReconnect();
```

## 📖 API Reference

### ChatService

#### Constructor

```typescript
new ChatService(config?: ChatServiceConfig)
```

#### Methods

##### `exampleMethod(data, options)`

Example method that demonstrates the library's capabilities.

```typescript
await service.exampleMethod(
  { key: 'value' },
  {
    timeout: 5000,
    useCache: true,
    metadata: { requestId: 'abc123' },
  }
);
```

**Parameters:**

- `data` (Record<string, unknown>): Input data
- `options` (ChatServiceOptions): Operation options

**Returns:** `Promise<BaseResponse>`

##### `updateConfig(config)`

Update the service configuration.

```typescript
service.updateConfig({ debug: true, apiUrl: 'https://new-api.com' });
```

##### `getConfig()`

Get current configuration.

```typescript
const config = service.getConfig();
```

##### `clearCache()`

Clear the internal cache.

```typescript
service.clearCache();
```

##### `healthCheck()`

Check service health.

```typescript
const isHealthy = await service.healthCheck();
```

## 🏗️ Usage in Apps

### React/Vite Apps (app.client, app.admin, app.rescue)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-chat": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/index.ts
export { chatService } from '@adopt-dont-shop/lib-chat';

// In your component
import { chatService } from '@/services';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await chatService.exampleMethod({
          component: 'MyComponent'
        });
        setData(result.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  return <div>{/* Your JSX */}</div>;
}
```

### Node.js Backend (service.backend)

1. **Add to package.json:**

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-chat": "workspace:*"
  }
}
```

2. **Import and use:**

```typescript
// src/services/chat.service.ts
import { ChatService } from '@adopt-dont-shop/lib-chat';

export const chatService = new ChatService({
  apiUrl: process.env.API_URL,
  debug: process.env.NODE_ENV === 'development',
});

// In your routes or controllers
import { chatService } from '../services/chat.service';

app.get('/api/chat/example', async (req, res) => {
  try {
    const result = await chatService.exampleMethod(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🐳 Docker Integration

### Development with Docker Compose

1. **Build the library:**

```bash
# From workspace root
docker-compose -f docker-compose.lib.yml up lib-chat
```

2. **Run tests:**

```bash
docker-compose -f docker-compose.lib.yml run lib-chat-test
```

### Using in App Containers

Add to your app's Dockerfile:

```dockerfile
# Copy shared libraries
COPY lib.chat /workspace/lib.chat

# Install dependencies
RUN npm install @adopt-dont-shop/lib-chat@workspace:*
```

### Multi-stage Build for Production

```dockerfile
# In your app's Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy shared library
COPY lib.chat ./lib.chat

# Copy app package files
COPY app.client/package*.json ./app.client/

# Install dependencies
RUN cd lib.chat && npm ci && npm run build
RUN cd app.client && npm ci

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./

# Copy app source
COPY app.client ./app.client

# Build app
RUN cd app.client && npm run build
```

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure

```
src/
├── services/
│   ├── chat-service.ts
│   └── __tests__/
│       └── chat-service.test.ts
└── types/
    └── index.ts
```

## 🏗️ Development

### Build the Library

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

### Code Quality

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 📁 Project Structure

```
lib.chat/
├── src/
│   ├── services/
│   │   ├── chat-service.ts     # Main service implementation
│   │   └── __tests__/
│   │       └── chat-service.test.ts
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   └── index.ts                      # Main entry point
├── dist/                             # Built output (generated)
├── docker-compose.lib.yml           # Docker compose for development
├── Dockerfile                       # Multi-stage Docker build
├── jest.config.js                   # Jest test configuration
├── package.json                     # Package configuration
├── tsconfig.json                    # TypeScript configuration
├── .eslintrc.json                   # ESLint configuration
├── .prettierrc.json                 # Prettier configuration
└── README.md                        # This file
```

## 🔗 Integration Examples

### With Other Libraries

```typescript
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { chatService } from '@adopt-dont-shop/lib-chat';

// Configure with shared dependencies
chatService.updateConfig({
  apiUrl: apiService.getConfig().baseUrl,
  headers: {
    Authorization: `Bearer ${authService.getToken()}`,
  },
});
```

### Error Handling

```typescript
import { chatService, ErrorResponse } from '@adopt-dont-shop/lib-chat';

try {
  const result = await chatService.exampleMethod(data);
  // Handle success
} catch (error) {
  const errorResponse = error as ErrorResponse;
  console.error('Error:', errorResponse.error);
  console.error('Code:', errorResponse.code);
  console.error('Details:', errorResponse.details);
}
```

## 🚀 Deployment

### NPM Package (if publishing externally)

```bash
# Build and test
npm run build
npm run test

# Publish
npm publish
```

### Workspace Integration

The library is already integrated into the workspace. Apps can import it using:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib-chat": "workspace:*"
  }
}
```

## 🤝 Contributing

1. Make changes to the library
2. Add/update tests
3. Run `npm run build` to ensure it builds correctly
4. Run `npm test` to ensure tests pass
5. Update documentation as needed

## 📄 License

MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

1. **Module not found**
   - Ensure the library is built: `npm run build`
   - Check workspace dependencies are installed: `npm install`

2. **Type errors**
   - Run type checking: `npm run type-check`
   - Ensure TypeScript version compatibility

3. **Build failures**
   - Clean and rebuild: `npm run clean && npm run build`
   - Check for circular dependencies

### Debug Mode

Enable debug logging:

```typescript
chatService.updateConfig({ debug: true });
```

Or set environment variable:

```bash
NODE_ENV=development
```
