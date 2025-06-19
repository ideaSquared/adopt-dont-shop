import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { Button } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  'data-testid'?: string;
};

const getSizeStyles = (size: ModalSize) => {
  const sizes = {
    sm: css`
      max-width: 400px;
      width: 90vw;
    `,
    md: css`
      max-width: 600px;
      width: 90vw;
    `,
    lg: css`
      max-width: 800px;
      width: 90vw;
    `,
    xl: css`
      max-width: 1200px;
      width: 95vw;
    `,
    full: css`
      width: 100vw;
      height: 100vh;
      max-width: none;
      border-radius: 0;
    `,
  };
  return sizes[size];
};

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.md};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all ${({ theme }) => theme.transitions.normal};
`;

const ModalContainer = styled.div<{
  $isOpen: boolean;
  $size: ModalSize;
}>`
  background: ${({ theme }) => theme.colors.neutral.white};
  border-radius: ${({ theme }) => theme.spacing.sm};
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: ${({ $isOpen }) => ($isOpen ? 'scale(1)' : 'scale(0.95)')};
  transition: all ${({ theme }) => theme.transitions.normal};

  ${({ $size }) => getSizeStyles($size)}

  @media (max-width: 768px) {
    width: 95vw;
    max-height: 95vh;
  }
`;

const ModalHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.colors.neutral[900]};
`;

const ModalBody = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  flex: 1;
`;

const CloseButton = styled(Button)`
  padding: ${({ theme }) => theme.spacing.xs};
  min-width: auto;
  min-height: auto;
  width: 32px;
  height: 32px;
`;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  'data-testid': dataTestId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer
        ref={modalRef}
        $isOpen={isOpen}
        $size={size}
        className={className}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        data-testid={dataTestId}
      >
        {(title || showCloseButton) && (
          <ModalHeader>
            {title && <ModalTitle id='modal-title'>{title}</ModalTitle>}
            {showCloseButton && (
              <CloseButton variant='ghost' size='sm' onClick={onClose} aria-label='Close modal'>
                ×
              </CloseButton>
            )}
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
      </ModalContainer>
    </Overlay>
  );

  return createPortal(modalContent, document.body);
};
