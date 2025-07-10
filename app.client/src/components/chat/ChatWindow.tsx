import { useChat } from '@/contexts/ChatContext';
import { Button, Spinner } from '@adopt-dont-shop/components';
import { useEffect, useRef, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.background.primary};
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 1.25rem 1.5rem 1.25rem 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  display: flex;
  align-items: center;
  gap: 1.2rem;
  background: linear-gradient(
    90deg,
    ${props => props.theme.colors.primary.light},
    ${props => props.theme.colors.primary.main}
  );
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-height: 64px;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
    min-height: 56px;
  }
`;

const BackButton = styled(Button)`
  display: none;
  padding: 0.5rem;
  min-width: auto;
  border-radius: 50%;
  background: ${props => props.theme.background.primary};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);

  @media (max-width: 768px) {
    display: flex;
  }
`;

const ConversationInfo = styled.div`
  flex: 1;

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: ${props => props.theme.text.primary};
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: ${props => props.theme.text.secondary};
  }
`;

const ChatBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
  background: ${props => props.theme.background.secondary};
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;

  @media (max-width: 768px) {
    padding: 0.25rem 0;
  }
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
  background: ${props => props.theme.colors.semantic.error.light};
  border: 1px solid ${props => props.theme.colors.semantic.error.dark};
  color: ${props => props.theme.colors.semantic.error.main};
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
  border-radius: 12px;
  margin: 0.5rem 0 0.5rem 0;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.03);
  padding: 1.2rem 1rem 0.5rem 1rem;

  @media (max-width: 768px) {
    border-radius: 8px;
    margin: 0.25rem 0;
    padding: 0.7rem 0.5rem 0.3rem 0.5rem;
  }
`;

const TypingContainer = styled.div`
  padding: 0.5rem 1rem 0.5rem 0.5rem;
`;

const InputArea = styled.div`
  background: ${props => props.theme.background.primary};
  border-top: 1px solid ${props => props.theme.border.color.secondary};
  padding: 0.5rem 1rem 0.5rem 1rem;

  @media (max-width: 768px) {
    padding: 0.25rem 0.5rem;
  }
`;

export function ChatWindow() {
  const navigate = useNavigate();
  const {
    activeConversation,
    messages,
    isLoading,
    error,
    sendMessage,
    setActiveConversation,
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
    if (!container) return;
    const threshold = 80; // px
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setAutoScroll(atBottom);
  };

  const handleBackClick = () => {
    setActiveConversation(null);
    navigate('/chat');
  };

  const handleSendMessage = async (attachments?: File[]) => {
    if (!messageText.trim() && (!attachments || attachments.length === 0)) return;
    if (isSending) return;

    try {
      setIsSending(true);
      await sendMessage(messageText.trim(), attachments);
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
        startTyping(activeConversation.id);
      } else {
        stopTyping(activeConversation.id);
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

  return (
    <ChatContainer>
      <ChatHeader>
        <BackButton
          variant='ghost'
          size='sm'
          onClick={handleBackClick}
          aria-label='Back to conversations'
        >
          <MdArrowBack size={20} />
        </BackButton>

        <ConversationInfo>
          <h3>Rescue Organization</h3>
          <p>
            {activeConversation.petId
              ? `About Pet #${activeConversation.petId}`
              : 'General conversation'}
          </p>
        </ConversationInfo>
      </ChatHeader>

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
              {typingUsers.length > 0 && (
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
                placeholder='Type your message...'
              />
            </InputArea>
          </>
        )}
      </ChatBody>
    </ChatContainer>
  );
}
