import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Theme } from '../../styles/theme';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
export type AlertSize = 'sm' | 'md' | 'lg';

export type AlertProps = {
  children: React.ReactNode;
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  'data-testid'?: string;
  /**
   * Custom icon to override default variant icon
   */
  icon?: React.ReactNode;
  /**
   * Whether to show the default icon
   */
  showIcon?: boolean;
};

// Modern slide-in animation
const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const getVariantStyles = (variant: AlertVariant, theme: Theme) => {
  const variants = {
    success: css`
      background: ${theme.colors.semantic.success[50]};
      border-color: ${theme.colors.semantic.success[200]};
      color: ${theme.colors.semantic.success[800]};

      .alert-icon {
        color: ${theme.colors.semantic.success[600]};
      }

      .alert-title {
        color: ${theme.colors.semantic.success[900]};
      }
    `,
    error: css`
      background: ${theme.colors.semantic.error[50]};
      border-color: ${theme.colors.semantic.error[200]};
      color: ${theme.colors.semantic.error[800]};

      .alert-icon {
        color: ${theme.colors.semantic.error[600]};
      }

      .alert-title {
        color: ${theme.colors.semantic.error[900]};
      }
    `,
    warning: css`
      background: ${theme.colors.semantic.warning[50]};
      border-color: ${theme.colors.semantic.warning[200]};
      color: ${theme.colors.semantic.warning[800]};

      .alert-icon {
        color: ${theme.colors.semantic.warning[600]};
      }

      .alert-title {
        color: ${theme.colors.semantic.warning[900]};
      }
    `,
    info: css`
      background: ${theme.colors.semantic.info[50]};
      border-color: ${theme.colors.semantic.info[200]};
      color: ${theme.colors.semantic.info[800]};

      .alert-icon {
        color: ${theme.colors.semantic.info[600]};
      }

      .alert-title {
        color: ${theme.colors.semantic.info[900]};
      }
    `,
  };

  return variants[variant];
};

const getSizeStyles = (size: AlertSize, theme: Theme) => {
  const sizes = {
    sm: css`
      padding: ${theme.spacing[3]};
      gap: ${theme.spacing[2]};
      font-size: ${theme.typography.size.sm};

      .alert-icon {
        width: 16px;
        height: 16px;
      }

      .alert-title {
        font-size: ${theme.typography.size.sm};
        margin-bottom: ${theme.spacing[1]};
      }

      .alert-close {
        width: 20px;
        height: 20px;
        top: ${theme.spacing[2]};
        right: ${theme.spacing[2]};
      }
    `,
    lg: css`
      padding: ${theme.spacing[5]};
      gap: ${theme.spacing[4]};
      font-size: ${theme.typography.size.lg};

      .alert-icon {
        width: 24px;
        height: 24px;
      }

      .alert-title {
        font-size: ${theme.typography.size.lg};
        margin-bottom: ${theme.spacing[2]};
      }

      .alert-close {
        width: 28px;
        height: 28px;
        top: ${theme.spacing[4]};
        right: ${theme.spacing[4]};
      }
    `,
    md: css`
      padding: ${theme.spacing[4]};
      gap: ${theme.spacing[3]};
      font-size: ${theme.typography.size.base};

      .alert-icon {
        width: 20px;
        height: 20px;
      }

      .alert-title {
        font-size: ${theme.typography.size.base};
        margin-bottom: ${theme.spacing[1.5]};
      }

      .alert-close {
        width: 24px;
        height: 24px;
        top: ${theme.spacing[3]};
        right: ${theme.spacing[3]};
      }
    `,
  };

  return sizes[size];
};

const StyledAlert = styled.div<{ $variant: AlertVariant; $size: AlertSize }>`
  position: relative;
  display: flex;
  align-items: flex-start;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.border.radius.lg};
  font-family: ${({ theme }) => theme.typography.family.sans};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  animation: ${slideIn} ${({ theme }) => theme.transitions.normal};

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const AlertIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px; /* Align with first line of text */
`;

const AlertContent = styled.div`
  flex: 1;
  min-width: 0; /* Allow text to wrap */
`;

const AlertTitle = styled.div`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const AlertMessage = styled.div`
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const CloseButton = styled.button`
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  cursor: pointer;
  color: currentColor;
  opacity: 0.6;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 1;
    background: rgb(0 0 0 / 0.1);
  }

  &:focus-visible {
    outline: none;
    opacity: 1;
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
`;

// Default icons for each variant
const SuccessIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor' className='alert-icon'>
    <path
      fillRule='evenodd'
      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z'
      clipRule='evenodd'
    />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor' className='alert-icon'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z'
      clipRule='evenodd'
    />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor' className='alert-icon'>
    <path
      fillRule='evenodd'
      d='M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z'
      clipRule='evenodd'
    />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor' className='alert-icon'>
    <path
      fillRule='evenodd'
      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z'
      clipRule='evenodd'
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

const getDefaultIcon = (variant: AlertVariant) => {
  const icons = {
    success: <SuccessIcon />,
    error: <ErrorIcon />,
    warning: <WarningIcon />,
    info: <InfoIcon />,
  };
  return icons[variant];
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  size = 'md',
  title,
  closable = false,
  onClose,
  className,
  'data-testid': dataTestId,
  icon,
  showIcon = true,
}) => {
  const displayIcon = icon || (showIcon ? getDefaultIcon(variant) : null);

  return (
    <StyledAlert
      className={className}
      $variant={variant}
      $size={size}
      role='alert'
      data-testid={dataTestId}
    >
      {displayIcon && <AlertIcon>{displayIcon}</AlertIcon>}

      <AlertContent>
        {title && <AlertTitle className='alert-title'>{title}</AlertTitle>}
        <AlertMessage>{children}</AlertMessage>
      </AlertContent>

      {closable && (
        <CloseButton
          onClick={onClose}
          className='alert-close'
          aria-label='Close alert'
          type='button'
        >
          <CloseIcon />
        </CloseButton>
      )}
    </StyledAlert>
  );
};

Alert.displayName = 'Alert';

