# @adopt-dont-shop/lib.chat

Real-time chat and messaging functionality built on Socket.IO.

Consumed as a workspace dependency. Reference with `"*"` in a package's `dependencies` — `npm install` at the repo root links it automatically.

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.chat": "*"
  }
}
```

## Exports

See `src/index.ts` for the authoritative list. Primary entry points:

- **`ChatService`** — class-based client for REST + WebSocket messaging. Construct with a `ChatServiceConfig` or leave defaults.
- **`useConnectionStatus(chatService)`** — React hook that tracks connect / reconnect / disconnect / error state.
- **Admin React Query hooks** — `useAdminChats`, `useAdminChatById`, `useAdminChatMessages`, `useAdminChatStats`, `useAdminSearchChats`, `useAdminChatMutations`.
- **Types** — `Conversation`, `Message`, `Participant`, `MessageAttachment`, `TypingIndicator`, `MessageReaction`, `MessageReadReceipt`, `MessageDeliveryStatus`, `ReconnectionConfig`, `QueuedMessage`, plus response shapes (`BaseResponse`, `ErrorResponse`, `PaginatedResponse`).

## Quick start

```typescript
import { ChatService, useConnectionStatus } from '@adopt-dont-shop/lib.chat';

const chat = new ChatService({
  socketUrl: import.meta.env.VITE_WS_BASE_URL,
  debug: import.meta.env.DEV,
  reconnection: { enabled: true, initialDelay: 1000, maxDelay: 30000, maxAttempts: 10 },
  enableMessageQueue: true,
  maxQueueSize: 50,
});

chat.connect(userId, authToken);

chat.onMessage((message) => { /* … */ });
chat.onTyping((typing) => { /* … */ });
chat.onConnectionStatusChange((status) => { /* … */ });

await chat.sendMessage(conversationId, 'Hello!');
```

Inside a React component:

```tsx
const { isConnected, isReconnecting, reconnectionAttempts } = useConnectionStatus(chat);
```

## Scripts (from `lib.chat/`)

```bash
npm run build           # tsc
npm run dev             # tsc --watch
npm test                # vitest run
npm run test:watch
npm run test:coverage
npm run lint
npm run type-check
```

## Resources

- Source of truth for exports: [src/index.ts](./src/index.ts)
- Service implementation: [src/services/chat-service.ts](./src/services/chat-service.ts)
