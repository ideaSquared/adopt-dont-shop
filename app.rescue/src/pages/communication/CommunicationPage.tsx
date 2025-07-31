import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Card,
  CardContent,
  Heading,
  Text,
  Button,
  Container,
  Badge,
  Input,
  Avatar,
} from '@adopt-dont-shop/components';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { 
  FiSearch, 
  FiPlus, 
  FiMessageCircle,
  FiSend,
  FiPaperclip,
  FiPhone,
  FiVideo
} from 'react-icons/fi';

// Styled Components
const CommunicationContainer = styled(Container)`
  max-width: 1400px;
  padding: 2rem 1rem;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
`;

const CommunicationLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ConversationsList = styled(Card)`
  display: flex;
  flex-direction: column;
  max-height: 100%;
`;

const ConversationsHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SearchContainer = styled.div`
  position: relative;
  margin: 1rem;
`;

const SearchIcon = styled(FiSearch)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  z-index: 1;
`;

const SearchInput = styled(Input)`
  padding-left: 40px;
`;

const ConversationItem = styled.div<{ active: boolean }>`
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background: ${props => props.active ? '#f8f9fa' : 'transparent'};

  &:hover {
    background: #f8f9fa;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ConversationInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ConversationDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const ConversationMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
`;

const ConversationPreview = styled.div`
  font-size: 0.85rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatArea = styled(Card)`
  display: flex;
  flex-direction: column;
  max-height: 100%;
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatHeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ChatActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
`;

const Message = styled.div<{ sent: boolean }>`
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  align-self: ${props => props.sent ? 'flex-end' : 'flex-start'};
  background: ${props => props.sent ? '#007bff' : '#f8f9fa'};
  color: ${props => props.sent ? 'white' : '#333'};
`;

const MessageTime = styled.div`
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
  text-align: right;
`;

const MessageInput = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  align-items: flex-end;
`;

const InputArea = styled.textarea`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;

  &:focus {
    border-color: #007bff;
  }
`;

const EmptyChat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
`;

interface Conversation {
  id: string;
  participant_name: string;
  participant_email: string;
  participant_avatar?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  application_id?: string;
  pet_name?: string;
  type: 'application' | 'general' | 'staff';
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sent_by_rescue: boolean;
  sender_name: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    participant_name: 'Sarah Johnson',
    participant_email: 'sarah.johnson@email.com',
    participant_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    last_message: 'Thank you for considering my application for Buddy!',
    last_message_time: '2025-01-29T09:30:00Z',
    unread_count: 2,
    application_id: 'app-1',
    pet_name: 'Buddy',
    type: 'application',
  },
  {
    id: '2',
    participant_name: 'Mike Chen',
    participant_email: 'mike.chen@email.com',
    participant_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    last_message: 'When would be a good time for the home visit?',
    last_message_time: '2025-01-29T08:15:00Z',
    unread_count: 0,
    application_id: 'app-2',
    pet_name: 'Luna',
    type: 'application',
  },
  {
    id: '3',
    participant_name: 'Emily Rodriguez',
    participant_email: 'emily.rodriguez@email.com',
    participant_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    last_message: 'The adoption went smoothly, thank you so much!',
    last_message_time: '2025-01-28T16:45:00Z',
    unread_count: 0,
    application_id: 'app-3',
    pet_name: 'Max',
    type: 'application',
  },
  {
    id: '4',
    participant_name: 'David Wilson',
    participant_email: 'david.wilson@rescue.org',
    participant_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    last_message: 'Can we schedule a team meeting for next week?',
    last_message_time: '2025-01-28T14:20:00Z',
    unread_count: 1,
    type: 'staff',
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! Thank you for your interest in adopting Buddy. We received your application and are reviewing it.',
    timestamp: '2025-01-28T10:30:00Z',
    sent_by_rescue: true,
    sender_name: 'Rescue Team',
  },
  {
    id: '2',
    content: 'Thank you for the quick response! I\'m very excited about the possibility of adopting Buddy. Is there any additional information you need from me?',
    timestamp: '2025-01-28T11:15:00Z',
    sent_by_rescue: false,
    sender_name: 'Sarah Johnson',
  },
  {
    id: '3',
    content: 'Your application looks great! We would like to schedule a home visit. Are you available this weekend?',
    timestamp: '2025-01-28T14:20:00Z',
    sent_by_rescue: true,
    sender_name: 'Rescue Team',
  },
  {
    id: '4',
    content: 'Yes, I\'m available on Saturday afternoon or Sunday morning. What time works best for you?',
    timestamp: '2025-01-29T09:30:00Z',
    sent_by_rescue: false,
    sender_name: 'Sarah Johnson',
  },
];

