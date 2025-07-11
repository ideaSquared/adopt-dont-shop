import React, { useEffect, useState } from 'react';
import styled, { css, DefaultTheme, keyframes } from 'styled-components';
import { ToastMessage } from '../../../hooks/useToast';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastProps extends ToastMessage {
  position?: ToastPosition;
  onClose?: (id: string) => void;
  autoClose?: boolean;
}

export interface ToastContainerProps {
  position?: ToastPosition;
  children: React.ReactNode;
}

const slideInLeft = keyframes`
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideInTop = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideInBottom = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideOutLeft = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
`;

const slideOutRight = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const slideOutTop = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
`;

const slideOutBottom = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
`;

const getAnimationStyles = (position: ToastPosition, isExiting: boolean) => {
  if (isExiting) {
    switch (position) {
      case 'top-left':
      case 'bottom-left':
        return css`
          animation: ${slideOutLeft} 200ms ease-in-out forwards;
        `;
      case 'top-right':
      case 'bottom-right':
        return css`
          animation: ${slideOutRight} 200ms ease-in-out forwards;
        `;
      case 'top-center':
        return css`
          animation: ${slideOutTop} 200ms ease-in-out forwards;
        `;
      case 'bottom-center':
        return css`
          animation: ${slideOutBottom} 200ms ease-in-out forwards;
        `;
      default:
        return css`
          animation: ${slideOutRight} 200ms ease-in-out forwards;
        `;
    }
  }

  switch (position) {
    case 'top-left':
    case 'bottom-left':
      return css`
        animation: ${slideInLeft} 300ms ease-out;
      `;
    case 'top-right':
    case 'bottom-right':
      return css`
        animation: ${slideInRight} 300ms ease-out;
      `;
    case 'top-center':
      return css`
        animation: ${slideInTop} 300ms ease-out;
      `;
    case 'bottom-center':
      return css`
        animation: ${slideInBottom} 300ms ease-out;
      `;
    default:
      return css`
        animation: ${slideInRight} 300ms ease-out;
      `;
  }
};

// ...existing code...
const getToastColors = (type: ToastMessage['type'], theme: DefaultTheme) => {
  const getColor = (scale: Record<string | number, string>, fallback: string) => {
    // Prefer 100 for light, 500 for main, 900 for dark if available
    return {
      light: scale[100] || fallback,
      main: scale[500] || fallback,
      dark: scale[900] || fallback,
    };
  };
  const success = getColor(theme.colors.semantic.success, '#22c55e');
  const error = getColor(theme.colors.semantic.error, '#ef4444');
  const warning = getColor(theme.colors.semantic.warning, '#f59e42');
  const info = getColor(theme.colors.semantic.info, '#3b82f6');
  const colors = {
    success: css`
      background-color: ${success.light}20;
      border-color: ${success.main};
      color: ${success.dark};
    `,
    error: css`
      background-color: ${error.light}20;
      border-color: ${error.main};
      color: ${error.dark};
    `,
    warning: css`
      background-color: ${warning.light}20;
      border-color: ${warning.main};
      color: ${warning.dark};
    `,
    info: css`
      background-color: ${info.light}20;
      border-color: ${info.main};
      color: ${info.dark};
    `,
  };
  return colors[type];
};

const ToastWrapper = styled.div<{
  $position: ToastPosition;
  $type: ToastMessage['type'];
  $isExiting: boolean;
}>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.border.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  backdrop-filter: blur(8px);
  min-width: 300px;
  max-width: 500px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  position: relative;

  ${({ $type, theme }) => getToastColors($type, theme)}
  ${({ $position, $isExiting }) => getAnimationStyles($position, $isExiting)}
`;

const ToastIcon = styled.div<{ $type: ToastMessage['type'] }>`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const ToastContent = styled.div`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.size.sm};
  line-height: 1.4;
`;

const ToastCloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ToastContainerElement = styled.div<{ $position: ToastPosition }>`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.toast};
  pointer-events: none;

  ${({ $position }) => {
    switch ($position) {
      case 'top-left':
        return css`
          top: ${({ theme }) => theme.spacing.lg};
          left: ${({ theme }) => theme.spacing.lg};
        `;
      case 'top-center':
        return css`
          top: ${({ theme }) => theme.spacing.lg};
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'top-right':
        return css`
          top: ${({ theme }) => theme.spacing.lg};
          right: ${({ theme }) => theme.spacing.lg};
        `;
      case 'bottom-left':
        return css`
          bottom: ${({ theme }) => theme.spacing.lg};
          left: ${({ theme }) => theme.spacing.lg};
        `;
      case 'bottom-center':
        return css`
          bottom: ${({ theme }) => theme.spacing.lg};
          left: 50%;
          transform: translateX(-50%);
        `;
      case 'bottom-right':
        return css`
          bottom: ${({ theme }) => theme.spacing.lg};
          right: ${({ theme }) => theme.spacing.lg};
        `;
      default:
        return css`
          top: ${({ theme }) => theme.spacing.lg};
          right: ${({ theme }) => theme.spacing.lg};
        `;
    }
  }}

  > * {
    pointer-events: auto;
  }
`;

const SuccessIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
      clipRule='evenodd'
    />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
      clipRule='evenodd'
    />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
      clipRule='evenodd'
    />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
      clipRule='evenodd'
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path
      fillRule='evenodd'
      d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
      clipRule='evenodd'
    />
  </svg>
);

const getIcon = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return <SuccessIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'info':
      return <InfoIcon />;
    default:
      return <InfoIcon />;
  }
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration,
  position = 'top-right',
  onClose,
  autoClose = true,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoClose && duration && duration > 0 && onClose) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          if (onClose) {
            onClose(id);
          }
        }, 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, autoClose, onClose, id]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onClose) {
        onClose(id);
      }
    }, 200);
  };

  return (
    <ToastWrapper $position={position} $type={type} $isExiting={isExiting}>
      <ToastIcon $type={type}>{getIcon(type)}</ToastIcon>
      <ToastContent>{message}</ToastContent>
      <ToastCloseButton onClick={handleClose} aria-label='Close notification'>
        <CloseIcon />
      </ToastCloseButton>
    </ToastWrapper>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  children,
}) => {
  return <ToastContainerElement $position={position}>{children}</ToastContainerElement>;
};
