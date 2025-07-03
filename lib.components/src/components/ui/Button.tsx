import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Theme } from '../../styles/theme';
import { ButtonProps, ButtonSize, ButtonVariant } from '../../types';

// Modern loading animation
// 🔥 HOT RELOAD TEST: This comment should appear instantly in your app!
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $isLoading: boolean;
  $isFullWidth: boolean;
  $isRounded: boolean;
  $hasStartIcon: boolean;
  $hasEndIcon: boolean;
}

// Modern size system with better touch targets
const getSizeStyles = (size: ButtonSize, theme: Theme) => {
  switch (size) {
    case 'sm':
      return css`
        padding: ${theme.spacing[2]} ${theme.spacing[3]};
        font-size: ${theme.typography.size.sm};
        font-weight: ${theme.typography.weight.medium};
        min-height: ${theme.spacing[8]};
        gap: ${theme.spacing[1.5]};
      `;
    case 'lg':
      return css`
        padding: ${theme.spacing[3]} ${theme.spacing[6]};
        font-size: ${theme.typography.size.lg};
        font-weight: ${theme.typography.weight.semibold};
        min-height: ${theme.spacing[12]};
        gap: ${theme.spacing[2]};
      `;
    case 'md':
    default:
      return css`
        padding: ${theme.spacing[2.5]} ${theme.spacing[4]};
        font-size: ${theme.typography.size.base};
        font-weight: ${theme.typography.weight.medium};
        min-height: ${theme.spacing[10]};
        gap: ${theme.spacing[2]};
      `;
  }
};

// Modern variant system with semantic colors
const getVariantStyles = (variant: ButtonVariant, theme: Theme) => {
  switch (variant) {
    case 'primary':
      return css`
        background: ${theme.colors.primary[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.primary[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.primary[600]};
          border-color: ${theme.colors.primary[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.primary[700]};
          border-color: ${theme.colors.primary[700]};
          transform: translateY(0);
          box-shadow: ${theme.shadows.sm};
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusPrimary};
        }
      `;

    case 'secondary':
      return css`
        background: ${theme.colors.secondary[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.secondary[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.secondary[600]};
          border-color: ${theme.colors.secondary[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.secondary[700]};
          border-color: ${theme.colors.secondary[700]};
          transform: translateY(0);
          box-shadow: ${theme.shadows.sm};
        }

        &:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px ${theme.colors.secondary[200]};
        }
      `;

    case 'outline':
      return css`
        background: transparent;
        color: ${theme.colors.primary[600]};
        border: 1px solid ${theme.border.color.primary};

        &:hover:not(:disabled) {
          background: ${theme.colors.primary[50]};
          border-color: ${theme.colors.primary[300]};
          color: ${theme.colors.primary[700]};
          transform: translateY(-1px);
          box-shadow: ${theme.shadows.sm};
        }

        &:active:not(:disabled) {
          background: ${theme.colors.primary[100]};
          transform: translateY(0);
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusPrimary};
        }
      `;

    case 'ghost':
      return css`
        background: transparent;
        color: ${theme.text.secondary};
        border: 1px solid transparent;

        &:hover:not(:disabled) {
          background: ${theme.background.tertiary};
          color: ${theme.text.primary};
        }

        &:active:not(:disabled) {
          background: ${theme.colors.neutral[200]};
        }

        &:focus-visible {
          outline: none;
          background: ${theme.background.tertiary};
          box-shadow: ${theme.shadows.focus};
        }
      `;

    case 'success':
      return css`
        background: ${theme.colors.semantic.success[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.semantic.success[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.semantic.success[600]};
          border-color: ${theme.colors.semantic.success[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.semantic.success[700]};
          border-color: ${theme.colors.semantic.success[700]};
          transform: translateY(0);
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusSuccess};
        }
      `;

    case 'danger':
      return css`
        background: ${theme.colors.semantic.error[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.semantic.error[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.semantic.error[600]};
          border-color: ${theme.colors.semantic.error[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.semantic.error[700]};
          border-color: ${theme.colors.semantic.error[700]};
          transform: translateY(0);
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusError};
        }
      `;

    case 'warning':
      return css`
        background: ${theme.colors.semantic.warning[500]};
        color: ${theme.colors.semantic.warning[900]};
        border: 1px solid ${theme.colors.semantic.warning[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.semantic.warning[600]};
          border-color: ${theme.colors.semantic.warning[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.semantic.warning[700]};
          border-color: ${theme.colors.semantic.warning[700]};
          transform: translateY(0);
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusWarning};
        }
      `;

    case 'info':
      return css`
        background: ${theme.colors.semantic.info[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.semantic.info[500]};
        box-shadow: ${theme.shadows.sm};

        &:hover:not(:disabled) {
          background: ${theme.colors.semantic.info[600]};
          border-color: ${theme.colors.semantic.info[600]};
          box-shadow: ${theme.shadows.md};
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          background: ${theme.colors.semantic.info[700]};
          border-color: ${theme.colors.semantic.info[700]};
          transform: translateY(0);
        }

        &:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px ${theme.colors.semantic.info[200]};
        }
      `;

    default:
      return css`
        background: ${theme.colors.primary[500]};
        color: ${theme.text.inverse};
        border: 1px solid ${theme.colors.primary[500]};

        &:hover:not(:disabled) {
          background: ${theme.colors.primary[600]};
          border-color: ${theme.colors.primary[600]};
        }

        &:focus-visible {
          outline: none;
          box-shadow: ${theme.shadows.focusPrimary};
        }
      `;
  }
};

