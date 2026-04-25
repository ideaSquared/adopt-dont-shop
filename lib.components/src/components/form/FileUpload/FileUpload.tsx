import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';

import * as styles from './FileUpload.css';

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


const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
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
      if (!fileList || fileList.length === 0) {
        return;
      }

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
    <div className={clsx(styles.container({ fullWidth }), className)} data-testid={testId}>
      {label && (
        <label className={clsx(styles.label, required && styles.labelRequired)}>
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type='file'
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <div
        className={styles.dropZone({ size, state: finalState, isDragOver: isDragging, disabled })}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.uploadIcon}>
          <UploadIconSVG />
        </div>
        <div className={styles.uploadText}>{placeholder}</div>
        <div className={styles.uploadSubtext}>
          {accept && `Accepted formats: ${accept}`}
          {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
        </div>
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((file, index) => (
            <div className={styles.fileItem} key={`${file.name}-${index}`}>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              </div>
              <button
                className={styles.removeButton}
                type='button'
                onClick={() => handleRemoveFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <RemoveIconSVG />
              </button>
            </div>
          ))}
        </div>
      )}

      {finalHelperText && (
        <div className={styles.helperText({ state: finalState })}>{finalHelperText}</div>
      )}
    </div>
  );
};
