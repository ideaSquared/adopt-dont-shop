import { useChat } from '@/contexts/ChatContext';
import { Spinner } from '@adopt-dont-shop/lib.components';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 0;
  background: ${props => props.theme.background.primary};
  border-radius: 0;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${props => props.theme.background.secondary};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 64px;

  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
    min-height: 56px;
  }
`;

const ConversationInfo = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 1.125rem;
    color: ${props => props.theme.text.primary};
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  p {
    margin: 0.125rem 0 0 0;
    font-size: 0.8125rem;
    color: ${props => props.theme.text.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
`;

const ChatBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: ${props => props.theme.background.primary};
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
  color: ${props => props.theme.text.secondary};

  h3 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.text.primary};
    font-size: 1.2rem;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 1rem;
  }
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${props => props.theme.background.secondary};
`;

const ErrorMessage = styled.div`
  margin: 1.5rem;
  padding: 1.25rem;
  background: ${props => props.theme.colors.semantic.error[100]};
  border: 1px solid ${props => props.theme.colors.semantic.error[600]};
  color: ${props => props.theme.colors.semantic.error[500]};
  border-radius: ${props => props.theme.border.radius.md};
  text-align: center;
  font-size: 1.05rem;
`;

const MessagesContainer = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${props => props.theme.background.primary};
`;

const TypingContainer = styled.div`
  padding: 0.5rem 1rem;
`;

const InputArea = styled.div`
  flex: 0 0 auto;
  background: ${props => props.theme.background.primary};
`;

export function ChatWindow() {
  const {
    activeConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    typingUsers,
    startTyping,
    stopTyping,
  } = useChat();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Only scroll to bottom if user is already near the bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation, autoScroll]);

  // Detect if user is at the bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    const threshold = 80; // px
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setAutoScroll(atBottom);
  };

  const handleSendMessage = async (attachments?: File[]) => {
    if (!messageText.trim() && (!attachments || attachments.length === 0)) {
      return;
    }
    if (isSending) {
      return;
    }
    if (!activeConversation) {
      return;
    }

    try {
      setIsSending(true);
      await sendMessage(messageText.trim(), activeConversation.id);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (activeConversation) {
      if (isTyping) {
        startTyping?.(activeConversation.id);
      } else {
        stopTyping?.(activeConversation.id);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!activeConversation) {
    return (
      <ChatContainer>
        <EmptyState>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the list to start messaging</p>
        </EmptyState>
      </ChatContainer>
    );
  }

  if (error) {
    return (
      <ChatContainer>
        <ErrorMessage>Error loading messages: {error}</ErrorMessage>
      </ChatContainer>
    );
  }

  // For rescue app, show adopter name (not rescue name)
  let adopterName = '';
  if (Array.isArray(activeConversation.participants)) {
    const adopterParticipant = activeConversation.participants.find(
      p => p.type === 'user' || p.type === 'admin'
    );
    adopterName = adopterParticipant?.name || '';
  }
  if (!adopterName) {
    adopterName = 'Adopter';
  }

  return (
    <ChatContainer>
      <ChatHeader>
        <ConversationInfo>
          <h3>{adopterName}</h3>
          <p>
            {activeConversation.petId
              ? `About Pet #${activeConversation.petId}`
              : 'General conversation'}
          </p>
        </ConversationInfo>
      </ChatHeader>

      <ConnectionStatusBanner />

      <ChatBody>
        {isLoading && (!messages || messages.length === 0) ? (
          <LoadingContainer>
            <Spinner />
          </LoadingContainer>
        ) : (
          <>
            <MessagesContainer ref={messagesContainerRef} onScroll={handleScroll}>
              <MessageList messages={messages} />
              <div ref={messagesEndRef} />
              {typingUsers && typingUsers.length > 0 && (
                <TypingContainer>
                  {typingUsers.map(userName => (
                    <TypingIndicator key={userName} userName={userName} />
                  ))}
                </TypingContainer>
              )}
            </MessagesContainer>
            <InputArea>
              <MessageInput
                value={messageText}
                onChange={setMessageText}
                onSend={handleSendMessage}
                onKeyPress={handleKeyPress}
                onTyping={handleTyping}
                disabled={isSending}
                placeholder="Type your message..."
              />
            </InputArea>
          </>
        )}
      </ChatBody>
    </ChatContainer>
  );
}
