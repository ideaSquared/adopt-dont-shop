# Messaging System

## 1. Title and Overview

### 1.1 Document Title & Version

Pet Adoption Messaging System PRD v1.2

### 1.2 Product Summary

The Pet Adoption Messaging System enables real-time communication between rescue organizations and potential adopters, facilitating discussions about adoption applications and general inquiries. This system is an integral part of the pet adoption platform, enhancing the adoption process by providing direct, organized communication between parties.

#### 1.2.1. Key Features

- **Real-time Chat**: Instant messaging between rescues and adopters ✅ IMPLEMENTED
- **Conversation Management**: Create, view, update, and archive conversations ✅ IMPLEMENTED
- **Message History**: Persistent storage and retrieval of message history ✅ IMPLEMENTED
- **Read Receipts**: Track when messages have been read ✅ IMPLEMENTED
- **Typing Indicators**: Show when a participant is typing ✅ IMPLEMENTED
- **File Attachments**: Share adoption-related documents and images ✅ IMPLEMENTED
- **Message Reactions**: Add emoji reactions to messages ✅ IMPLEMENTED
- **Multi-Participant Chats**: Support for conversations with multiple participants ✅ IMPLEMENTED
- **Analytics**: Track user engagement and system performance 🔄 PLANNED

#### 1.2.2. Implementation Status

The Messaging System has been substantially implemented, with core functionality for conversations, messaging, basic read receipts, typing indicators, message reactions, and multi-participant chats available. Only analytics features are planned for upcoming development cycles as detailed in the Future Enhancements section.

Current implementation status:

- 17 user stories fully implemented
- 3 user stories planned for future releases
- Core API endpoints for chats, messages, and participants functional
- Database models are fully implemented and optimized for current usage patterns

#### 1.2.3. Technology Stack

- Frontend: React + TypeScript with styled-components
- Backend: Express + TypeScript
- Database: PostgreSQL with Sequelize ORM
- Real-time Communication: Socket.IO (planned)
- Authentication: JWT-based authentication

#### 1.2.4. Data Models

Chat Model:

```typescript
interface ChatAttributes {
	chat_id: string;
	application_id?: string; // Optional link to an adoption application
	rescue_id: string; // Required to link chat to a rescue organization
	status: 'active' | 'locked' | 'archived';
	created_at: Date;
	updated_at: Date;
}
```

ChatParticipant Model:

```typescript
interface ChatParticipantAttributes {
	chat_participant_id: string;
	chat_id: string;
	participant_id: string;
	role: 'rescue' | 'user';
	last_read_at: Date;
	created_at: Date;
	updated_at: Date;
}
```

Message Model:

```typescript
interface MessageAttributes {
	message_id: string;
	chat_id: string;
	sender_id: string;
	content: string;
	content_format: 'plain' | 'markdown' | 'html';
	attachments?: Array<{
		attachment_id: string;
		filename: string;
		originalName: string;
		mimeType: string;
		size: number;
		url: string;
	}>;
	search_vector?: any; // For full-text search functionality
	created_at: Date;
	updated_at: Date;
}
```

MessageReadStatus Model:

```typescript
interface MessageReadStatusAttributes {
	message_read_status: string;
	message_id: string;
	user_id: string;
	read_at: Date;
	created_at: Date;
	updated_at: Date;
}
```

#### 1.2.5. API Endpoints

Chat Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats/user/conversations` | GET | Get all chats for the authenticated user |
| `/api/chats/rescue/conversations` | GET | Get all chats for a rescue organization |
| `/api/chats/admin/conversations` | GET | Get all conversations (admin only) |
| `/api/chats/:chat_id` | GET | Get a specific chat by ID |
| `/api/chats/:chat_id` | PUT | Update a chat |
| `/api/chats/:chat_id` | DELETE | Delete a chat |
| `/api/chats/:chat_id/status` | PATCH | Update chat status |
| `/api/chats/rescue/:rescueId/chats/:chat_id/status` | PATCH | Update chat status for rescue |

Message Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats/:chat_id/messages` | GET | Get messages for a specific chat |
| `/api/chats/:chat_id/messages` | POST | Send a new message in a chat |
| `/api/chats/:chat_id/messages/:message_id` | PUT | Update a message |
| `/api/chats/:chat_id/messages/:message_id` | DELETE | Delete a message |
| `/api/chats/:chat_id/messages/search` | GET | Search messages within a chat |
| `/api/chats/:chat_id/unread-count` | GET | Get count of unread messages in a chat |
| `/api/chats/:chat_id/read-all` | POST | Mark all messages in a chat as read |
| `/api/chats/unread-messages` | GET | Get all unread messages for the user |

