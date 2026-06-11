import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdNavigateBefore, MdNavigateNext, MdZoomIn, MdZoomOut } from 'react-icons/md';
import * as styles from './ImageLightbox.css';

interface ImageAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
}

interface ImageLightboxProps {
  images: ImageAttachment[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  // Ensure currentIndex is valid
  const safeCurrentIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[safeCurrentIndex];

  // Reset error state when image changes
  useEffect(() => {
    setImageError(false);
  }, [safeCurrentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (safeCurrentIndex > 0 && onNavigate) {
            onNavigate(safeCurrentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (safeCurrentIndex < images.length - 1 && onNavigate) {
            onNavigate(safeCurrentIndex + 1);
          }
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.25, 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, safeCurrentIndex, images.length, onClose, onNavigate]);

  useEffect(() => {
    setZoom(1); // Reset zoom when image changes
  }, [safeCurrentIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !currentImage || images.length === 0) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  return createPortal(
    <div
      className={styles.lightboxOverlay}
      role="presentation"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div className={styles.lightboxContainer}>
        <div className={styles.lightboxControls}>
          <button className={styles.lightboxButton} onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <MdZoomOut size={20} />
          </button>
          <button className={styles.lightboxButton} onClick={handleZoomIn} disabled={zoom >= 3}>
            <MdZoomIn size={20} />
          </button>
          <button className={styles.lightboxButton} onClick={onClose}>
            <MdClose size={20} />
          </button>
        </div>

        {/* Navigation buttons for multiple images */}
        {images.length > 1 && onNavigate && (
          <>
            <button
              className={`${styles.navigationButton} ${styles.navigationButtonPrev}`}
              onClick={() => onNavigate(safeCurrentIndex - 1)}
              disabled={safeCurrentIndex === 0}
            >
              <MdNavigateBefore size={24} />
            </button>
            <button
              className={`${styles.navigationButton} ${styles.navigationButtonNext}`}
              onClick={() => onNavigate(safeCurrentIndex + 1)}
              disabled={safeCurrentIndex === images.length - 1}
            >
              <MdNavigateNext size={24} />
            </button>
          </>
        )}

        <img
          className={styles.lightboxImage}
          style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'default' }}
          src={currentImage.url}
          alt={currentImage.filename}
          onError={() => setImageError(true)}
        />

        <div className={styles.imageInfo}>
          <div>{currentImage.filename}</div>
          {images.length > 1 && (
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '4px' }}>
              {safeCurrentIndex + 1} of {images.length}
            </div>
          )}
          {imageError && (
            <div style={{ fontSize: '0.75rem', color: '#ff6b6b', marginTop: '4px' }}>
              Failed to load image
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
