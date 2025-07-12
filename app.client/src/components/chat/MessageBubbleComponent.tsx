import { Message } from '@/services/chatService';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import {
  MdDownload,
  MdImage,
  MdInsertDriveFile,
  MdPictureAsPdf,
  MdVisibility,
} from 'react-icons/md';
import styled from 'styled-components';
import { useStatsig } from '../../hooks/useStatsig';
import { resolveFileUrl } from '../../utils/fileUtils';
import { ImageLightbox } from './ImageLightbox';
import { PDFPreview } from './PDFPreview';

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => (props.$isOwn ? 'flex-end' : 'flex-start')};
  position: relative;
  width: 100%;
  margin-bottom: 0.125rem;
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
    props.$isOwn
      ? (props.theme.colors.primary as Record<number, string>)[500]
      : props.theme.background.secondary};
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
    props.$isOwn
      ? 'rgba(255, 255, 255, 0.2)'
      : (props.theme.colors.primary as Record<number, string>)[100]};
  color: ${props =>
    props.$isOwn ? 'white' : (props.theme.colors.primary as Record<number, string>)[800]};
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
    props.$isOwn
      ? 'rgba(255, 255, 255, 0.2)'
      : (props.theme.colors.primary as Record<number, string>)[500]};
  color: ${props => (props.$isOwn ? 'white' : 'white')};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: ${props =>
      props.$isOwn
        ? 'rgba(255, 255, 255, 0.3)'
        : (props.theme.colors.primary as Record<number, string>)[600]};
    transform: scale(1.05);
  }
`;

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
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

// Helper function to check if file is a PDF
const isPDFFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

export function MessageBubbleComponent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // Statsig feature flags
  const { checkGate, logEvent } = useStatsig();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');

  // Get all image attachments for the lightbox
  const imageAttachments = message.attachments?.filter(att => isImageFile(att.mimeType)) || [];

  const handleImageClick = (attachment: NonNullable<Message['attachments']>[0]) => {
    const imageIndex = imageAttachments.findIndex(img => img.id === attachment.id);
    setLightboxIndex(imageIndex >= 0 ? imageIndex : 0);
    setLightboxOpen(true);

    // Log feature usage
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

      // Log feature usage
      logEvent('pdf_viewer_opened', 1, {
        attachment_id: attachment.id,
        filename: attachment.filename,
        file_size: attachment.size.toString(),
      });
    }
  };

  return (
    <MessageBubbleWrapper $isOwn={isOwn}>
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
                {isImageFile(attachment.mimeType) ? (
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <ImageAttachment
                      src={resolveFileUrl(attachment.url) || attachment.url}
                      alt={attachment.filename}
                      onClick={() => handleImageClick(attachment)}
                      onError={_e => {
                        // Image failed to load - could add fallback here
                      }}
                      loading='lazy'
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
                    {checkGate('pdf_viewer_enabled') && (
                      <DownloadButton
                        $isOwn={isOwn}
                        href='#'
                        onClick={e => {
                          e.preventDefault();
                          handlePDFClick(attachment);
                        }}
                      >
                        <MdVisibility size={16} />
                      </DownloadButton>
                    )}
                    <DownloadButton
                      $isOwn={isOwn}
                      href={resolveFileUrl(attachment.url)}
                      download={attachment.filename}
                      target='_blank'
                      rel='noopener noreferrer'
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
                      target='_blank'
                      rel='noopener noreferrer'
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
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </MessageInfo>
      </MessageBubble>

      {/* Image Lightbox */}
      {checkGate('image_lightbox_enabled') && (
        <ImageLightbox
          images={imageAttachments.map(att => {
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
      )}

      {/* PDF Preview - only render if feature is enabled */}
      {checkGate('pdf_viewer_enabled') && (
        <PDFPreview
          url={pdfPreviewUrl}
          filename={pdfPreviewFilename}
          isOpen={pdfPreviewOpen}
          onClose={() => setPdfPreviewOpen(false)}
        />
      )}
    </MessageBubbleWrapper>
  );
}
