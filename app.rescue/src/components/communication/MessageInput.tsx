import { Button, TextArea } from '@adopt-dont-shop/lib.components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdAttachFile, MdClose, MdSend } from 'react-icons/md';
import styled from 'styled-components';

const InputContainer = styled.div`
  padding: 0.75rem 1rem 1.25rem 1rem;
  background: ${props => props.theme.background.primary};
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
`;

const MessageTextArea = styled(TextArea)`
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  max-height: 120px;
  resize: none;
  border-radius: 22px;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  line-height: 1.4;
  background: ${props => props.theme.background.secondary};
  border: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;

  &:focus {
    outline: none;
    background: ${props => props.theme.background.primary};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
  }

  &::placeholder {
    color: ${props => props.theme.text.secondary};
  }
`;

const AttachmentPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.theme.colors.primary[100]};
  border: 1px solid ${props => props.theme.colors.primary[500]};
  border-radius: 18px;
  font-size: 0.875rem;
`;

const AttachmentName = styled.span`
  color: ${props => props.theme.text.primary};
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: ${props => props.theme.colors.semantic.error[500]};
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.semantic.error[600]};
    transform: scale(1.1);
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.semantic.error[200]};
    outline-offset: 2px;
  }
`;

const AttachButton = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  background: ${props => props.theme.background.secondary};
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${props => props.theme.text.secondary};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  &:hover {
    background: ${props => props.theme.colors.primary[100]};
    border-color: ${props => props.theme.colors.primary[500]};
    color: ${props => props.theme.colors.primary[500]};
    transform: scale(1.05);
  }

  &:focus-within {
    outline: 2px solid ${props => props.theme.colors.primary[500]};
    outline-offset: 2px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

const SendButton = styled(Button)`
  min-width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  background: ${props => props.theme.colors.primary[500]};
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);

  &:enabled:hover {
    transform: scale(1.05);
  }

  &:enabled:active {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

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

    const allowedTypes = acceptedFileTypes.split(',').map(type => type.trim());
    const isValidType = allowedTypes.some(type => {
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
      setAttachments(prev => [...prev, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
    <InputContainer>
      {attachments.length > 0 && (
        <AttachmentPreview role="list" aria-label="Attached files">
          {attachments.map((file, index) => (
            <AttachmentItem key={`${file.name}-${index}`} role="listitem">
              <AttachmentName title={file.name}>{file.name}</AttachmentName>
              <RemoveButton
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
                type="button"
              >
                <MdClose />
              </RemoveButton>
            </AttachmentItem>
          ))}
        </AttachmentPreview>
      )}

      <InputRow>
        <MessageTextArea
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

        <AttachButton>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
            disabled={disabled || attachments.length >= maxFiles}
            aria-describedby="file-input-help"
          />
          <MdAttachFile size={20} aria-hidden="true" />
          <VisuallyHidden>Attach files</VisuallyHidden>
        </AttachButton>

        <SendButton
          onClick={handleSend}
          disabled={!canSend}
          variant="primary"
          aria-label="Send message"
        >
          <MdSend size={20} aria-hidden="true" />
        </SendButton>
      </InputRow>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#666',
        }}
      >
        <span id="file-input-help">{maxFiles - attachments.length} file slots remaining</span>
        <span
          id="char-count"
          style={{
            color: remainingChars < 100 ? '#ef4444' : '#666',
          }}
        >
          {remainingChars} characters remaining
        </span>
      </div>
    </InputContainer>
  );
}
