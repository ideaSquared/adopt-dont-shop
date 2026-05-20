import { useState } from 'react';
import {
  MdDownload,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVisibility,
} from 'react-icons/md';
import { useChat } from '../context/use-chat';
import type { Message } from '../types';
import { safeFormatDistanceToNow } from '../utils/date-helpers';
import { ImageLightbox } from './ImageLightbox';
import * as styles from './MessageBubbleComponent.css';
import { PDFPreview } from './PDFPreview';
import { ReactionDisplay } from './ReactionDisplay';
import { ReactionPicker } from './ReactionPicker';
import { ReadReceiptIndicator } from './ReadReceiptIndicator';

export type MessageGroupPosition = 'single' | 'first' | 'middle' | 'last';

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
  const { featureFlags, resolveFileUrl, retryMessage } = useChat();
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

  const wrapperClass = isOwn ? styles.messageBubbleWrapperOwn : styles.messageBubbleWrapperOther;
  const bubbleRowClass = isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther;
  const bubbleClass = isOwn
    ? styles.messageBubbleOwn[position]
    : styles.messageBubbleOther[position];

  // Incoming bubbles get a richer aria-label so AT users can navigate
  // the message list (Tab / arrow) and hear who said what without
  // first reading the preceding sender row.
  const previewSource = message.content?.trim() || '';
  const preview = previewSource.length > 80 ? `${previewSource.slice(0, 77)}…` : previewSource;
  const bubbleAriaLabel = isOwn ? 'Your message' : `Message from ${message.senderName}: ${preview}`;
  const metaClass = isOwn ? styles.messageMetaOwn : styles.messageMetaOther;
  const metaVisibilityClass = showMeta ? styles.messageMetaVisible : styles.messageMetaHidden;

  return (
    <div className={wrapperClass}>
      <div className={bubbleRowClass}>
        <article className={bubbleClass} aria-label={bubbleAriaLabel}>
          <div className={styles.messageContent}>{message.content}</div>

          {message.attachments && message.attachments.length > 0 && (
            <div className={styles.attachmentsContainer}>
              {message.attachments.map((attachment, index) => (
                <div
                  key={attachment.id || index}
                  className={isOwn ? styles.attachmentItemOwn : styles.attachmentItemOther}
                >
                  {isImageFile(attachment.mimeType) ? (
                    <div className={styles.imageWrapper}>
                      <button
                        type="button"
                        className={styles.imageButtonWrapper}
                        onClick={() => handleImageClick(attachment)}
                        aria-label={`View ${attachment.filename}`}
                      >
                        <img
                          className={styles.imageAttachment}
                          src={resolveFileUrl(attachment.url) || attachment.url}
                          alt={attachment.filename}
                          loading="lazy"
                        />
                      </button>
                    </div>
                  ) : isPDFFile(attachment.mimeType) ? (
                    <>
                      <div className={isOwn ? styles.fileIconOwn : styles.fileIconOther}>
                        {getFileIcon(attachment.mimeType)}
                      </div>
                      <div className={styles.fileInfo}>
                        <div className={isOwn ? styles.fileNameOwn : styles.fileNameOther}>
                          {attachment.filename}
                        </div>
                        <div className={isOwn ? styles.fileSizeOwn : styles.fileSizeOther}>
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      <a
                        className={isOwn ? styles.downloadButtonOwn : styles.downloadButtonOther}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePDFClick(attachment);
                        }}
                        aria-label={`Preview ${attachment.filename}`}
                      >
                        <MdVisibility size={16} />
                      </a>
                      <a
                        className={isOwn ? styles.downloadButtonOwn : styles.downloadButtonOther}
                        href={resolveFileUrl(attachment.url)}
                        download={attachment.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MdDownload size={16} />
                      </a>
                    </>
                  ) : (
                    <>
                      <div className={isOwn ? styles.fileIconOwn : styles.fileIconOther}>
                        {getFileIcon(attachment.mimeType)}
                      </div>
                      <div className={styles.fileInfo}>
                        <div className={isOwn ? styles.fileNameOwn : styles.fileNameOther}>
                          {attachment.filename}
                        </div>
                        <div className={isOwn ? styles.fileSizeOwn : styles.fileSizeOther}>
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>
                      <a
                        className={isOwn ? styles.downloadButtonOwn : styles.downloadButtonOther}
                        href={resolveFileUrl(attachment.url)}
                        download={attachment.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MdDownload size={16} />
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        {onToggleReaction && (
          <ReactionPicker isOwn={isOwn} onSelectReaction={handleReactionSelect} />
        )}
      </div>

      <div
        className={`${metaClass} ${metaVisibilityClass} message-meta`}
        title={safeFormatDistanceToNow(message.timestamp, 'just now')}
      >
        <span>{formattedTime}</span>
        <ReadReceiptIndicator
          status={message.status}
          isOwn={isOwn}
          readCount={message.readBy?.length}
        />
        {isOwn && message.status === 'failed' && (
          <button
            type="button"
            onClick={() => {
              void retryMessage(message.id);
            }}
            aria-label="Retry sending message"
            data-testid={`retry-message-${message.id}`}
            style={{
              marginLeft: '0.5rem',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              textDecoration: 'underline',
              font: 'inherit',
              padding: 0,
            }}
          >
            Retry
          </button>
        )}
      </div>

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
    </div>
  );
}
