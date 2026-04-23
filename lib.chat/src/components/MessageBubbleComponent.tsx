import { useState } from 'react';
import {
  MdDownload,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVisibility,
} from 'react-icons/md';
import styled from 'styled-components';
import { useChat } from '../context/use-chat';
import type { Message } from '../types';
import { safeFormatDistanceToNow } from '../utils/date-helpers';
import { ImageLightbox } from './ImageLightbox';
import { PDFPreview } from './PDFPreview';
import { ReactionDisplay } from './ReactionDisplay';
import { ReactionPicker } from './ReactionPicker';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';

export type MessageGroupPosition = 'single' | 'first' | 'middle' | 'last';

/** Per-position bubble corner radii — subtle but it matters visually. */
const BUBBLE_RADIUS: Record<MessageGroupPosition, { own: string; other: string }> = {
  single: {
    own: '18px 18px 4px 18px',
    other: '18px 18px 18px 4px',
  },
  first: {
    own: '18px 18px 4px 18px',
    other: '18px 18px 18px 4px',
  },
  middle: {
    own: '18px 4px 4px 18px',
    other: '4px 18px 18px 4px',
  },
  last: {
    own: '18px 4px 18px 18px',
    other: '4px 18px 18px 18px',
  },
};

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
  width: 100%;

  &:hover .reaction-picker-trigger {
    opacity: 0.6;
  }

  &:hover .message-meta {
    opacity: 1;
  }
`;

const BubbleRow = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  ${(props) => (props.$isOwn ? 'flex-direction: row-reverse;' : '')}
`;

const MessageBubble = styled.div<{ $isOwn: boolean; $position: MessageGroupPosition }>`
  max-width: 70%;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.875rem;
  border-radius: ${(props) =>
    props.$isOwn ? BUBBLE_RADIUS[props.$position].own : BUBBLE_RADIUS[props.$position].other};
  background: ${(props) =>
    props.$isOwn
      ? (props.theme.colors.primary as Record<number, string>)[600]
      : props.theme.background.secondary};
  color: ${(props) => (props.$isOwn ? props.theme.text.inverse : props.theme.text.primary)};
  word-break: break-word;
  overflow-wrap: anywhere;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  font-size: 0.9375rem;
  line-height: 1.45;
  position: relative;
  transition: background 0.12s ease;
  border: ${(props) => (props.$isOwn ? 'none' : `1px solid ${props.theme.border.color.tertiary}`)};

  @media (max-width: 600px) {
    max-width: 82%;
    font-size: 0.9rem;
    padding: 0.4375rem 0.75rem;
  }
`;

const MessageContent = styled.div`
  word-break: break-word;
  overflow-wrap: anywhere;
`;

/**
 * Timestamp + read receipt sit outside the bubble now, in a slim meta row
 * shown only on the last message of a group (or a standalone single
 * message). Also fades in on hover for earlier messages so you can still
 * see exact times without cluttering the default view.
 */
const MessageMeta = styled.div<{ $isOwn: boolean; $alwaysVisible: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0.25rem 0.25rem 0 0.25rem;
  font-size: 0.6875rem;
  color: ${(props) => props.theme.text.tertiary};
  white-space: nowrap;
  letter-spacing: 0.01em;
  user-select: none;
  font-weight: 500;
  opacity: ${(props) => (props.$alwaysVisible ? 1 : 0)};
  transition: opacity 0.15s ease;
  ${(props) => (props.$isOwn ? 'align-self: flex-end;' : 'align-self: flex-start;')}
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
  background: ${(props) =>
    props.$isOwn ? 'rgba(255, 255, 255, 0.15)' : props.theme.background.secondary};
  border-radius: 8px;
  border: 1px solid
    ${(props) => (props.$isOwn ? 'rgba(255, 255, 255, 0.2)' : props.theme.border.color.secondary)};
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
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
  background: ${(props) =>
    props.$isOwn
      ? 'rgba(255, 255, 255, 0.2)'
      : (props.theme.colors.primary as Record<number, string>)[100]};
  color: ${(props) =>
    props.$isOwn ? 'white' : (props.theme.colors.primary as Record<number, string>)[800]};
`;

const FileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FileName = styled.div<{ $isOwn: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${(props) => (props.$isOwn ? 'white' : props.theme.text.primary)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FileSize = styled.div<{ $isOwn: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.$isOwn ? 'rgba(255, 255, 255, 0.9)' : props.theme.text.secondary)};
`;

const DownloadButton = styled.a<{ $isOwn: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: ${(props) =>
    props.$isOwn
      ? 'rgba(255, 255, 255, 0.2)'
      : (props.theme.colors.primary as Record<number, string>)[500]};
  color: ${(props) => (props.$isOwn ? 'white' : 'white')};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.$isOwn
        ? 'rgba(255, 255, 255, 0.3)'
        : (props.theme.colors.primary as Record<number, string>)[600]};
    transform: scale(1.05);
  }
