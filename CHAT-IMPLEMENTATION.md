# Pet Adoption Chat System Implementation Plan

This document outlines the implementation plan for a chat system enabling communication between rescue organizations and potential adopters. The system will be built using React + TypeScript on the frontend, Express + TypeScript on the backend, and PostgreSQL with Sequelize as the ORM.

## 1. Overview & Context

### Purpose

Enable rescue organizations to initiate and maintain conversations with potential adopters about their pet adoption applications or general inquiries.

### Key Features

- Rescues can initiate chats with users who have applied to adopt their pets
- Users can respond and maintain conversations with rescues
- Both parties can view their chat history
- Support for sharing adoption-related documents/images (future enhancement)

### Key Concepts

- **Chat:** A conversation session between a rescue and a user
- **ChatParticipant:** Records who is in the chat (rescue or user) with their role
- **Message:** Individual messages within a chat
- **Application:** (Reference) The pet adoption application that may have triggered the chat

## 2. Data Models

### 2.1 Chat Model

```typescript
// models/Chat.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface ChatAttributes {
	id: number;
	application_id?: number; // Optional - links to adoption application if chat was initiated from one
	status: 'active' | 'archived';
	created_at?: Date;
	updated_at?: Date;
}

interface ChatCreationAttributes extends Optional<ChatAttributes, 'id'> {}

export class Chat
	extends Model<ChatAttributes, ChatCreationAttributes>
	implements ChatAttributes
{
	public id!: number;
	public application_id?: number;
	public status!: 'active' | 'archived';
	public readonly created_at!: Date;
	public readonly updated_at!: Date;
}

Chat.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		application_id: {
			type: DataTypes.INTEGER,
			allowNull: true,
			references: {
				model: 'applications',
				key: 'id',
			},
		},
		status: {
			type: DataTypes.ENUM('active', 'archived'),
			allowNull: false,
			defaultValue: 'active',
		},
	},
	{
		sequelize,
		tableName: 'chats',
		modelName: 'Chat',
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		underscored: true,
	}
);
```

### 2.2 ChatParticipant Model

```typescript
// models/ChatParticipant.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import Chat from './Chat';

export type ParticipantRole = 'rescue' | 'user';

interface ChatParticipantAttributes {
	id: number;
	chat_id: number;
	participant_id: number;
	role: ParticipantRole;
	last_read_at: Date;
}

interface ChatParticipantCreationAttributes
	extends Optional<ChatParticipantAttributes, 'id' | 'last_read_at'> {}

export class ChatParticipant
	extends Model<ChatParticipantAttributes, ChatParticipantCreationAttributes>
	implements ChatParticipantAttributes
{
	public id!: number;
	public chat_id!: number;
	public participant_id!: number;
	public role!: ParticipantRole;
	public last_read_at!: Date;
	public readonly created_at!: Date;
	public readonly updated_at!: Date;
}

ChatParticipant.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		chat_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Chat,
				key: 'id',
			},
			onDelete: 'CASCADE',
		},
		participant_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		role: {
			type: DataTypes.ENUM('rescue', 'user'),
			allowNull: false,
		},
		last_read_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize,
		tableName: 'chat_participants',
		modelName: 'ChatParticipant',
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		underscored: true,
	}
);
```

### 2.3 Message Model

```typescript
// models/Message.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';
import Chat from './Chat';

interface MessageAttributes {
	id: number;
	chat_id: number;
	sender_id: number;
	content: string;
	created_at?: Date;
	updated_at?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id'> {}

export class Message
	extends Model<MessageAttributes, MessageCreationAttributes>
	implements MessageAttributes
{
	public id!: number;
	public chat_id!: number;
	public sender_id!: number;
	public content!: string;
	public readonly created_at!: Date;
	public readonly updated_at!: Date;
}

Message.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		chat_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: { model: Chat, key: 'id' },
			onDelete: 'CASCADE',
		},
		sender_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		content: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	},
	{
		sequelize,
		tableName: 'messages',
		modelName: 'Message',
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		underscored: true,
	}
);
```

## 3. API Endpoints