const StyledButton = styled.button<StyledButtonProps>`
  /* Base button styles with modern design */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.typography.family.sans};
  border-radius: ${({ theme, $isRounded }) =>
    $isRounded ? theme.border.radius.full : theme.border.radius.lg};
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  user-select: none;
  overflow: hidden;
  outline: none;

  /* Ensure good line height */
  line-height: 1;

  /* Full width styling */
  width: ${({ $isFullWidth }) => ($isFullWidth ? '100%' : 'auto')};

  /* Apply size styles */
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  
  /* Icon spacing adjustments */
  ${({ $hasStartIcon, $hasEndIcon, theme }) => {
    if ($hasStartIcon && !$hasEndIcon) {
      return css`
        padding-left: ${theme.spacing[3]};
      `;
    }
    if ($hasEndIcon && !$hasStartIcon) {
      return css`
        padding-right: ${theme.spacing[3]};
      `;
    }
    if ($hasStartIcon && $hasEndIcon) {
      return css`
        padding-left: ${theme.spacing[3]};
        padding-right: ${theme.spacing[3]};
      `;
    }
    return '';
  }}
  
  /* Disabled state with better visual feedback */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
    pointer-events: none;

    /* Subtle disabled styling */
    filter: grayscale(0.3);
  }

  /* Loading state with smooth animations */
  ${({ $isLoading }) =>
    $isLoading &&
    css`
      cursor: wait;
      position: relative;

      /* Hide text while loading */
      color: transparent !important;

      /* Loading spinner */
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 1.2em;
        height: 1.2em;
        margin: -0.6em 0 0 -0.6em;
        border-radius: 50%;
        border: 2px solid;
        border-color: currentColor transparent currentColor transparent;
        animation: ${spin} 1s linear infinite;
        color: inherit;
      }
    `}

  /* Add subtle shimmer effect on hover for primary buttons */
  ${({ $variant }) =>
    ($variant === 'primary' || $variant === 'secondary') &&
    css`
      &:hover:not(:disabled)::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        animation: ${shimmer} 2s ease-in-out;
      }
    `}

  /* Better touch targets for mobile */
  @media (max-width: 768px) {
    min-height: ${({ theme }) => theme.spacing[11]};
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none !important;

    &::after {
      animation: none;
    }

    &::before {
      animation: none;
    }
  }
`;

const IconContainer = styled.span<{ $position: 'start' | 'end' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  /* Size the icon appropriately */
  svg {
    width: 1em;
    height: 1em;
  }
`;

// Modern button component with enhanced UX
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      isRounded = false,
      disabled = false,
      children,
      startIcon,
      endIcon,
      leftIcon, // Legacy prop support
      rightIcon, // Legacy prop support
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    // Support legacy icon props
    const effectiveStartIcon = startIcon || leftIcon;
    const effectiveEndIcon = endIcon || rightIcon;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isLoading || disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };

    return (
      <StyledButton
        ref={ref}
        className={className}
        $variant={variant}
        $size={size}
        $isLoading={isLoading}
        $isFullWidth={isFullWidth}
        $isRounded={isRounded}
        $hasStartIcon={!!effectiveStartIcon}
        $hasEndIcon={!!effectiveEndIcon}
        disabled={disabled || isLoading}
        onClick={handleClick}
        aria-disabled={disabled || isLoading}
        aria-busy={isLoading}
        type='button'
        {...props}
      >
        {effectiveStartIcon && !isLoading && (
          <IconContainer $position='start'>{effectiveStartIcon}</IconContainer>
        )}
        {children}
        {effectiveEndIcon && !isLoading && (
          <IconContainer $position='end'>{effectiveEndIcon}</IconContainer>
        )}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
