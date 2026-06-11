import { TextArea } from '@adopt-dont-shop/lib.components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdAttachFile, MdClose, MdSend } from 'react-icons/md';
import * as styles from './MessageInput.css';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments?: File[]) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  acceptedFileTypes?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

const TYPING_TIMEOUT = 3000; // 3 seconds
const DEFAULT_MAX_LENGTH = 10000;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_MAX_FILES = 10;
const DEFAULT_ACCEPTED_TYPES = 'image/*,application/pdf,.doc,.docx,.txt';

export function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  onTyping,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = DEFAULT_MAX_LENGTH,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
}: MessageInputProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB.`;
    }

    const allowedTypes = acceptedFileTypes.split(',').map((type) => type.trim());
    const isValidType = allowedTypes.some((type) => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File "${file.name}" is not a supported file type.`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (attachments.length + files.length > maxFiles) {
      alert(`You can only attach up to ${maxFiles} files.`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if ((value.trim() || attachments.length > 0) && !disabled) {
      onSend(attachments.length > 0 ? attachments : undefined);
      setAttachments([]);
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

  const canSend = (value.trim() || attachments.length > 0) && !disabled;
  const remainingChars = maxLength - value.length;

  return (
    <div className={styles.inputContainer}>
      {attachments.length > 0 && (
        <div className={styles.attachmentPreview} role="list" aria-label="Attached files">
          {attachments.map((file, index) => (
            <div key={`${file.name}-${index}`} className={styles.attachmentItem} role="listitem">
              <span className={styles.attachmentName} title={file.name}>
                {file.name}
              </span>
              <button
                className={styles.removeButton}
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
                type="button"
              >
                <MdClose />
              </button>
            </div>
          ))}
        </div>
      )}

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
            aria-describedby="char-count file-input-help"
          />
        </div>

        <label className={styles.attachButton}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
            disabled={disabled || attachments.length >= maxFiles}
            aria-describedby="file-input-help"
            className={styles.hiddenFileInput}
          />
          <MdAttachFile size={20} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Attach files</span>
        </label>

        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          type="button"
        >
          <MdSend size={20} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.inputFooter}>
        <span id="file-input-help">{maxFiles - attachments.length} file slots remaining</span>
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
