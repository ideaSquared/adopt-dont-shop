import { Message } from '@adopt-dont-shop/lib.chat';
import { safeFormatDistanceToNow } from '@/utils/dateHelpers';
import { useState } from 'react';
import { MdDownload, MdImage, MdInsertDriveFile, MdPictureAsPdf } from 'react-icons/md';
import styled from 'styled-components';
import { resolveFileUrl } from '../../utils/fileUtils';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';
import { ReactionDisplay } from './ReactionDisplay';
import { ReactionPicker } from './ReactionPicker';

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
  width: 100%;
  margin-bottom: 0.125rem;

  &:hover .reaction-picker-trigger {
    opacity: 0.6;
  }
`;

const BubbleRow = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  ${props => (props.$isOwn ? 'flex-direction: row-reverse;' : '')}
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 75%;
  min-width: 100px;
  min-height: 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.875rem 0.375rem 0.875rem;
  border-radius: ${props => (props.$isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px')};
  background: ${props =>
    props.$isOwn ? props.theme.colors.primary[500] : props.theme.background.secondary};
  color: ${props => (props.$isOwn ? 'white' : props.theme.text.primary)};
  word-break: break-word;
  overflow-wrap: anywhere;
  box-shadow: ${props =>
    props.$isOwn
      ? '0 1px 2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)'
      : '0 1px 2px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)'};
  font-size: 0.9375rem;
  line-height: 1.4;
  position: relative;
  transition: all 0.15s ease;
  border: ${props => (props.$isOwn ? 'none' : `1px solid ${props.theme.border.color.secondary}`)};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props =>
      props.$isOwn
        ? '0 2px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
        : '0 2px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)'};
  }

  @media (max-width: 600px) {
    max-width: 85%;
    min-width: 90px;
    font-size: 0.9rem;
    padding: 0.4375rem 0.75rem 0.3125rem 0.75rem;
  }
`;

const MessageContent = styled.div`
  word-break: break-word;
  overflow-wrap: anywhere;
  margin-bottom: 0.25rem;
`;

const MessageInfo = styled.div<{ $isOwn: boolean }>`
  align-self: flex-end;
  font-size: 0.75rem;
  color: ${props => (props.$isOwn ? 'rgba(255, 255, 255, 0.9)' : props.theme.text.secondary)};
  text-align: right;
  white-space: nowrap;
  letter-spacing: 0.01em;
  user-select: none;
  font-weight: 500;
`;

const AttachmentsContainer = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AttachmentItem = styled.div<{ $isOwn: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: ${props =>
    props.$isOwn ? 'rgba(255, 255, 255, 0.15)' : props.theme.background.secondary};
  border-radius: 8px;
  border: 1px solid
    ${props => (props.$isOwn ? 'rgba(255, 255, 255, 0.2)' : props.theme.border.color.secondary)};
  transition: all 0.2s ease;

  &:hover {
    background: ${props =>
      props.$isOwn ? 'rgba(255, 255, 255, 0.2)' : props.theme.background.tertiary};
  }
`;

const ImageAttachment = styled.img`
  max-width: 200px;
  max-height: 150px;
  width: auto;
  height: auto;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  object-fit: cover;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const FileIcon = styled.div<{ $isOwn: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: ${props =>
    props.$isOwn ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.primary[100]};
  color: ${props => (props.$isOwn ? 'white' : props.theme.colors.primary[800])};
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div<{ $isOwn: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => (props.$isOwn ? 'white' : props.theme.text.primary)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileSize = styled.div<{ $isOwn: boolean }>`
  font-size: 0.75rem;
  color: ${props => (props.$isOwn ? 'rgba(255, 255, 255, 0.9)' : props.theme.text.secondary)};
`;

const DownloadButton = styled.a<{ $isOwn: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: ${props =>
    props.$isOwn ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.primary[500]};
  color: ${props => (props.$isOwn ? 'white' : 'white')};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: ${props =>
      props.$isOwn ? 'rgba(255, 255, 255, 0.3)' : props.theme.colors.primary[600]};
    transform: scale(1.05);
  }
`;

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Helper function to get file icon based on MIME type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <MdImage size={20} />;
  } else if (mimeType === 'application/pdf') {
    return <MdPictureAsPdf size={20} />;
  } else {
    return <MdInsertDriveFile size={20} />;
  }
};

// Helper function to check if file is an image
const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
};

export function MessageBubbleComponent({ message, isOwn, currentUserId, onToggleReaction }: MessageBubbleProps) {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const handleImageClick = (url: string) => {
    // Open image in new tab for full view
    window.open(url, '_blank');
  };

  const handleReactionSelect = (emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(message.id, emoji);
    }
  };

  return (
    <MessageBubbleWrapper $isOwn={isOwn}>
      <BubbleRow $isOwn={isOwn}>
        <MessageBubble
          $isOwn={isOwn}
          tabIndex={0}
          aria-label={isOwn ? 'Your message' : 'Received message'}
        >
          <MessageContent>{message.content}</MessageContent>

          {/* Render attachments if they exist */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentsContainer>
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={attachment.id || index} $isOwn={isOwn}>
                  {isImageFile(attachment.mimeType) && !imageError[attachment.id] ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <ImageAttachment
                        src={resolveFileUrl(attachment.url) || attachment.url}
                        alt={attachment.filename}
                        onClick={() =>
                          handleImageClick(resolveFileUrl(attachment.url) || attachment.url)
                        }
                        onError={() => {
                          setImageError(prev => ({ ...prev, [attachment.id]: true }));
                        }}
                        loading="lazy"
                        title={`Click to view ${attachment.filename}`}
                      />
                    </div>
                  ) : (
                    <>
                      <FileIcon $isOwn={isOwn}>{getFileIcon(attachment.mimeType)}</FileIcon>
                      <FileInfo>
                        <FileName $isOwn={isOwn}>{attachment.filename}</FileName>
                        <FileSize $isOwn={isOwn}>{formatFileSize(attachment.size)}</FileSize>
                      </FileInfo>
                      <DownloadButton
                        $isOwn={isOwn}
                        href={resolveFileUrl(attachment.url)}
                        download={attachment.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MdDownload size={16} />
                      </DownloadButton>
                    </>
                  )}
                </AttachmentItem>
              ))}
            </AttachmentsContainer>
          )}

          <MessageInfo $isOwn={isOwn} aria-label={'Message time'}>
            {safeFormatDistanceToNow(message.timestamp, 'Just now')}
            <ReadReceiptIndicator
              status={message.status}
              isOwn={isOwn}
              readCount={message.readBy?.length}
            />
          </MessageInfo>
        </MessageBubble>

        {onToggleReaction && (
          <ReactionPicker isOwn={isOwn} onSelectReaction={handleReactionSelect} />
        )}
      </BubbleRow>

      {/* Reactions display */}
      {message.reactions && message.reactions.length > 0 && currentUserId && (
        <ReactionDisplay
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggleReaction={handleReactionSelect}
        />
      )}
    </MessageBubbleWrapper>
  );
}
