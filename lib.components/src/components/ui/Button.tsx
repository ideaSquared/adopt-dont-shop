import React from 'react';
import styled from 'styled-components';
import { ButtonProps, ButtonSize, ButtonVariant } from '../../types';
import { Theme } from '../../styles/theme';

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $isLoading: boolean;
  $isFullWidth: boolean;
  $isRounded: boolean;
}

/* Utility function to get size styles */
const getSizeStyles = (size: ButtonSize, theme: Theme) => {
  switch (size) {
    case 'sm':
      return `
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.size.sm};
        min-height: 2rem;
      `;
    case 'lg':
      return `
        padding: ${theme.spacing.sm} ${theme.spacing.lg};
        font-size: ${theme.typography.size.lg};
        min-height: 3rem;
      `;
    case 'md':
    default:
      return `
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.size.base};
        min-height: 2.5rem;
      `;
  }
};

/* Utility function to get variant styles */
const getVariantStyles = (variant: ButtonVariant, theme: Theme) => {
  switch (variant) {
    case 'primary':
      return `
        background-color: ${theme.background.primary};
        color: ${theme.text.light};
        border: ${theme.border.width.thin} solid ${theme.background.primary};
        
        &:hover:not(:disabled) {
          filter: brightness(90%);
        }
        
        &:active:not(:disabled) {
          filter: brightness(85%);
        }
      `;
    case 'secondary':
      return `
        background-color: ${theme.background.secondary};
        color: ${theme.text.light};
        border: ${theme.border.width.thin} solid ${theme.background.secondary};
        
        &:hover:not(:disabled) {
          filter: brightness(90%);
        }
        
        &:active:not(:disabled) {
          filter: brightness(85%);
        }
      `;
    case 'outline':
      return `
        background-color: transparent;
        color: ${theme.text.primary};
        border: ${theme.border.width.thin} solid ${theme.border.color.primary};
        
        &:hover:not(:disabled) {
          background-color: ${theme.background.contrast};
        }
        
        &:active:not(:disabled) {
          background-color: ${theme.background.contrast};
        }
      `;
    case 'ghost':
      return `
        background-color: transparent;
        color: ${theme.text.primary};
        border: ${theme.border.width.thin} solid transparent;
        box-shadow: none;
        
        &:hover:not(:disabled) {
          background-color: ${theme.background.contrast};
        }
        
        &:active:not(:disabled) {
          background-color: ${theme.background.mouseHighlight};
        }
      `;
    case 'success':
      return `
        background-color: ${theme.background.success};
        color: ${theme.text.dark};
        border: ${theme.border.width.thin} solid ${theme.border.color.success};
        
        &:hover:not(:disabled) {
          filter: brightness(95%);
        }
      `;
    case 'danger':
      return `
        background-color: ${theme.background.danger};
        color: ${theme.text.dark};
        border: ${theme.border.width.thin} solid ${theme.border.color.danger};
        
        &:hover:not(:disabled) {
          filter: brightness(95%);
        }
      `;
    case 'warning':
      return `
        background-color: ${theme.background.warning};
        color: ${theme.text.dark};
        border: ${theme.border.width.thin} solid ${theme.border.color.warning};
        
        &:hover:not(:disabled) {
          filter: brightness(95%);
        }
      `;
    case 'info':
      return `
        background-color: ${theme.background.info};
        color: ${theme.text.dark};
        border: ${theme.border.width.thin} solid ${theme.border.color.info};
        
        &:hover:not(:disabled) {
          filter: brightness(95%);
        }
      `;
    default:
      return `
        background-color: ${theme.background.primary};
        color: ${theme.text.light};
        border: ${theme.border.width.thin} solid ${theme.background.primary};
        
        &:hover:not(:disabled) {
          filter: brightness(90%);
        }
      `;
  }
};

const StyledButton = styled.button<StyledButtonProps>`
  /* Base button styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  border-radius: ${({ theme, $isRounded }) =>
    $isRounded ? theme.border.radius.full : theme.border.radius.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.5;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: relative;
  overflow: hidden;

  /* Full width styling */
  width: ${({ $isFullWidth }) => ($isFullWidth ? '100%' : 'auto')};

  /* Apply size styles */
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  
  /* Disabled state */
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Loading state */
  ${({ $isLoading }) =>
    $isLoading &&
    `
    position: relative;
    color: transparent !important;
    pointer-events: none;
    
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 1rem;
      height: 1rem;
      margin: -0.5rem 0 0 -0.5rem;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-right-color: transparent;
      animation: spin 0.75s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `}
`;

const IconContainer = styled.span`
  display: inline-flex;
  align-items: center;
`;

const StartIconContainer = styled(IconContainer)`
  margin-right: ${({ theme }) => theme.spacing.xs};
`;

const EndIconContainer = styled(IconContainer)`
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      isFullWidth = false,
      isRounded = false,
      disabled = false,
      className = '',
      startIcon,
      endIcon,
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <StyledButton
        ref={ref}
        className={className}
        $variant={variant}
        $size={size}
        $isLoading={isLoading}
        $isFullWidth={isFullWidth}
        $isRounded={isRounded}
        disabled={disabled || isLoading}
        {...rest}
      >
        {' '}
        {startIcon && <StartIconContainer>{startIcon}</StartIconContainer>}
        {children}
        {endIcon && <EndIconContainer>{endIcon}</EndIconContainer>}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';