`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <MdImage size={20} />;
  } else if (mimeType === 'application/pdf') {
    return <MdPictureAsPdf size={20} />;
  } else {
    return <MdInsertDriveFile size={20} />;
  }
};

const isImageFile = (mimeType: string): boolean => mimeType.startsWith('image/');
const isPDFFile = (mimeType: string): boolean => mimeType === 'application/pdf';

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  position?: MessageGroupPosition;
};

export function MessageBubbleComponent({
  message,
  isOwn,
  currentUserId,
  onToggleReaction,
  position = 'single',
}: MessageBubbleProps) {
  // Image lightbox and PDF viewer are core to the pet-adoption chat flow
  // (vet records, vaccination PDFs, pet photos), so they're unconditionally
  // on. Only the analytics `logEvent` hook is kept for opens — apps that
  // want to track can, apps that don't get a no-op.
  const { featureFlags, resolveFileUrl } = useChat();
  const { logEvent } = featureFlags;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');

  const imageAttachments = message.attachments?.filter((att) => isImageFile(att.mimeType)) || [];

  const handleImageClick = (attachment: NonNullable<Message['attachments']>[0]) => {
    const imageIndex = imageAttachments.findIndex((img) => img.id === attachment.id);
    setLightboxIndex(imageIndex >= 0 ? imageIndex : 0);
    setLightboxOpen(true);

    logEvent('image_lightbox_opened', 1, {
      attachment_id: attachment.id,
      filename: attachment.filename,
      mime_type: attachment.mimeType,
    });
  };

  const handlePDFClick = (attachment: NonNullable<Message['attachments']>[0]) => {
    const resolvedUrl = resolveFileUrl(attachment.url);
    if (resolvedUrl) {
      setPdfPreviewUrl(resolvedUrl);
      setPdfPreviewFilename(attachment.filename);
      setPdfPreviewOpen(true);

      logEvent('pdf_viewer_opened', 1, {
        attachment_id: attachment.id,
        filename: attachment.filename,
        file_size: attachment.size.toString(),
      });
    }
  };

  const handleReactionSelect = (emoji: string) => {
    if (onToggleReaction) {
      onToggleReaction(message.id, emoji);
    }
  };

  const showMeta = position === 'last' || position === 'single';
  const formattedTime = new Date(message.timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <MessageBubbleWrapper $isOwn={isOwn}>
      <BubbleRow $isOwn={isOwn}>
        <MessageBubble
          $isOwn={isOwn}
          $position={position}
          tabIndex={0}
          aria-label={isOwn ? 'Your message' : 'Received message'}
        >
          <MessageContent>{message.content}</MessageContent>

          {message.attachments && message.attachments.length > 0 && (
            <AttachmentsContainer>
              {message.attachments.map((attachment, index) => (
                <AttachmentItem key={attachment.id || index} $isOwn={isOwn}>
                  {isImageFile(attachment.mimeType) ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <ImageAttachment
                        src={resolveFileUrl(attachment.url) || attachment.url}
                        alt={attachment.filename}
                        onClick={() => handleImageClick(attachment)}
                        loading="lazy"
                        title={`Click to view ${attachment.filename}`}
                      />
                    </div>
                  ) : isPDFFile(attachment.mimeType) ? (
                    <>
                      <FileIcon $isOwn={isOwn}>{getFileIcon(attachment.mimeType)}</FileIcon>
                      <FileInfo>
                        <FileName $isOwn={isOwn}>{attachment.filename}</FileName>
                        <FileSize $isOwn={isOwn}>{formatFileSize(attachment.size)}</FileSize>
                      </FileInfo>
                      <DownloadButton
                        $isOwn={isOwn}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePDFClick(attachment);
                        }}
                        aria-label={`Preview ${attachment.filename}`}
                      >
                        <MdVisibility size={16} />
                      </DownloadButton>
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
        </MessageBubble>

        {onToggleReaction && (
          <ReactionPicker isOwn={isOwn} onSelectReaction={handleReactionSelect} />
        )}
      </BubbleRow>

      <MessageMeta
        $isOwn={isOwn}
        $alwaysVisible={showMeta}
        className="message-meta"
        title={safeFormatDistanceToNow(message.timestamp, 'just now')}
      >
        <span>{formattedTime}</span>
        <ReadReceiptIndicator
          status={message.status}
          isOwn={isOwn}
          readCount={message.readBy?.length}
        />
      </MessageMeta>

      {message.reactions && message.reactions.length > 0 && currentUserId && (
        <ReactionDisplay
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggleReaction={handleReactionSelect}
        />
      )}

      <ImageLightbox
        images={imageAttachments.map((att) => {
          const resolvedUrl = resolveFileUrl(att.url);
          return {
            id: att.id,
            url: resolvedUrl || att.url,
            filename: att.filename,
            mimeType: att.mimeType,
          };
        })}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      <PDFPreview
        url={pdfPreviewUrl}
        filename={pdfPreviewFilename}
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
      />
    </MessageBubbleWrapper>
  );
}
