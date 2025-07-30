import React, { useState } from 'react';
import styled from 'styled-components';
import { Card, Heading, Text, Button } from '@adopt-dont-shop/components';
import { FiX, FiSend, FiPaperclip } from 'react-icons/fi';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled(Card)`
  width: 100%;
  max-width: 600px;
  height: 600px;
  display: flex;
  flex-direction: column;
`;

const ChatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

interface Application {
  application_id: string;
  applicant_name: string;
  applicant_email: string;
  pet_name: string;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sent_by_rescue: boolean;
}

interface ApplicationChatProps {
  application: Application;
  onClose: () => void;
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! Thank you for your interest in adopting Buddy. We received your application and are reviewing it.',
    timestamp: '2025-01-28T10:30:00Z',
    sent_by_rescue: true,
  },
  {
    id: '2',
    content: 'Thank you for the quick response! I\'m very excited about the possibility of adopting Buddy. Is there any additional information you need from me?',
    timestamp: '2025-01-28T11:15:00Z',
    sent_by_rescue: false,
  },
  {
    id: '3',
    content: 'Your application looks great! We would like to schedule a home visit. Are you available this weekend?',
    timestamp: '2025-01-28T14:20:00Z',
    sent_by_rescue: true,
  },
  {
    id: '4',
    content: 'Yes, I\'m available on Saturday afternoon or Sunday morning. What time works best for you?',
    timestamp: '2025-01-28T14:45:00Z',
    sent_by_rescue: false,
  },
];

export const ApplicationChat: React.FC<ApplicationChatProps> = ({
  application,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        sent_by_rescue: true,
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
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ChatHeader>
          <div>
            <Heading level="h3">Chat with {application.applicant_name}</Heading>
            <Text color="muted" size="sm">
              Application for {application.pet_name}
            </Text>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <FiX />
          </Button>
        </ChatHeader>

        <MessagesContainer>
          {messages.map((message) => (
            <div key={message.id}>
              <Message sent={message.sent_by_rescue}>
                {message.content}
                <MessageTime>
                  {formatTime(message.timestamp)}
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
      </ModalContent>
    </ModalOverlay>
  );
};
