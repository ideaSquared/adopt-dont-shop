import React from 'react'
import styled from 'styled-components'

const PreviewContainer = styled.div`
  margin-top: ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.border.radius.md};
  overflow: hidden;
`

const ImagePreview = styled.img`
  max-width: 300px;
  max-height: 200px;
  object-fit: cover;
  border-radius: ${(props) => props.theme.border.radius.md};
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);
  }
`

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm};
  background: ${(props) => props.theme.background.contrast};
  border-radius: ${(props) => props.theme.border.radius.md};
  font-size: ${(props) => props.theme.typography.size.sm};
`

const FileIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.background.highlight};
  border-radius: ${(props) => props.theme.border.radius.sm};
  color: ${(props) => props.theme.text.dark};
`

const FileDetails = styled.div`
  flex: 1;
  min-width: 0;
`

const FileName = styled.div`
  font-weight: ${(props) => props.theme.typography.weight.medium};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FileSize = styled.div`
  color: ${(props) => props.theme.text.dim};
  font-size: ${(props) => props.theme.typography.size.xs};
`

const DownloadButton = styled.a`
  padding: ${(props) => props.theme.spacing.xs}
    ${(props) => props.theme.spacing.sm};
  background: ${(props) => props.theme.background.highlight};
  color: ${(props) => props.theme.text.dark};
  border-radius: ${(props) => props.theme.border.radius.sm};
  text-decoration: none;
  font-size: ${(props) => props.theme.typography.size.xs};
  font-weight: ${(props) => props.theme.typography.weight.medium};
  transition: background 0.2s ease;

  &:hover {
    background: ${(props) => props.theme.background.mouseHighlight};
  }
`

interface FileAttachment {
  attachment_id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

interface FilePreviewProps {
  file: FileAttachment
  onImageClick?: (url: string) => void
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const getFileIcon = (mimeType: string): JSX.Element => {
  // Add more mime type icons as needed
  switch (mimeType.split('/')[0]) {
    case 'image':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm0 1a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H4zm7 7.5l-2-2-3 3-1.5-1.5L3 12h10l-2-2.5zM5.5 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      )
    case 'video':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm10 0H4v8h8V4zm-5 2l3 2-3 2V6z" />
        </svg>
      )
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1h5.586L14 5.414V14a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v12h8V6H8V2H4zm5 0v3h3L9 2z" />
        </svg>
      )
  }
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onImageClick,
}) => {
  const isImage = file.mimeType.startsWith('image/')

  if (isImage) {
    return (
      <PreviewContainer>
        <ImagePreview
          src={file.url}
          alt={file.originalName}
          onClick={() => onImageClick?.(file.url)}
          loading="lazy"
        />
      </PreviewContainer>
    )
  }

  return (
    <PreviewContainer>
      <FileInfo>
        <FileIcon>{getFileIcon(file.mimeType)}</FileIcon>
        <FileDetails>
          <FileName>{file.originalName}</FileName>
          <FileSize>{formatFileSize(file.size)}</FileSize>
        </FileDetails>
        <DownloadButton
          href={file.url}
          download={file.originalName}
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </DownloadButton>
      </FileInfo>
    </PreviewContainer>
  )
}