Participant Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats/:chat_id/participants` | GET | Get all participants for a chat |
| `/api/chats/:chat_id/participants` | POST | Add a participant to a chat |
| `/api/chats/:chat_id/participants/:participant_id` | DELETE | Remove a participant from a chat |

Admin Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats/messages/:message_id` | DELETE | Delete a specific message (admin only) |
| `/api/chats/messages/bulk-delete` | POST | Bulk delete messages (admin only) |

Socket.IO Events (Planned - Not Currently Implemented):
| Event | Data | Description |
|-------|------|-------------|
| `join_chat` | `chatId: string` | Join a chat room |
| `leave_chat` | `chatId: string` | Leave a chat room |
| `get_messages` | `{ chatId: string }` | Request messages for a chat |
| `get_chat_status` | `{ chatId: string }` | Request the status of a chat |
| `send_message` | `{ chat_id: string, content: string, content_format: string }` | Send a new message |
| `typing_start` | `{ chatId: string, userId: string }` | Indicate user started typing |
| `typing_end` | `{ chatId: string, userId: string }` | Indicate user stopped typing |

Socket.IO Events (Server-to-Client - Planned):
| Event | Data | Description |
|-------|------|-------------|
| `messages` | `Message[]` | Array of messages for a chat |
| `chat_status` | `{ status: string }` | Status of a chat |
| `new_message` | `Message` | New message received |
| `message_updated` | `Message` | Message has been updated |
| `message_deleted` | `{ message_id: string }` | Message has been deleted |
| `user_typing` | `{ userId: string, chatId: string }` | User is typing |
| `user_stopped_typing` | `{ userId: string, chatId: string }` | User stopped typing |
| `read_status_updated` | `{ chat_id: string, user_id: string, message_ids: string[], read_at: Date }` | Message(s) marked as read |
| `error` | `{ message: string }` | Error message |

#### 1.2.6. Implementation References

The Messaging System has been implemented across several key files in the codebase:

**Backend Models:**

- `backend/src/Models/Chat.ts` - Implements the chat data model with associations
- `backend/src/Models/ChatParticipant.ts` - Handles chat participant relationships
- `backend/src/Models/Message.ts` - Manages message storage with search capabilities
- `backend/src/Models/MessageReadStatus.ts` - Tracks message read receipts

**Backend Routes and Controllers:**

- `backend/src/routes/chatRoutes.ts` - Defines all chat and message API endpoints
- `backend/src/controllers/chatController.ts` - Implements chat management logic
- `backend/src/controllers/messageController.ts` - Handles message operations

**Frontend Components:**

- `frontend/src/components/chat/` - Contains UI components for the chat interface
- `frontend/src/pages/Messages.tsx` - Main messaging interface
- `frontend/src/hooks/useChat.ts` - Custom hook for chat data management

These files contain the implementation of the user stories outlined in this document, with the planned features marked accordingly.

## 2. User Personas

### 2.1 Key User Types

1. Rescue Organization Staff

   - Adoption coordinators
   - Rescue administrators
   - Volunteer staff members

2. Potential Adopters
   - Applicants with active adoption applications
   - Users with general inquiries about pets
   - First-time and experienced adopters

### 2.2 Basic Persona Details

Rescue Staff - Lisa

- 38-year-old adoption coordinator
- Manages communications with multiple potential adopters
- Needs to efficiently respond to inquiries and application questions
- Often works on mobile devices while at the shelter
- Primary goal: Effectively communicate with adopters to facilitate successful adoptions