/**
 * CommunicationPage component for rescue team communications
 * Provides chat interface for applicant communications and internal messaging
 */
export const CommunicationPage: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const canViewCommunications = hasPermission('applications.read' as const) || hasPermission('users.read' as const);

  if (!canViewCommunications) {
    return (
      <CommunicationContainer>
        <Card>
          <CardContent style={{ textAlign: 'center', padding: '3rem' }}>
            <Heading level="h3">Access Denied</Heading>
            <Text color="muted">
              You don't have permission to view communications.
            </Text>
          </CardContent>
        </Card>
      </CommunicationContainer>
    );
  }

  const filteredConversations = mockConversations.filter(conv =>
    searchTerm === '' ||
    conv.participant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conv.pet_name && conv.pet_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        sent_by_rescue: true,
        sender_name: `${user?.firstName} ${user?.lastName}` || 'Rescue Team',
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // TODO: Send message to backend API
      console.log('Sending message:', message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <CommunicationContainer>
      <div style={{ marginBottom: '1.5rem' }}>
        <Heading level="h1">Communications</Heading>
        <Text color="muted">Manage conversations with adopters and team members</Text>
      </div>

      <CommunicationLayout>
        {/* Conversations List */}
        <ConversationsList>
          <ConversationsHeader>
            <Heading level="h3">Conversations</Heading>
            <Button size="sm" variant="outline">
              <FiPlus />
            </Button>
          </ConversationsHeader>

          <SearchContainer>
            <SearchIcon />
            <SearchInput
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchContainer>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                active={selectedConversation?.id === conversation.id}
                onClick={() => setSelectedConversation(conversation)}
              >
                <ConversationInfo>
                  <Avatar
                    src={conversation.participant_avatar}
                    alt={conversation.participant_name}
                    size="md"
                  />
                  <ConversationDetails>
                    <ConversationMeta>
                      <Text weight="bold" size="sm">
                        {conversation.participant_name}
                      </Text>
                      <Text size="xs" color="muted">
                        {formatTime(conversation.last_message_time)}
                      </Text>
                    </ConversationMeta>
                    {conversation.pet_name && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <Badge variant="outline" size="sm">
                          {conversation.pet_name}
                        </Badge>
                      </div>
                    )}
                    <ConversationPreview>
                      {conversation.last_message}
                    </ConversationPreview>
                  </ConversationDetails>
                  {conversation.unread_count > 0 && (
                    <Badge variant="primary" size="sm">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </ConversationInfo>
              </ConversationItem>
            ))}
          </div>
        </ConversationsList>

        {/* Chat Area */}
        <ChatArea>
          {selectedConversation ? (
            <>
              <ChatHeader>
                <ChatHeaderInfo>
                  <Avatar
                    src={selectedConversation.participant_avatar}
                    alt={selectedConversation.participant_name}
                    size="md"
                  />
                  <div>
                    <Heading level="h4">{selectedConversation.participant_name}</Heading>
                    <Text size="sm" color="muted">
                      {selectedConversation.participant_email}
                      {selectedConversation.pet_name && ` • ${selectedConversation.pet_name}`}
                    </Text>
                  </div>
                </ChatHeaderInfo>
                <ChatActions>
                  <Button variant="outline" size="sm">
                    <FiPhone />
                  </Button>
                  <Button variant="outline" size="sm">
                    <FiVideo />
                  </Button>
                </ChatActions>
              </ChatHeader>

              <MessagesContainer>
                {messages.map((message) => (
                  <div key={message.id}>
                    <Message sent={message.sent_by_rescue}>
                      {message.content}
                      <MessageTime>
                        {formatMessageTime(message.timestamp)} • {message.sender_name}
                      </MessageTime>
                    </Message>
                  </div>
                ))}
              </MessagesContainer>

              <MessageInput>
                <Button variant="outline" size="sm">
                  <FiPaperclip />
                </Button>
                <InputArea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  <FiSend />
                </Button>
              </MessageInput>
            </>
          ) : (
            <EmptyChat>
              <FiMessageCircle size={48} style={{ marginBottom: '1rem' }} />
              <Heading level="h3">Select a conversation</Heading>
              <Text color="muted">
                Choose a conversation from the list to start messaging
              </Text>
            </EmptyChat>
          )}
        </ChatArea>
      </CommunicationLayout>
    </CommunicationContainer>
  );
};
