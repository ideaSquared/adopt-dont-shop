import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdNavigateBefore, MdNavigateNext, MdZoomIn, MdZoomOut } from 'react-icons/md';
import styled from 'styled-components';

const LightboxOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const LightboxContainer = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LightboxImage = styled.img<{ $zoom: number }>`
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  transform: scale(${props => props.$zoom});
  transition: transform 0.2s ease;
  cursor: ${props => (props.$zoom > 1 ? 'grab' : 'default')};

  &:active {
    cursor: ${props => (props.$zoom > 1 ? 'grabbing' : 'default')};
  }
`;

const LightboxControls = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
`;

const LightboxButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ImageInfo = styled.div`
  margin-top: 15px;
  color: white;
  text-align: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
`;

const NavigationButton = styled(LightboxButton)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;

  &.prev {
    left: 20px;
  }

  &.next {
    right: 20px;
  }
`;

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
      if (!isOpen) return;

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
          setZoom(prev => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.25, 0.5));
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

  if (!isOpen || !currentImage || images.length === 0) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return createPortal(
    <LightboxOverlay onClick={handleOverlayClick}>
      <LightboxContainer>
        <LightboxControls>
          <LightboxButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
            <MdZoomOut size={20} />
          </LightboxButton>
          <LightboxButton onClick={handleZoomIn} disabled={zoom >= 3}>
            <MdZoomIn size={20} />
          </LightboxButton>
          <LightboxButton onClick={onClose}>
            <MdClose size={20} />
          </LightboxButton>
        </LightboxControls>

        {/* Navigation buttons for multiple images */}
        {images.length > 1 && onNavigate && (
          <>
            <NavigationButton
              className='prev'
              onClick={() => onNavigate(safeCurrentIndex - 1)}
              disabled={safeCurrentIndex === 0}
            >
              <MdNavigateBefore size={24} />
            </NavigationButton>
            <NavigationButton
              className='next'
              onClick={() => onNavigate(safeCurrentIndex + 1)}
              disabled={safeCurrentIndex === images.length - 1}
            >
              <MdNavigateNext size={24} />
            </NavigationButton>
          </>
        )}

        <LightboxImage
          src={currentImage.url}
          alt={currentImage.filename}
          $zoom={zoom}
          onError={() => setImageError(true)}
        />

        <ImageInfo>
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
        </ImageInfo>
      </LightboxContainer>
    </LightboxOverlay>,
    document.body
  );
};