Potential Adopter - James

- 32-year-old first-time pet adopter
- Has submitted applications for several pets
- Needs clear communication about application status and pet information
- Expects prompt responses to questions
- Primary goal: Get timely updates and information about adoption opportunities

### 2.3 Role-based Access

Rescue Staff

- Initiate and participate in conversations with potential adopters
- Access all conversations related to their rescue organization
- Send and receive messages, including file attachments
- View read receipts and typing indicators
- Archive or lock conversations when needed
- Access conversation history for reference

Potential Adopter

- Initiate and participate in conversations with rescue organizations
- Access only their own conversations
- Send and receive messages, including file attachments
- View read receipts and typing indicators
- Access conversation history for reference
- Receive notifications for new messages

Administrator

- Access all conversations across the platform
- Moderate content when necessary
- Resolve disputes between users
- Configure system-wide messaging settings
- View messaging analytics and metrics

## 3. User Stories

### 2.1 Chat Management

#### US-001: Create New Conversation ✅ IMPLEMENTED

**As a** user or rescue organization staff member,  
**I want to** create a new conversation  
**So that** I can communicate with another party about a pet adoption.

**Acceptance Criteria:**

- User can initiate a new conversation from the adoption application page
- Rescue staff can initiate a new conversation from the application dashboard
- Conversation is automatically linked to the relevant adoption application
- Both parties receive notification that a conversation has been created
- Conversation appears in the conversations list for both parties

#### US-002: View Conversation List ✅ IMPLEMENTED

**As a** user or rescue organization staff member,  
**I want to** view a list of all my conversations  
**So that** I can easily find and continue existing conversations.

**Acceptance Criteria:**

- Conversations are displayed in order of most recent activity
- Each conversation entry shows the other participant's name
- Each conversation entry shows a preview of the last message
- Each conversation entry shows the time of the last message
- Unread conversations are visually distinguished
- User can filter conversations by status (active, archived)

#### US-003: Access Conversation History ✅ IMPLEMENTED

**As a** user or rescue organization staff member,  
**I want to** view the complete history of a conversation  
**So that** I can reference previous discussions and agreements.

**Acceptance Criteria:**

- All messages in the conversation are displayed in chronological order
- System loads messages in paginated batches for performance
- User can scroll through the entire conversation history
- Messages display sender name, timestamp, and content
- File attachments are accessible with their original filenames

#### US-004: Archive Conversation ✅ IMPLEMENTED

**As a** rescue organization staff member,  
**I want to** archive a conversation  
**So that** I can keep my active conversations list manageable.

**Acceptance Criteria:**

- Staff can archive a conversation from the conversation view
- Archived conversations are moved to a separate "Archived" section
- Archived conversations can be restored to active status if needed
- Archiving a conversation does not delete any messages
- Both parties are notified when a conversation is archived

### 2.2 Messaging Features

#### US-005: Send Text Message ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** send text messages in a conversation  
**So that** I can communicate with the other party.

**Acceptance Criteria:**

- User can type and send text messages
- Messages are delivered in real-time when both parties are online
- Messages are stored when recipient is offline and delivered when they return
- User can see delivery status of their messages
- Messages support basic formatting (line breaks, etc.)

#### US-006: Send File Attachments ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** send file attachments in a conversation  
**So that** I can share relevant documents and images.

**Acceptance Criteria:**

- User can attach files from their device
- Supported file types include images, PDFs, and common document formats
- File size is limited to a reasonable maximum (e.g., 10MB)
- Images are displayed inline in the conversation
- Other file types show a preview if possible or a download link
- Files are securely stored and accessible only to conversation participants

#### US-007: See Typing Indicators ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** see when the other person is typing  
**So that** I know they are preparing a response.

**Acceptance Criteria:**

- Visual indicator appears when the other participant is typing
- Indicator disappears when typing stops or message is sent
- Indicator shows "X is typing..." text or an appropriate icon
- Indicator updates in real-time

