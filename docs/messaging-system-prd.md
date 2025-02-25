# Pet Adoption Messaging System - Product Requirements Document

## 1. Introduction

### 1.1 Purpose

The Pet Adoption Messaging System enables real-time communication between rescue organizations and potential adopters, facilitating discussions about adoption applications and general inquiries. This system is an integral part of the pet adoption platform, enhancing the adoption process by providing direct, organized communication between parties.

### 1.2 Scope

This PRD covers the chat/messaging functionality of the pet adoption platform, including the database schema, API endpoints, frontend components, and real-time communication features.

### 1.3 Target Users

- **Rescue Organizations**: Staff members who need to communicate with potential adopters
- **Potential Adopters**: Users who have applied to adopt pets or have inquiries

## 2. System Overview

### 2.1 Key Features

- **Real-time Chat**: Instant messaging between rescues and adopters
- **Conversation Management**: Create, view, update, and archive conversations
- **Message History**: Persistent storage and retrieval of message history
- **Read Receipts**: Track when messages have been read
- **Typing Indicators**: Show when a participant is typing
- **File Attachments**: Share adoption-related documents and images
- **Message Reactions**: Add emoji reactions to messages
- **Analytics**: Track user engagement and system performance

### 2.2 Technology Stack

- **Frontend**: React + TypeScript with styled-components
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Real-time Communication**: Socket.IO
- **Authentication**: JWT-based authentication

## 3. Data Models

### 3.1 Chat Model

Represents a conversation between a rescue organization and a potential adopter.

```typescript
interface ChatAttributes {
	id: number;
	application_id?: number; // Optional link to an adoption application
	status: 'active' | 'archived' | 'locked';
	created_at: Date;
	updated_at: Date;
}
```

### 3.2 ChatParticipant Model

Tracks who is participating in a chat and their role.

```typescript
interface ChatParticipantAttributes {
	id: number;
	chat_id: number;
	participant_id: number;
	role: 'rescue' | 'user';
	last_read_at: Date;
	created_at: Date;
	updated_at: Date;
}
```

### 3.3 Message Model

Individual messages within a chat.

```typescript
interface MessageAttributes {
	message_id: string;
	chat_id: string;
	sender_id: string;
	content: string;
	content_format: 'plain' | 'markdown' | 'html';
	attachments?: Array<{
		attachment_id: string;
		file_name: string;
		file_size: number;
		mimeType: string;
		url: string;
	}>;
	created_at: Date;
	updated_at: Date;
}
```

### 3.4 MessageReadStatus Model

Tracks when messages have been read by participants.

```typescript
interface MessageReadStatusAttributes {
	id: number;
	message_id: string;
	user_id: string;
	read_at: Date;
	created_at: Date;
	updated_at: Date;
}
```

## 4. API Endpoints

### 4.1 Chat Endpoints

| Endpoint              | Method | Description                              |
| --------------------- | ------ | ---------------------------------------- |
| `/api/chats`          | GET    | Get all chats for the authenticated user |
| `/api/chats`          | POST   | Create a new chat                        |
| `/api/chats/:chat_id` | GET    | Get a specific chat by ID                |
| `/api/chats/:chat_id` | PUT    | Update a chat (e.g., status)             |
| `/api/chats/:chat_id` | DELETE | Delete a chat                            |

### 4.2 Message Endpoints

| Endpoint                                   | Method | Description                      |
| ------------------------------------------ | ------ | -------------------------------- |
| `/api/chats/:chat_id/messages`             | GET    | Get messages for a specific chat |
| `/api/chats/:chat_id/messages`             | POST   | Send a new message in a chat     |
| `/api/chats/:chat_id/messages/:message_id` | PUT    | Update a message                 |
| `/api/chats/:chat_id/messages/:message_id` | DELETE | Delete a message                 |

### 4.3 Participant Endpoints

| Endpoint                                                     | Method | Description                                      |
| ------------------------------------------------------------ | ------ | ------------------------------------------------ |
| `/api/chats/:chat_id/participants`                           | GET    | Get all participants for a chat                  |
| `/api/chats/:chat_id/participants`                           | POST   | Add a participant to a chat                      |
| `/api/chats/:chat_id/participants/:participant_id`           | DELETE | Remove a participant from a chat                 |
| `/api/chats/:chat_id/participants/:participant_id/last-read` | PUT    | Update the last read timestamp for a participant |

## 5. Socket.IO Events

### 5.1 Client-to-Server Events

| Event             | Data                                                           | Description                  |
| ----------------- | -------------------------------------------------------------- | ---------------------------- |
| `join_chat`       | `chatId: string`                                               | Join a chat room             |
| `leave_chat`      | `chatId: string`                                               | Leave a chat room            |
| `get_messages`    | `{ chatId: string }`                                           | Request messages for a chat  |
| `get_chat_status` | `{ chatId: string }`                                           | Request the status of a chat |
| `send_message`    | `{ chat_id: string, content: string, content_format: string }` | Send a new message           |
| `typing_start`    | `{ chatId: string, userId: string }`                           | Indicate user started typing |
| `typing_end`      | `{ chatId: string, userId: string }`                           | Indicate user stopped typing |

