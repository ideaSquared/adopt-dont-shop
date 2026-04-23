import { Button, Spinner } from '@adopt-dont-shop/lib.components';
import { useEffect, useRef, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import styled from 'styled-components';
import { useChat } from '../context/use-chat';
import type { Conversation } from '../types';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 0;
  background: ${(props) => props.theme.background.primary};
  border-radius: 0;
  overflow: hidden;
`;

const ChatHeader = styled.div`
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${(props) => props.theme.border.color.secondary};
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: ${(props) => props.theme.background.secondary};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 64px;

  @media (max-width: 768px) {
    padding: 0.875rem 1rem;
    min-height: 56px;
  }
`;

const BackButton = styled(Button)`
  @media (min-width: 769px) {
    display: none;
  }

  min-width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeaderAvatar = styled.div`
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.primary[700]};
  background: linear-gradient(
    135deg,
    ${(props) => props.theme.colors.primary[100]},
    ${(props) => props.theme.colors.primary[200]}
  );
  box-shadow: inset 0 0 0 2px ${(props) => props.theme.background.primary};
`;

const ConversationInfo = styled.div`
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 1.05rem;
    color: ${(props) => props.theme.text.primary};
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  p {
    margin: 0.125rem 0 0 0;
    font-size: 0.8125rem;
    color: ${(props) => props.theme.text.secondary};
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
  background: ${(props) => props.theme.background.primary};
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1.5rem;
  text-align: center;
  color: ${(props) => props.theme.text.secondary};

  .illustration {
    font-size: 3.5rem;
    opacity: 0.75;
    line-height: 1;
  }

  h3 {
    margin: 0;
    color: ${(props) => props.theme.text.primary};
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    max-width: 24rem;
    line-height: 1.5;
  }
`;

const LoadingContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: ${(props) => props.theme.background.secondary};
`;

const ErrorMessage = styled.div`
  margin: 1.5rem;
  padding: 1.25rem;
  background: ${(props) => props.theme.colors.semantic.error[100]};
  border: 1px solid ${(props) => props.theme.colors.semantic.error[600]};
  color: ${(props) => props.theme.colors.semantic.error[500]};
  border-radius: ${(props) => props.theme.border.radius.md};
  text-align: center;
  font-size: 1.05rem;
`;

const MessagesContainer = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${(props) => props.theme.background.primary};
`;

const TypingContainerWrap = styled.div`
  padding: 0.5rem 1rem;
`;

const InputArea = styled.div`
  flex: 0 0 auto;
  background: ${(props) => props.theme.background.primary};
`;

type ChatWindowProps = {
  /**
   * Called when the user hits the mobile back button. After this callback
   * runs the component also clears the active conversation via useChat's
   * setActiveConversation. Apps that sync URL state (e.g. pop `/chat/:id`
   * back to `/chat`) do that navigation here.
   */
  onBack?: () => void;
};

export function ChatWindow({ onBack }: ChatWindowProps) {
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
    toggleReaction,
    featureFlags,
  } = useChat();
  const { logEvent } = featureFlags;

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation, autoScroll]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    const threshold = 80;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setAutoScroll(atBottom);
  };

  const handleBackClick = () => {
    setActiveConversation(null);
    onBack?.();
  };

  const handleSendMessage = async (attachments?: File[]) => {
    if (!messageText.trim() && (!attachments || attachments.length === 0)) {
      return;
    }
    if (isSending) {
      return;
    }

    try {
      setIsSending(true);

      if (activeConversation) {
        logEvent('chat_message_sent', 1, {
          conversation_id: activeConversation.id.toString(),
          message_length: messageText.trim().length.toString(),
          has_attachments: attachments && attachments.length > 0 ? 'true' : 'false',
          attachment_count: attachments?.length.toString() || '0',
          pet_id: activeConversation.petId?.toString() || 'unknown',
          rescue_id: activeConversation.rescueId?.toString() || 'unknown',
        });
      }

      await sendMessage(messageText.trim(), attachments);
      setMessageText('');
    } catch (err) {
      console.error('Failed to send message:', err);

      if (activeConversation) {
        logEvent('chat_message_error', 1, {
          conversation_id: activeConversation.id.toString(),
          error_message: err instanceof Error ? err.message : 'unknown_error',
          pet_id: activeConversation.petId?.toString() || 'unknown',
        });
      }
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
          <div className="illustration" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <h3>No conversation selected</h3>
          <p>Pick a conversation from the list to start messaging.</p>
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

  type ConversationWithRescueName = Conversation & { rescueName?: string };
  const conversationTyped = activeConversation as ConversationWithRescueName;
  let rescueName = '';
  if (
    typeof conversationTyped.rescueName === 'string' &&
    conversationTyped.rescueName.trim().length > 0
  ) {
    rescueName = conversationTyped.rescueName;
  } else if (Array.isArray(conversationTyped.participants)) {
    const rescueParticipant = conversationTyped.participants.find((p) => p.type === 'rescue');
    rescueName = rescueParticipant?.name || '';
  }
  if (!rescueName) {
    rescueName = 'Rescue Organization';
  }

  const initials = (() => {
    const parts = rescueName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <ChatContainer>
      <ChatHeader>
        <BackButton
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          aria-label="Back to conversations"
        >
          <MdArrowBack size={20} />
        </BackButton>

        <HeaderAvatar aria-hidden>{initials}</HeaderAvatar>

        <ConversationInfo>
          <h3>{rescueName}</h3>
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
              <MessageList messages={messages} onToggleReaction={toggleReaction} />
              <div ref={messagesEndRef} />
              {typingUsers.length > 0 && (
                <TypingContainerWrap>
                  {typingUsers.map((userName) => (
                    <TypingIndicator key={userName} userName={userName} />
                  ))}
                </TypingContainerWrap>
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