#### US-008: View Read Receipts ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** see when my messages have been read  
**So that** I know the other party has seen my communication.

**Acceptance Criteria:**

- Messages show a "delivered" status when successfully sent
- Messages show a "read" status when viewed by the recipient
- Read status updates in real-time when possible
- Read status is persisted across sessions

#### US-009: React to Messages ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** add emoji reactions to messages  
**So that** I can quickly respond without typing a full message.

**Acceptance Criteria:**

- User can select from a standard set of emoji reactions
- Reactions are visible to all participants
- Multiple reactions can be added to a single message
- User can remove their own reactions
- Reactions show count and list of users who reacted

#### US-010: Receive Message Notifications ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** receive notifications for new messages  
**So that** I don't miss important communications.

**Acceptance Criteria:**

- User receives in-app notifications for new messages
- Notification shows sender name and message preview
- Clicking notification navigates to the conversation
- Notification preferences can be configured by the user
- Notifications are marked as read when conversation is viewed

#### US-011: Get Conversation Reminders 🔄 PLANNED

**As a** rescue organization staff member,  
**I want to** receive reminders about unanswered conversations  
**So that** no inquiries are accidentally ignored.

**Acceptance Criteria:**

- System identifies conversations without staff response for 24+ hours
- Staff receives daily digest of unanswered conversations
- Reminders include conversation link, applicant name, and time since last message
- Reminders can be dismissed or snoozed
- Reminder frequency can be configured in system settings

#### US-012: Secure Messaging Access ✅ IMPLEMENTED

**As a** system administrator,  
**I want to** ensure conversations are only accessible to authorized participants  
**So that** user privacy and data security are maintained.

**Acceptance Criteria:**

- Users can only view conversations they are participants in
- Authentication is required for all messaging functions
- Message content is encrypted in transit
- Access attempts to unauthorized conversations are logged and blocked
- API endpoints validate user permissions before returning data

#### US-013: Report Inappropriate Content 🔄 PLANNED

**As a** conversation participant,  
**I want to** report inappropriate or offensive messages  
**So that** platform rules can be enforced and users protected.

**Acceptance Criteria:**

- User can report individual messages from the UI
- Report includes reason category and optional description
- Reported messages are flagged for admin review
- User receives confirmation when report is submitted
- Admins can view, investigate, and take action on reports

#### US-014: Recover from Connection Loss ✅ IMPLEMENTED

**As a** conversation participant,  
**I want the** system to handle temporary connection losses gracefully  
**So that** I don't lose messages I'm composing or miss incoming messages.

**Acceptance Criteria:**

- Messages composed during offline periods are stored locally
- System attempts to send queued messages when connection is restored
- User is notified of connection status (connected/disconnected)
- Message history is synchronized after reconnection
- System provides retry options for failed message sends

#### US-015: Handle Message Delivery Failures ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** be informed when messages fail to deliver  
**So that** I can take appropriate action.

**Acceptance Criteria:**

- System displays clear error messages for delivery failures
- User can retry sending failed messages with a single click
- System automatically retries delivery a reasonable number of times
- Persistent failures provide troubleshooting information
- User can copy message content to preserve it if needed

#### US-016: Manage High Message Volume ✅ IMPLEMENTED

**As a** rescue organization with many active applications,  
**I want to** efficiently manage high volumes of conversations  
**So that** we can respond to all applicants in a timely manner.

**Acceptance Criteria:**

- Conversations can be sorted by various criteria (recency, unread, etc.)
- Conversations can be filtered by status, application stage, or custom tags
- Staff can assign conversations to specific team members
- System performance remains stable under high message volume
- Batch operations are available for common actions across multiple conversations

#### US-017: Transfer Conversation Ownership 🔄 PLANNED

**As a** rescue organization admin,  
**I want to** transfer ownership of conversations between staff members  
**So that** we can manage staff changes and workload balancing.

**Acceptance Criteria:**

- Admin can reassign conversations to different staff members
- Transfer includes complete conversation history
- Both the original and new owner receive notification of the transfer
- Applicant is informed when a new staff member takes over
- Conversation maintains continuity after transfer

