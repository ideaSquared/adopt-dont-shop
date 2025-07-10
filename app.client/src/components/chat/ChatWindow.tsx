import { useChat } from '@/contexts/ChatContext';
import { Button, Spinner } from '@adopt-dont-shop/components';
import { useState } from 'react';
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
`;

const ChatHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${props => props.theme.border.color.secondary};
  display: flex;
  align-items: center;
  gap: 1rem;
  background: ${props => props.theme.background.secondary};

  @media (max-width: 768px) {
    padding: 0.75rem;
  }
`;

const BackButton = styled(Button)`
  display: none;
  padding: 0.5rem;
  min-width: auto;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const ConversationInfo = styled.div`
  flex: 1;

  h3 {
    margin: 0;
    font-size: 1rem;
    color: ${props => props.theme.text.primary};
  }

  p {
    margin: 0;
    font-size: 0.8rem;
    color: ${props => props.theme.text.secondary};
  }
`;

const ChatBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for flex child overflow */
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.text.secondary};

  h3 {
    margin: 0 0 0.5rem 0;
    color: ${props => props.theme.text.primary};
  }

  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ErrorMessage = styled.div`
  margin: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.semantic.error[50]};
  border: 1px solid ${props => props.theme.colors.semantic.error[200]};
  color: ${props => props.theme.colors.semantic.error[700]};
  border-radius: ${props => props.theme.border.radius.md};
  text-align: center;
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
            <MessageList messages={messages} />
            {typingUsers.length > 0 && (
              <div style={{ padding: '0.5rem 1rem' }}>
                {typingUsers.map(userName => (
                  <TypingIndicator key={userName} userName={userName} />
                ))}
              </div>
            )}
            <MessageInput
              value={messageText}
              onChange={setMessageText}
              onSend={handleSendMessage}
              onKeyPress={handleKeyPress}
              onTyping={handleTyping}
              disabled={isSending}
              placeholder='Type your message...'
            />
          </>
        )}
      </ChatBody>
    </ChatContainer>
  );
}