### Chat Routes

#### GET /api/chats

- List all chats for the authenticated user (rescue or adopter)
- Includes unread message count and latest message preview

#### POST /api/chats

- Create a new chat
- Required when rescue wants to initiate conversation with user
- Optional link to adoption application

#### GET /api/chats/:chat_id

- Get details of a specific chat including participants

### Message Routes

#### GET /api/chats/:chat_id/messages

- Get messages for a specific chat
- Supports pagination
- Updates last_read_at timestamp for the requesting user

#### POST /api/chats/:chat_id/messages

- Send a new message in a chat
- Validates sender is a participant

## 4. Frontend Components

### 4.1 Chat List Component

```typescript
// components/ChatList.tsx
import React from 'react';
import styled from 'styled-components';

type ChatListProps = {
	user_id: number;
	user_role: 'rescue' | 'user';
};

const ChatListContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 1rem;
`;

const ChatPreview = styled.div`
	padding: 1rem;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	cursor: pointer;

	&:hover {
		background-color: #f5f5f5;
	}
`;

export const ChatList: React.FC<ChatListProps> = ({ user_id, user_role }) => {
	// Implementation details to follow
	return (
		<ChatListContainer>
			<h2>Messages</h2>
			{/* Chat previews will be rendered here */}
		</ChatListContainer>
	);
};
```

### 4.2 Chat Room Component

```typescript
// components/ChatRoom.tsx
import React from 'react';
import styled from 'styled-components';

type ChatRoomProps = {
	chat_id: number;
	user_id: number;
	user_role: 'rescue' | 'user';
};

const ChatContainer = styled.div`
	display: flex;
	flex-direction: column;
	height: 100%;
	max-height: 600px;
`;

const MessageList = styled.div`
	flex: 1;
	overflow-y: auto;
	padding: 1rem;
`;

const MessageInput = styled.div`
	padding: 1rem;
	border-top: 1px solid #e0e0e0;
`;

export const ChatRoom: React.FC<ChatRoomProps> = ({
	chat_id,
	user_id,
	user_role,
}) => {
	// Implementation details to follow
	return (
		<ChatContainer>
			<MessageList>{/* Messages will be rendered here */}</MessageList>
			<MessageInput>{/* Message input form will be here */}</MessageInput>
		</ChatContainer>
	);
};
```

## 5. Implementation Phases

### Phase 1: Basic Chat Functionality

1. Set up database models and migrations
2. Implement basic REST API endpoints
3. Create basic UI components for chat list and chat room
4. Implement message sending and receiving via polling

### Phase 2: Enhanced Features

1. Add real-time updates using Socket.IO
2. Implement unread message indicators
3. Add typing indicators
4. Enable file/image sharing for adoption documents

### Phase 3: Polish & Optimization

1. Add message search functionality
2. Implement chat archiving
3. Add rich text formatting for messages
4. Optimize performance and add loading states

## 6. Security Considerations

1. Ensure users can only access their own chats
2. Validate chat participants before allowing message sends
3. Sanitize all message content
4. Rate limit message sending
5. Implement proper authentication checks on all endpoints

## 7. Testing Strategy

1. Unit tests for models and utilities
2. Integration tests for API endpoints
3. E2E tests for critical chat flows
4. Performance testing for message loading
5. Security testing for access control

## 8. Backend CRUD Operations

### 8.1 Route Structure

The API routes are organized in a modular structure with separate files for different concerns:

```typescript
// routes/index.ts - Main router configuration
import express from 'express';
import chatRoutes from './chatRoutes';
import messageRoutes from './messageRoutes';
import participantRoutes from './participantRoutes';

const router = express.Router();

// Mount chat routes
router.use('/chats', chatRoutes);

// Mount message routes under chats
router.use('/chats/:chat_id/messages', messageRoutes);

// Mount participant routes under chats
router.use('/chats/:chat_id/participants', participantRoutes);

export default router;
```

### 8.2 Chat Routes

```typescript
// routes/chatRoutes.ts - Chat-specific routes
import express from 'express';
import * as chatController from '../controllers/chatController';
import { validateChatAccess } from '../middleware/auth';