### 5.2 Server-to-Client Events

| Event                 | Data                                                                         | Description                  |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------- |
| `messages`            | `Message[]`                                                                  | Array of messages for a chat |
| `chat_status`         | `{ status: string }`                                                         | Status of a chat             |
| `new_message`         | `Message`                                                                    | New message received         |
| `message_updated`     | `Message`                                                                    | Message has been updated     |
| `message_deleted`     | `{ message_id: string }`                                                     | Message has been deleted     |
| `user_typing`         | `{ userId: string, chatId: string }`                                         | User is typing               |
| `user_stopped_typing` | `{ userId: string, chatId: string }`                                         | User stopped typing          |
| `read_status_updated` | `{ chat_id: string, user_id: string, message_ids: string[], read_at: Date }` | Message(s) marked as read    |
| `error`               | `{ message: string }`                                                        | Error message                |

## 6. Frontend Components

### 6.1 Chat Components

#### 6.1.1 ChatContainer

The main component that orchestrates the chat functionality.

- Manages chat state and socket connections
- Handles message loading and sending
- Tracks chat status (active, locked, archived)

#### 6.1.2 Chat

Displays the chat interface with messages and input area.

- Renders message list
- Provides message input
- Shows typing indicators and read receipts
- Handles file attachments

#### 6.1.3 MessageList

Manages the display of messages in a scrollable container.

- Renders messages with proper grouping
- Handles scroll behavior and history loading
- Implements virtual scrolling for performance

#### 6.1.4 MessageReactions

Enables users to add emoji reactions to messages.

- Displays existing reactions
- Handles adding and removing reactions

### 6.2 UI Components

#### 6.2.1 MessageBubble

Styled component for message display.

- Different styles for sent vs. received messages
- Displays message content and metadata
- Shows attachments when present

#### 6.2.2 FilePreview

Displays previews of file attachments.

- Image thumbnails for image attachments
- Icons for document attachments
- Handles download and view actions

#### 6.2.3 ConnectionStatus

Indicates the current connection status.

- Connected, connecting, or disconnected states
- Reconnection attempts

## 7. Analytics & Monitoring

### 7.1 Message Metrics

- Message volume by time period
- Message delivery times
- Read receipt times
- Message content metrics (length, attachments)

### 7.2 User Engagement

- Session duration
- Message frequency
- Reaction usage
- Typing frequency

### 7.3 Performance Metrics

- Socket connection success rate
- Message delivery success rate
- API endpoint performance
- Error tracking

## 8. Security Considerations

### 8.1 Authentication & Authorization

- JWT-based authentication for API endpoints and socket connections
- Role-based access control for chat participants
- Validation of chat access for all operations

### 8.2 Data Protection

- Input sanitization for message content
- File validation for attachments
- Rate limiting for all operations
- Connection throttling for socket operations

### 8.3 Error Handling

- Consistent error responses
- Proper logging of security events
- Audit logging for sensitive operations

## 9. Implementation Phases

### 9.1 Phase 1: Basic Chat Functionality

- Set up database models and migrations
- Implement basic REST API endpoints
- Create core UI components
- Implement message sending and receiving via polling

### 9.2 Phase 2: Real-time Features

- Integrate Socket.IO for real-time communication
- Implement typing indicators
- Add read receipts
- Enable file/image sharing

### 9.3 Phase 3: Enhanced Features

- Add message reactions
- Implement message search
- Add rich text formatting
- Enable chat archiving

### 9.4 Phase 4: Polish & Optimization

- Optimize performance for large chat histories
- Implement virtualized scrolling
- Add offline support
- Enhance analytics and monitoring

## 10. Future Enhancements

### 10.1 Feature Roadmap

- **Group Chats**: Enable conversations with multiple participants
- **Message Templates**: Pre-defined messages for common scenarios
- **Scheduled Messages**: Send messages at a specific time
- **Advanced File Sharing**: Preview documents directly in the chat
- **Push Notifications**: Alert users of new messages when offline
- **Chat Widgets**: Embed chat functionality in other parts of the application

### 10.2 Technical Improvements

- Implement message encryption for enhanced privacy
- Add WebRTC for video/audio communication
- Implement offline message queuing
- Enhance analytics with machine learning for insights
- Add translation services for multi-language support

## 11. Conclusion

The Pet Adoption Messaging System provides a robust, real-time communication platform tailored specifically for the pet adoption process. It facilitates meaningful conversations between rescue organizations and potential adopters, helping to streamline the adoption process while providing a high-quality user experience. The system's modular design and phased implementation approach allow for continuous improvement and adaptation to user needs over time.
