import { Button, TextArea } from '@adopt-dont-shop/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdAttachFile, MdClose, MdSend } from 'react-icons/md';
import styled from 'styled-components';

const InputContainer = styled.div`
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.border.color.secondary};
  background: ${props => props.theme.background.primary};
`;

const InputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
`;

const MessageTextArea = styled(TextArea)`
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  resize: none;
`;

const AttachmentPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const AttachmentItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${props => props.theme.background.secondary};
  border: 1px solid ${props => props.theme.border.color.secondary};
  border-radius: 4px;
  font-size: 0.875rem;
`;

const AttachmentRemove = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.text.secondary};
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;

  &:hover {
    color: ${props => props.theme.colors.semantic.error[500]};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const AttachButton = styled(Button)`
  padding: 0.5rem;
  min-width: auto;
  height: 40px;
`;

const SendButton = styled(Button)`
  padding: 0.5rem;
  min-width: auto;
  height: 40px;
`;

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments?: File[]) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  onTyping,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  }, [onTyping]);

  const handleTypingStop = useCallback(() => {
    if (onTyping && typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }
  }, [onTyping]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (newValue.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    handleTypingStop(); // Stop typing when sending
    onSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      onKeyPress(e);
    }
  };

  return (
    <InputContainer>
      {attachments.length > 0 && (
        <AttachmentPreview>
          {attachments.map((file, index) => (
            <AttachmentItem key={index}>
              <span>{file.name}</span>
              <AttachmentRemove
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
              >
                <MdClose size={16} />
              </AttachmentRemove>
            </AttachmentItem>
          ))}
        </AttachmentPreview>
      )}
      <InputRow>
        <HiddenFileInput
          ref={fileInputRef}
          type='file'
          multiple
          accept='image/*,.pdf,.doc,.docx'
          onChange={handleFileSelect}
        />
        <AttachButton
          variant='outline'
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label='Attach file'
        >
          <MdAttachFile size={20} />
        </AttachButton>
        <MessageTextArea
          value={value}
          onChange={e => handleChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />
        <SendButton
          variant='primary'
          onClick={handleSend}
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          aria-label='Send message'
        >
          <MdSend size={20} />
        </SendButton>
      </InputRow>
    </InputContainer>
  );
}
