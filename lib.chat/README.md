# @adopt-dont-shop/lib.chat

Real-time chat building blocks shared across the Adopt Don't Shop apps. Provides a Socket.IO-backed `ChatService`, a React `ChatProvider` + `useChat` hook, ready-made UI components (conversation list, message bubbles, input, reactions, read receipts), and supporting types.

For the wider library catalogue see [`docs/libraries/chat.md`](../docs/libraries/chat.md). This README is the canonical reference for what `lib.chat` exports.

## Installation

```bash
# From the workspace root
npm install
```

Add as a workspace dependency in the consuming package:

```json
{
  "dependencies": {
    "@adopt-dont-shop/lib.chat": "*"
  }
}
```

## Public Exports

From [`lib.chat/src/index.ts`](./src/index.ts):

### Service

- `ChatService` — Socket.IO + REST client for chat operations
- Event payload types: `ReactionUpdateEvent`, `ReadStatusUpdateEvent`

### React context

- `ChatProvider` — context wrapper that owns a `ChatService` instance
- `useChat` — hook returning the chat context value
- Types: `ChatContextValue`, `ChatProviderProps`, `ChatUser`, `FeatureFlagsAdapter`, `ResolveFileUrl`

### Hook

- `useConnectionStatus` — subscribes to the underlying Socket.IO connection state

### Components

`AvatarComponent`, `ChatWindow`, `ConnectionStatusBanner`, `ConversationList`, `ImageLightbox`, `MessageBubbleComponent`, `MessageInput`, `MessageItemComponent`, `MessageList`, `PDFPreview`, `ReactionDisplay`, `ReactionPicker`, `ReadReceiptIndicator`, `TypingIndicatorBubble`.

### Utilities & Types

- `safeFormatDistanceToNow` — locale-safe relative date helper
- All shared types from `./types` (Conversation, Message, MessageReaction, Participant, etc.)

## Quick Start

### Direct service use

```typescript
import { ChatService } from '@adopt-dont-shop/lib.chat';

const chatService = new ChatService({
  apiUrl: import.meta.env.VITE_API_BASE_URL,
  socketUrl: import.meta.env.VITE_WS_BASE_URL,
  debug: import.meta.env.DEV,
});

chatService.connect(userId, accessToken);
const conversations = await chatService.getConversations();
```

### React integration

```tsx
import { ChatProvider, useChat, ChatWindow } from '@adopt-dont-shop/lib.chat';

function App({ user }) {
  return (
    <ChatProvider user={user} apiUrl={import.meta.env.VITE_API_BASE_URL}>
      <ChatScreen />
    </ChatProvider>
  );
}

function ChatScreen() {
  const { conversations, activeConversationId } = useChat();
  return <ChatWindow conversationId={activeConversationId} />;
}
```

Refer to [`src/services/chat-service.ts`](./src/services/chat-service.ts) and [`src/context/ChatProvider.tsx`](./src/context/ChatProvider.tsx) for the complete method and prop surface — those files are the source of truth.

## Configuration

`ChatServiceConfig`:

| Property             | Type                          | Default          | Description                                  |
| -------------------- | ----------------------------- | ---------------- | -------------------------------------------- |
| `apiUrl`             | `string`                      | `/api`           | Base URL for REST endpoints                  |
| `socketUrl`          | `string`                      | Same as `apiUrl` | WebSocket URL for Socket.IO                  |
| `debug`              | `boolean`                     | `false`          | Verbose logging                              |
| `headers`            | `Record<string, string>`      | `{}`             | Extra REST headers                           |
| `reconnection`       | `Partial<ReconnectionConfig>` | see below        | Socket.IO reconnection tuning                |
| `enableMessageQueue` | `boolean`                     | `true`           | Buffer outbound messages while disconnected  |
| `maxQueueSize`       | `number`                      | `50`             | Max queued messages                          |

`ReconnectionConfig` defaults: `enabled: true`, `initialDelay: 1000`, `maxDelay: 30000`, `maxAttempts: 10`, `backoffMultiplier: 1.5`.

## Development

```bash
npx turbo build --filter=@adopt-dont-shop/lib.chat
npx turbo test  --filter=@adopt-dont-shop/lib.chat
npx turbo lint  --filter=@adopt-dont-shop/lib.chat
```

Tests run under Jest (see `lib.chat/jest.config.cjs`).
