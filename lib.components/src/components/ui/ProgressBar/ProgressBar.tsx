import React from 'react';
import styled, { css, DefaultTheme, keyframes } from 'styled-components';

export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  variant?: ProgressBarVariant;
  label?: string;
  showValue?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  striped?: boolean;
  indeterminate?: boolean;
  className?: string;
  'data-testid'?: string;
}

const pulse = keyframes`
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
`;

const indeterminateAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
`;

const getSizeStyles = (size: ProgressBarSize) => {
  const sizes = {
    sm: css`
      height: 6px;
    `,
    md: css`
      height: 10px;
    `,
    lg: css`
      height: 16px;
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: ProgressBarVariant, theme: DefaultTheme) => {
  const variants = {
    default: css`
      background-color: ${theme.colors.primary[500]};
    `,
    success: css`
      background-color: ${theme.colors.semantic.success[500]};
    `,
    warning: css`
      background-color: ${theme.colors.semantic.warning[500]};
    `,
    error: css`
      background-color: ${theme.colors.semantic.error[500]};
    `,
  };
  return variants[variant];
};

const ProgressContainer = styled.div`
  width: 100%;
`;

const LabelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  color: ${({ theme }) => theme.colors.neutral[700]};
`;

const ValueText = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.colors.neutral[600]};
`;

const ProgressTrack = styled.div<{ $size: ProgressBarSize }>`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.border.radius.full};
  overflow: hidden;
  position: relative;

  ${({ $size }) => getSizeStyles($size)}
`;

const ProgressFill = styled.div<{
  $size: ProgressBarSize;
  $variant: ProgressBarVariant;
  $animated: boolean;
  $striped: boolean;
  $indeterminate: boolean;
  $progress: number;
}>`
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease-in-out;
  position: relative;

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}

  ${({ $indeterminate, $progress }) =>
    $indeterminate
      ? css`
          width: 25%;
          animation: ${indeterminateAnimation} 2s infinite linear;
        `
      : css`
          width: ${$progress}%;
        `}

  ${({ $striped }) =>
    $striped &&
    css`
      background-image: linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0.15) 75%,
        transparent 75%,
        transparent
      );
      background-size: 1rem 1rem;
    `}

  ${({ $animated, $striped }) =>
    $animated &&
    $striped &&
    css`
      animation: ${pulse} 2s infinite linear;
    `}
`;

const ScreenReaderText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  label,
  showValue = false,
  showPercentage = false,
  animated = false,
  striped = false,
  indeterminate = false,
  className,
  'data-testid': testId,
}) => {
  // Clamp value between 0 and max
  const clampedValue = Math.min(Math.max(0, value), max);
  const percentage = indeterminate ? 0 : (clampedValue / max) * 100;

  const formatValue = () => {
    if (showPercentage) {
      return `${Math.round(percentage)}%`;
    }
    if (showValue) {
      return `${clampedValue}/${max}`;
    }
    return null;
  };

  const valueDisplay = formatValue();
  const ariaValueNow = indeterminate ? undefined : clampedValue;
  const ariaLabel = indeterminate
    ? `${label || 'Progress'} - loading`
    : `${label || 'Progress'} - ${clampedValue} of ${max}`;

  return (
    <ProgressContainer className={className} data-testid={testId}>
      {(label || valueDisplay) && (
        <LabelContainer>
          {label && <Label>{label}</Label>}
          {valueDisplay && <ValueText>{valueDisplay}</ValueText>}
        </LabelContainer>
      )}

      <ProgressTrack
        $size={size}
        role='progressbar'
        aria-label={ariaLabel}
        aria-valuenow={ariaValueNow}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <ProgressFill
          $size={size}
          $variant={variant}
          $animated={animated}
          $striped={striped}
          $indeterminate={indeterminate}
          $progress={percentage}
        />

        <ScreenReaderText>
          {indeterminate
            ? `${label || 'Progress'} - loading`
            : `${label || 'Progress'} - ${Math.round(percentage)}% complete`}
        </ScreenReaderText>
      </ProgressTrack>
    </ProgressContainer>
  );
};
