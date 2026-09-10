import { TextArea } from '@adopt-dont-shop/lib.components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import * as styles from './MessageInput.css';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const DEFAULT_MAX_LENGTH = 10000;

export function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  onTyping,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = DEFAULT_MAX_LENGTH,
}: MessageInputProps) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleTypingStart = useCallback(() => {
    if (!isTyping && onTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (onTyping) {
        onTyping(false);
      }
    }, TYPING_TIMEOUT);
  }, [isTyping, onTyping]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && onTyping) {
      setIsTyping(false);
      onTyping(false);
    }
  }, [isTyping, onTyping]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    if (newValue.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend();
      handleTypingStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    onKeyPress(e);

    // Handle Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim() !== '' && !disabled;
  const remainingChars = maxLength - value.length;

  return (
    <div className={styles.inputContainer}>
      <div className={styles.inputRow}>
        <div className={styles.messageTextAreaWrapper}>
          <TextArea
            ref={textAreaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            fullWidth={true}
            aria-label="Message input"
            aria-describedby="char-count"
          />
        </div>

        {/* File attachments are descoped pending a design (ADS-1317): no
            gateway route or service RPC exists to receive an upload, so
            the attach affordance that used to live here was removed
            rather than left pointing at a dead endpoint. */}

        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          type="button"
        >
          <Send size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.inputFooter}>
        <span
          id="char-count"
          className={remainingChars < 100 ? styles.charCountWarning : undefined}
        >
          {remainingChars} characters remaining
        </span>
      </div>
    </div>
  );
}
