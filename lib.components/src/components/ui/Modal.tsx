import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';

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
  /**
   * Whether to center the modal vertically
   */
  centered?: boolean;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Custom footer content
   */
  footer?: React.ReactNode;
};

// Modern animations
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95) translate(-50%, -50%);
  }
  to {
    opacity: 1;
    transform: scale(1) translate(-50%, -50%);
  }
`;

const getSizeStyles = (size: ModalSize) => {
  const sizes = {
    sm: css`
      width: 90%;
      max-width: 384px;
      max-height: 90vh;
    `,
    md: css`
      width: 90%;
      max-width: 512px;
      max-height: 90vh;
    `,
    lg: css`
      width: 90%;
      max-width: 768px;
      max-height: 90vh;
    `,
    xl: css`
      width: 90%;
      max-width: 1024px;
      max-height: 90vh;
    `,
    full: css`
      width: 95%;
      height: 95%;
      max-width: none;
      max-height: none;
    `,
  };

  return sizes[size];
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.background.overlay};
  backdrop-filter: blur(4px);
  z-index: ${({ theme }) => theme.zIndex.modal};
  animation: ${fadeIn} ${({ theme }) => theme.transitions.normal};

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    backdrop-filter: none;
  }
`;

const ModalContainer = styled.div<{ $size: ModalSize; $centered: boolean }>`
  position: fixed;
  top: ${({ $centered }) => ($centered ? '50%' : '10%')};
  left: 50%;
  transform: ${({ $centered }) => ($centered ? 'translate(-50%, -50%)' : 'translate(-50%, 0)')};
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.xl};
  box-shadow: ${({ theme }) => theme.shadows['2xl']};
  overflow: hidden;
  animation: ${scaleIn} ${({ theme }) => theme.transitions.normal};
  display: flex;
  flex-direction: column;

  ${({ $size }) => getSizeStyles($size)}

  /* Dark mode enhanced shadows */
  ${({ theme }) =>
    theme.mode === 'dark' &&
    css`
      box-shadow:
        0 25px 50px -12px rgb(0 0 0 / 0.6),
        0 0 0 1px rgb(255 255 255 / 0.05);
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: ${({ $centered }) => ($centered ? 'translate(-50%, -50%)' : 'translate(-50%, 0)')};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[6]}
    ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.primary};
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.text.primary};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const ModalContent = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  flex: 1;
  overflow-y: auto;
  color: ${({ theme }) => theme.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.border.color.tertiary};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.border.color.quaternary};
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]}
    ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.border.color.primary};
  flex-shrink: 0;
`;

const CloseButton = styled.button`
  display: flex;
  position: absolute;
  top: ${({ theme }) => theme.spacing[4]};
  right: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.text.tertiary};
  z-index: 10;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.text.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }

  &:active {
    transform: scale(0.95);
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    &:active {
      transform: none;
    }
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

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
  centered = true,
  header,
  footer,
}) => {
  // Focus trap: ref for modal container
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Track if this is the first time the modal is opening
  const isInitialOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      // Only focus the first focusable element when initially opening the modal
      // Not on subsequent re-renders
      if (!isInitialOpen.current) {
        isInitialOpen.current = true;
        setTimeout(() => {
          if (modalRef.current) {
            const focusable = modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
              focusable[0].focus();
            }
          }
        }, 0);
      }

      if (closeOnEscape) {
        document.addEventListener('keydown', handleEscape);
      }

      return () => {
        document.body.style.overflow = '';
        if (closeOnEscape) {
          document.removeEventListener('keydown', handleEscape);
        }
      };
    } else {
      // Reset the flag when modal closes
      isInitialOpen.current = false;
    }
  }, [isOpen, closeOnEscape, handleEscape]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Focus trap logic
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      onClose();
      return;
    }
    if (event.key === 'Tab' && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <Overlay onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
      <ModalContainer
        className={className}
        $size={size}
        $centered={centered}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? 'modal-title' : undefined}
        data-testid={dataTestId}
        ref={modalRef}
      >
        {(title || header) && (
          <ModalHeader>{header || <ModalTitle id='modal-title'>{title}</ModalTitle>}</ModalHeader>
        )}

        <ModalContent>{children}</ModalContent>

        {showCloseButton && (
          <CloseButton onClick={onClose} aria-label='Close modal' type='button'>
            <CloseIcon />
          </CloseButton>
        )}

        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContainer>
    </Overlay>
  );

  // Render modal in portal
  return createPortal(modalContent, document.body);
};

Modal.displayName = 'Modal';