#### US-018: Handle Inactive Conversations ✅ IMPLEMENTED

**As a** system administrator,  
**I want to** automatically identify and manage inactive conversations  
**So that** system resources are used efficiently.

**Acceptance Criteria:**

- System identifies conversations with no activity for 30+ days
- Inactive conversations are flagged for potential archiving
- Staff receive notification about conversations recommended for archiving
- Automatic archiving can be enabled or disabled in system settings
- Archived conversations remain accessible in the archived section

#### US-019: Search Message Content ✅ IMPLEMENTED

**As a** conversation participant,  
**I want to** search for specific content within my conversations  
**So that** I can quickly find important information.

**Acceptance Criteria:**

- User can search across all their conversations
- Search supports keywords, phrases, and basic filters
- Results show conversation context and highlight matching terms
- Search includes content in text messages and file names
- Results are sorted by relevance or chronology (user selectable)
- Search performance remains responsive even with large message history

#### US-020: Participate in Multi-User Conversations ✅ IMPLEMENTED

**As a** rescue organization staff member or adopter,  
**I want to** participate in conversations with multiple team members and users  
**So that** we can collaborate on adoption decisions and share information efficiently.

**Acceptance Criteria:**

- Conversations can include multiple participants from both rescue staff and adopters
- All participants can see the complete message history
- New participants can be added to existing conversations
- Participants can be removed from conversations when appropriate
- Message notifications are sent to all conversation participants
- Read receipts are tracked individually for each participant

## 4. Future Enhancements

### 4.1 Feature Roadmap

#### Short-term (Next Release)

- **Real-time Messaging with Socket.IO** 🔌

  - Implement Socket.IO for real-time communication
  - Replace current polling mechanism with push-based updates
  - Enable instant message delivery and status updates

- **Content Reporting** 🚩

  - Allow users to report inappropriate content (US-013)
  - Create moderation workflow for administrators
  - Implement content filtering and safety measures

- **Analytics Dashboard** 📊
  - Track user engagement metrics
  - Monitor system performance
  - Generate insights on conversation patterns

#### Medium-term (3-6 Months)

- **Conversation Reminders** ⏰

  - Notify staff about unanswered conversations (US-011)
  - Configure reminder schedules and priorities
  - Implement intelligent routing for unanswered messages

- **Conversation Ownership Transfer** 🔄

  - Allow reassigning conversations between staff (US-017)
  - Maintain conversation history during transfers
  - Implement handoff protocols and notifications

- **Offline Support** 📶

  - Handle connection loss gracefully (US-014)
  - Implement message queueing and retry mechanisms
  - Synchronize messages when connection is restored

- **Advanced Group Chat Features**
  - Enhanced role-based permissions within group chats
  - Group creation and management interface
  - Participant administration tools
  - Chat visibility and privacy controls

#### Long-term (6+ Months)

- **Advanced File Sharing**

  - Preview documents directly in the chat
  - Enhance file organization and management
  - Support larger file sizes and more formats

- **Push Notifications**

  - Alert users of new messages when offline
  - Implement platform-specific notification services
  - Allow granular notification preferences

- **Voice and Video Chat**

  - Real-time audio/video communication
  - Screen sharing capabilities
  - Recording and playback features

- **Chatbots**
  - Automated responses for common questions
  - Intelligent routing to appropriate staff
  - Integration with AI services for enhanced capabilities

### 4.2 Technical Improvements

#### Short-term

- Socket.IO integration for real-time updates
- Optimized database queries for high message volume
- Enhanced error handling and recovery
- Performance monitoring and analytics

#### Medium-term

- End-to-end encryption for enhanced privacy
- Offline message queuing and synchronization
- Enhanced analytics with machine learning for insights
- Advanced caching strategies for faster message retrieval

#### Long-term

- WebRTC integration for audio/video communication
- Multi-language support with automatic translation
- Voice-to-text and text-to-voice capabilities
- Advanced search functionality across conversations
- Performance optimizations for mobile networks