const router = express.Router();

// Apply chat access validation middleware
router.use('/:chat_id', validateChatAccess);

// Chat routes
router.post('/', chatController.createChat);
router.get('/', chatController.getAllChats);
router.get('/:chat_id', chatController.getChatById);
router.put('/:chat_id', chatController.updateChat);
router.delete('/:chat_id', chatController.deleteChat);

export default router;
```

### 8.3 Message Routes

```typescript
// routes/messageRoutes.ts - Message-specific routes
import express from 'express';
import * as messageController from '../controllers/messageController';
import { validateChatAccess } from '../middleware/auth';

const router = express.Router({ mergeParams: true });

// Message routes
router.post('/', messageController.createMessage);
router.get('/', messageController.getAllMessages);
router.put('/:message_id', messageController.updateMessage);
router.delete('/:message_id', messageController.deleteMessage);

export default router;
```

### 8.4 Participant Routes

```typescript
// routes/participantRoutes.ts - Participant-specific routes
import express from 'express';
import * as participantController from '../controllers/chatParticipantController';

const router = express.Router({ mergeParams: true });

// Participant routes
router.post('/', participantController.createParticipant);
router.get('/', participantController.getAllParticipants);
router.put('/:participant_id/last-read', participantController.updateLastRead);
router.delete('/:participant_id', participantController.deleteParticipant);

export default router;
```

### 8.5 Route Organization Benefits

1. **Modularity:**

   - Each route file handles a specific domain (chats, messages, participants)
   - Easy to maintain and extend
   - Clear separation of concerns

2. **Nested Resources:**

   - Messages and participants are nested under chats
   - Uses `mergeParams: true` to access parent route parameters
   - Follows RESTful conventions

3. **Middleware Application:**

   - Chat access validation applied at the appropriate level
   - Security checks for protected routes
   - Consistent error handling

4. **API Structure:**
   ```
   /api
   └── /chats
       ├── / (GET, POST)
       ├── /:chat_id (GET, PUT, DELETE)
       ├── /:chat_id/messages
       │   ├── / (GET, POST)
       │   ├── /:message_id (PUT, DELETE)
       └── /:chat_id/participants
           ├── / (GET, POST)
           ├── /:participant_id (DELETE)
           └── /:participant_id/last-read (PUT)
   ```

### 8.6 Route Usage Examples

1. **Creating a New Chat:**

   ```typescript
   POST /api/chats
   Body: {
     application_id?: number,
     rescue_id: number,
     user_id: number
   }
   ```

2. **Getting Chat Messages:**

   ```typescript
   GET /api/chats/:chat_id/messages?limit=50&offset=0
   ```

3. **Adding a Participant:**

   ```typescript
   POST /api/chats/:chat_id/participants
   Body: {
     participant_id: number,
     role: 'rescue' | 'user'
   }
   ```

4. **Updating Last Read:**
   ```typescript
   PUT /api/chats/:chat_id/participants/:participant_id/last-read
   ```

### 8.7 Security Considerations

1. **Access Control:**

   - Validate chat access using middleware
   - Check participant roles and permissions
   - Ensure users can only access their own chats

2. **Data Validation:**

   - Validate request bodies
   - Sanitize user input
   - Check for required fields

3. **Error Handling:**
   - Consistent error responses
   - Proper status codes
   - Informative error messages

### 8.8 Future Enhancements

1. **Real-time Updates:**

   - Integrate Socket.IO for live messages
   - Add typing indicators
   - Show online status

2. **Performance:**

   - Add caching for frequently accessed data
   - Implement pagination for large datasets
   - Optimize database queries

3. **Features:**
   - File attachments
   - Message reactions
   - Read receipts
   - Message search

## Next Steps

1. Review and finalize database schema
2. Set up initial project structure
3. Create database migrations
4. Begin implementing Phase 1 features

This implementation plan provides a solid foundation for building a chat system specifically designed for rescue-to-user communication in the pet adoption context. The system is designed to be scalable and maintainable while focusing on the specific needs of the pet adoption process.
