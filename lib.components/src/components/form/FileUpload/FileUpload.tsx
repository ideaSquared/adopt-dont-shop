import React, { useCallback, useRef, useState } from 'react';
import styled, { css, DefaultTheme } from 'styled-components';

export type FileUploadSize = 'sm' | 'md' | 'lg';
export type FileUploadState = 'default' | 'error' | 'success' | 'warning';

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  size?: FileUploadSize;
  state?: FileUploadState;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
  'data-testid'?: string;
  onFilesSelect?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  onError?: (error: string) => void;
  files?: File[];
}

const getSizeStyles = (size: FileUploadSize) => {
  const sizes = {
    sm: css`
      min-height: 80px;
      padding: ${({ theme }) => theme.spacing.md};
    `,
    md: css`
      min-height: 120px;
      padding: ${({ theme }) => theme.spacing.lg};
    `,
    lg: css`
      min-height: 160px;
      padding: ${({ theme }) => theme.spacing.xl};
    `,
  };
  return sizes[size];
};

const getStateStyles = (state: FileUploadState, theme: DefaultTheme) => {
  const states = {
    default: css`
      border-color: ${theme.colors.neutral[300]};
    `,
    error: css`
      border-color: ${theme.colors.semantic.error[500]};
      background-color: ${theme.colors.semantic.error[100]}20;
    `,
    success: css`
      border-color: ${theme.colors.semantic.success[500]};
      background-color: ${theme.colors.semantic.success[100]}20;
    `,
    warning: css`
      border-color: ${theme.colors.semantic.warning[500]};
      background-color: ${theme.colors.semantic.warning[100]}20;
    `,
  };
  return states[state];
};

const FileUploadContainer = styled.div<{ $fullWidth: boolean }>`
  display: ${({ $fullWidth }) => ($fullWidth ? 'block' : 'inline-block')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $required: boolean }>`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};

  ${({ $required }) =>
    $required &&
    css`
      &::after {
        content: ' *';
        color: ${({ theme }) => theme.colors.semantic.error[500]};
      }
    `}
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const DropZone = styled.div<{
  $size: FileUploadSize;
  $state: FileUploadState;
  $isDragging: boolean;
  $disabled: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed;
  border-radius: ${({ theme }) => theme.border.radius.md};
  background-color: ${({ theme }) => theme.colors.neutral[50]};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all ${({ theme }) => theme.transitions.fast};
  text-align: center;

  ${({ $size }) => getSizeStyles($size)}
  ${({ $state, theme }) => getStateStyles($state, theme)}

  ${({ $isDragging, theme }) =>
    $isDragging &&
    css`
      border-color: ${theme.colors.primary[500]};
      background-color: ${theme.colors.primary[100]}20;
    `}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      background-color: ${theme.colors.neutral[100]};
      color: ${theme.colors.neutral[400]};
      cursor: not-allowed;
    `}

  &:hover:not([disabled]) {
    border-color: ${({ theme }) => theme.colors.primary[500]};
    background-color: ${({ theme }) => theme.colors.primary[100]}10;
  }
`;

const UploadIcon = styled.div`
  width: 32px;
  height: 32px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.neutral[400]};

  svg {
    width: 100%;
    height: 100%;
  }
`;

const UploadText = styled.div`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[600]};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const UploadSubtext = styled.div`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.neutral[500]};
`;

const FileList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  background-color: ${({ theme }) => theme.colors.neutral[50]};
  margin-bottom: ${({ theme }) => theme.spacing.xs};

  &:last-child {
    margin-bottom: 0;
  }
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FileName = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[700]};
`;

const FileSize = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme }) => theme.colors.neutral[500]};
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.semantic.error[500]};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.semantic.error[100]}20;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.semantic.error[500]};
    outline-offset: 2px;
  }
`;

const HelperText = styled.div<{ $state: FileUploadState }>`
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.size.xs};
  color: ${({ theme, $state }) => {
    switch ($state) {
      case 'error':
        return theme.colors.semantic.error[500];
      case 'success':
        return theme.colors.semantic.success[500];
      case 'warning':
        return theme.colors.semantic.warning[500];
      default:
        return theme.colors.neutral[600];
    }
  }};
`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const UploadIconSVG = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' />
  </svg>
);

const RemoveIconSVG = () => (
  <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
    <path d='M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' />
  </svg>
);

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  size = 'md',
  state = 'default',
  disabled = false,
  required = false,
  label,
  error,
  helperText,
  placeholder = multiple
    ? 'Drop files here or click to browse'
    : 'Drop file here or click to browse',
  fullWidth = false,
  className,
  'data-testid': testId,
  onFilesSelect,
  onFileRemove,
  onError,
  files = [],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (fileList: FileList): File[] => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        // Check file size
        if (maxSize && file.size > maxSize) {
          errors.push(`${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}`);
          continue;
        }

        // Check file type
        if (accept) {
          const acceptedTypes = accept.split(',').map(type => type.trim());
          const isAccepted = acceptedTypes.some(type => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            return file.type.match(type.replace('*', '.*'));
          });

          if (!isAccepted) {
            errors.push(`${file.name} is not an accepted file type`);
            continue;
          }
        }

        validFiles.push(file);
      }

      // Check total file count before processing
      if (maxFiles && files.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        if (onError) {
          onError(errors.join(', '));
        }
        return [];
      }

      // Check if adding new files would exceed limit
      if (maxFiles && files.length + validFiles.length > maxFiles) {
        const allowedCount = maxFiles - files.length;
        errors.push(`Maximum ${maxFiles} files allowed`);
        validFiles.splice(allowedCount); // Keep only files that fit
      }

      if (errors.length > 0 && onError) {
        onError(errors.join(', '));
      }

      return validFiles;
    },
    [maxSize, maxFiles, accept, files.length, onError]
  );

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const validFiles = validateFiles(fileList);
      if (validFiles.length > 0 && onFilesSelect) {
        const newFiles = multiple ? [...files, ...validFiles] : validFiles;
        onFilesSelect(newFiles);
      }
    },
    [validateFiles, multiple, files, onFilesSelect]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
    // Reset input value to allow selecting the same file again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    if (!disabled) {
      handleFileSelect(event.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    if (onFileRemove) {
      onFileRemove(index);
    }
  };

  const finalState = error ? 'error' : state;
  const finalHelperText = error || helperText;

  return (
    <FileUploadContainer $fullWidth={fullWidth} className={className} data-testid={testId}>
      {label && <Label $required={required}>{label}</Label>}

      <HiddenInput
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <DropZone
        $size={size}
        $state={finalState}
        $isDragging={isDragging}
        $disabled={disabled}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <UploadIcon>
          <UploadIconSVG />
        </UploadIcon>
        <UploadText>{placeholder}</UploadText>
        <UploadSubtext>
          {accept && `Accepted formats: ${accept}`}
          {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
        </UploadSubtext>
      </DropZone>

      {files.length > 0 && (
        <FileList>
          {files.map((file, index) => (
            <FileItem key={`${file.name}-${index}`}>
              <FileInfo>
                <FileName>{file.name}</FileName>
                <FileSize>{formatFileSize(file.size)}</FileSize>
              </FileInfo>
              <RemoveButton
                type='button'
                onClick={() => handleRemoveFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <RemoveIconSVG />
              </RemoveButton>
            </FileItem>
          ))}
        </FileList>
      )}

      {finalHelperText && <HelperText $state={finalState}>{finalHelperText}</HelperText>}
    </FileUploadContainer>
  );
};
