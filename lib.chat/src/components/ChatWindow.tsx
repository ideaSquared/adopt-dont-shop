import { Button, Spinner } from '@adopt-dont-shop/lib.components';
import { useEffect, useRef, useState } from 'react';
import { MdArrowBack } from 'react-icons/md';
import { useChat } from '../context/use-chat';
import type { Conversation } from '../types';
import * as styles from './ChatWindow.css';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

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
      <div className={styles.chatContainer}>
        <div className={styles.emptyState}>
          <div className="illustration" aria-hidden>
            {'\u{1F4AC}'}
          </div>
          <h3>No conversation selected</h3>
          <p>Pick a conversation from the list to start messaging.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chatContainer}>
        <div className={styles.errorMessage}>Error loading messages: {error}</div>
      </div>
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
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <Button
          className={styles.backButton}
          variant="ghost"
          size="sm"
          onClick={handleBackClick}
          aria-label="Back to conversations"
        >
          <MdArrowBack size={20} />
        </Button>

        <div className={styles.headerAvatar} aria-hidden>
          {initials}
        </div>

        <div className={styles.conversationInfo}>
          <h3>{rescueName}</h3>
          <p>
            {activeConversation.petId
              ? `About Pet #${activeConversation.petId}`
              : 'General conversation'}
          </p>
        </div>
      </div>

      <div className={styles.chatBody}>
        {isLoading && (!messages || messages.length === 0) ? (
          <div className={styles.loadingContainer}>
            <Spinner />
          </div>
        ) : (
          <>
            <div
              className={styles.messagesContainer}
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              <MessageList messages={messages} onToggleReaction={toggleReaction} />
              <div ref={messagesEndRef} />
              {typingUsers.length > 0 && (
                <div className={styles.typingContainerWrap}>
                  {typingUsers.map((userName) => (
                    <TypingIndicator key={userName} userName={userName} />
                  ))}
                </div>
              )}
            </div>
            <div className={styles.inputArea}>
              <MessageInput
                value={messageText}
                onChange={setMessageText}
                onSend={handleSendMessage}
                onKeyPress={handleKeyPress}
                onTyping={handleTyping}
                disabled={isSending}
                placeholder="Type your message..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
