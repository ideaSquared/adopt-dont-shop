import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Theme } from '../../styles/theme';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'current';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Spinner size
   */
  size?: SpinnerSize;
  /**
   * Spinner color variant
   */
  variant?: SpinnerVariant;
  /**
   * Loading text label (for accessibility)
   */
  label?: string;
  /**
   * Whether to show loading text
   */
  showLabel?: boolean;
  /**
   * Custom loading text
   */
  text?: string;
  /**
   * Additional class name
   */
  className?: string;
}

interface StyledSpinnerProps {
  $size: SpinnerSize;
  $variant: SpinnerVariant;
}

// Keyframe animations
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`;

const getSizeStyles = (size: SpinnerSize) => {
  switch (size) {
    case 'xs':
      return css`
        width: 1rem;
        height: 1rem;
        border-width: 1px;
      `;
    case 'sm':
      return css`
        width: 1.25rem;
        height: 1.25rem;
        border-width: 2px;
      `;
    case 'lg':
      return css`
        width: 2rem;
        height: 2rem;
        border-width: 3px;
      `;
    case 'xl':
      return css`
        width: 3rem;
        height: 3rem;
        border-width: 4px;
      `;
    case 'md':
    default:
      return css`
        width: 1.5rem;
        height: 1.5rem;
        border-width: 2px;
      `;
  }
};

const getVariantStyles = (variant: SpinnerVariant, theme: Theme) => {
  switch (variant) {
    case 'primary':
      return css`
        border-color: ${theme.background.primary};
        border-right-color: transparent;
      `;
    case 'secondary':
      return css`
        border-color: ${theme.background.secondary};
        border-right-color: transparent;
      `;
    case 'current':
      return css`
        border-color: currentColor;
        border-right-color: transparent;
      `;
    case 'default':
    default:
      return css`
        border-color: ${theme.border.color.primary};
        border-right-color: transparent;
      `;
  }
};

const SpinnerContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const StyledSpinner = styled.div<StyledSpinnerProps>`
  /* Base spinner styles */
  border-radius: 50%;
  border-style: solid;
  animation: ${spin} 0.75s linear infinite;

  /* Apply size styles */
  ${({ $size }) => getSizeStyles($size)}

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
`;

const SpinnerLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.text.disabled};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
`;

// Alternative dot spinner
const DotSpinnerContainer = styled.div<{ $size: SpinnerSize }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === 'xs' || $size === 'sm' ? '2px' : '4px')};
`;

const SpinnerDot = styled.div<{ $size: SpinnerSize; $variant: SpinnerVariant; $delay: number }>`
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite both;
  animation-delay: ${({ $delay }) => $delay}s;

  ${({ $size }) => {
    switch ($size) {
      case 'xs':
        return css`
          width: 0.25rem;
          height: 0.25rem;
        `;
      case 'sm':
        return css`
          width: 0.375rem;
          height: 0.375rem;
        `;
      case 'lg':
        return css`
          width: 0.625rem;
          height: 0.625rem;
        `;
      case 'xl':
        return css`
          width: 0.75rem;
          height: 0.75rem;
        `;
      case 'md':
      default:
        return css`
          width: 0.5rem;
          height: 0.5rem;
        `;
    }
  }}

  ${({ $variant, theme }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background-color: ${theme.background.primary};
        `;
      case 'secondary':
        return css`
          background-color: ${theme.background.secondary};
        `;
      case 'current':
        return css`
          background-color: currentColor;
        `;
      case 'default':
      default:
        return css`
          background-color: ${theme.border.color.primary};
        `;
    }
  }}
`;

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label = 'Loading...',
      showLabel = false,
      text,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <SpinnerContainer ref={ref} className={className} {...rest}>
        <StyledSpinner $size={size} $variant={variant} role='status' aria-label={label} />
        {showLabel && <SpinnerLabel>{text || label}</SpinnerLabel>}
      </SpinnerContainer>
    );
  }
);

Spinner.displayName = 'Spinner';

// Export dot spinner as a separate component
export const DotSpinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'default',
      label = 'Loading...',
      showLabel = false,
      text,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <SpinnerContainer ref={ref} className={className} {...rest}>
        <DotSpinnerContainer $size={size} role='status' aria-label={label}>
          <SpinnerDot $size={size} $variant={variant} $delay={-0.32} />
          <SpinnerDot $size={size} $variant={variant} $delay={-0.16} />
          <SpinnerDot $size={size} $variant={variant} $delay={0} />
        </DotSpinnerContainer>
        {showLabel && <SpinnerLabel>{text || label}</SpinnerLabel>}
      </SpinnerContainer>
    );
  }
);

DotSpinner.displayName = 'DotSpinner';
