type Theme = {
  spacing: Record<string | number, string>;
  typography: {
    size: Record<string, string>;
    lineHeight: Record<string, number>;
    family: { sans: string };
    weight: { medium: number | string };
  };
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    semantic: {
      success: Record<string, string>;
      warning: Record<string, string>;
      error: Record<string, string>;
      info: Record<string, string>;
    };
    neutral: Record<string, string>;
  };
  border: {
    radius: { full: string; md: string };
    color: { secondary: string };
  };
  transitions: { fast: string };
  mode?: string;
  shadows?: { md: string; focus: string };
  background?: { secondary: string };
  text: { secondary: string };
};
import React from 'react';
import styled, { css } from 'styled-components';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  /**
   * Custom icon to display before the text
   */
  icon?: React.ReactNode;
  /**
   * Whether the badge should have a rounded appearance
   */
  rounded?: boolean;
  /**
   * Whether the badge should have a dot indicator
   */
  dot?: boolean;
};

const getSizeStyles = (size: BadgeSize, theme: Theme) => {
  const sizes = {
    xs: css`
      padding: ${theme.spacing[0.5]} ${theme.spacing[1.5]};
      font-size: ${theme.typography.size.xs};
      line-height: ${theme.typography.lineHeight.tight};
      min-height: ${theme.spacing[4]};
    `,
    sm: css`
      padding: ${theme.spacing[1]} ${theme.spacing[2]};
      font-size: ${theme.typography.size.xs};
      line-height: ${theme.typography.lineHeight.tight};
      min-height: ${theme.spacing[5]};
    `,
    md: css`
      padding: ${theme.spacing[1]} ${theme.spacing[2.5]};
      font-size: ${theme.typography.size.sm};
      line-height: ${theme.typography.lineHeight.tight};
      min-height: ${theme.spacing[6]};
    `,
    lg: css`
      padding: ${theme.spacing[1.5]} ${theme.spacing[3]};
      font-size: ${theme.typography.size.base};
      line-height: ${theme.typography.lineHeight.tight};
      min-height: ${theme.spacing[7]};
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: BadgeVariant, theme: Theme) => {
  const variants = {
    primary: css`
      background: ${theme.colors.primary[100]};
      color: ${theme.colors.primary[800]};
      border: 1px solid ${theme.colors.primary[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.primary[900]};
        color: ${theme.colors.primary[100]};
        border-color: ${theme.colors.primary[700]};
      `}
    `,
    secondary: css`
      background: ${theme.colors.secondary[100]};
      color: ${theme.colors.secondary[800]};
      border: 1px solid ${theme.colors.secondary[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.secondary[900]};
        color: ${theme.colors.secondary[100]};
        border-color: ${theme.colors.secondary[700]};
      `}
    `,
    success: css`
      background: ${theme.colors.semantic.success[100]};
      color: ${theme.colors.semantic.success[800]};
      border: 1px solid ${theme.colors.semantic.success[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.semantic.success[900]};
        color: ${theme.colors.semantic.success[100]};
        border-color: ${theme.colors.semantic.success[700]};
      `}
    `,
    error: css`
      background: ${theme.colors.semantic.error[100]};
      color: ${theme.colors.semantic.error[800]};
      border: 1px solid ${theme.colors.semantic.error[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.semantic.error[900]};
        color: ${theme.colors.semantic.error[100]};
        border-color: ${theme.colors.semantic.error[700]};
      `}
    `,
    warning: css`
      background: ${theme.colors.semantic.warning[100]};
      color: ${theme.colors.semantic.warning[800]};
      border: 1px solid ${theme.colors.semantic.warning[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.semantic.warning[900]};
        color: ${theme.colors.semantic.warning[100]};
        border-color: ${theme.colors.semantic.warning[700]};
      `}
    `,
    info: css`
      background: ${theme.colors.semantic.info[100]};
      color: ${theme.colors.semantic.info[800]};
      border: 1px solid ${theme.colors.semantic.info[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.semantic.info[900]};
        color: ${theme.colors.semantic.info[100]};
        border-color: ${theme.colors.semantic.info[700]};
      `}
    `,
    neutral: css`
      background: ${theme.colors.neutral[100]};
      color: ${theme.colors.neutral[800]};
      border: 1px solid ${theme.colors.neutral[200]};

      ${theme.mode === 'dark' &&
      css`
        background: ${theme.colors.neutral[800]};
        color: ${theme.colors.neutral[100]};
        border-color: ${theme.colors.neutral[600]};
      `}
    `,
    outline: css`
      background: transparent;
      color: ${theme.text.secondary};
      border: 1px solid ${theme.border.color.secondary};

      ${theme.mode === 'dark' &&
      css`
        color: ${theme.text.secondary};
        border-color: ${theme.border.color.secondary};
      `}
    `,
  };
  return variants[variant];
};

const StyledBadge = styled.span<{
  $variant: BadgeVariant;
  $size: BadgeSize;
  $removable: boolean;
  $disabled: boolean;
  $rounded: boolean;
  $dot: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-family: ${({ theme }) => theme.typography.family.sans};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: ${({ theme, $rounded }) =>
    $rounded ? theme.border.radius.full : theme.border.radius.md};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $size, theme }) => getSizeStyles($size, theme)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    `}

  ${({ $dot, theme }) =>
    $dot &&
    css`
      padding-left: ${theme.spacing[2]};
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: ${theme.spacing[1]};
        top: 50%;
        transform: translateY(-50%);
        width: ${theme.spacing[1.5]};
        height: ${theme.spacing[1.5]};
        border-radius: ${theme.border.radius.full};
        background: currentColor;
      }
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const IconContainer = styled.span<{ $size: BadgeSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '12px';
        case 'sm':
          return '14px';
        case 'md':
          return '16px';
        case 'lg':
          return '18px';
        default:
          return '16px';
      }
    }};
    height: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '12px';
        case 'sm':
          return '14px';
        case 'md':
          return '16px';
        case 'lg':
          return '18px';
        default:
          return '16px';
      }
    }};
  }
`;

const RemoveButton = styled.button<{ $size: BadgeSize; $variant: BadgeVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  border-radius: ${({ theme }) => theme.border.radius.full};
  padding: ${({ theme }) => theme.spacing[0.5]};
  margin: -${({ theme }) => theme.spacing[0.5]};
  margin-left: ${({ theme }) => theme.spacing[0.5]};
  transition: all ${({ theme }) => theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: none;
    opacity: 1;
    box-shadow: 0 0 0 2px currentColor;
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
    width: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '10px';
        case 'sm':
          return '12px';
        case 'md':
          return '14px';
        case 'lg':
          return '16px';
        default:
          return '14px';
      }
    }};
    height: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '10px';
        case 'sm':
          return '12px';
        case 'md':
          return '14px';
        case 'lg':
          return '16px';
        default:
          return '14px';
      }
    }};
  }
`;

const CloseIcon = () => (
  <svg viewBox='0 0 20 20' fill='currentColor'>
    <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
  </svg>
);

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  removable = false,
  onRemove,
  disabled = false,
  className,
  'data-testid': dataTestId,
  icon,
  rounded = false,
  dot = false,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (onRemove && !disabled) {
      onRemove();
    }
  };

  return (
    <StyledBadge
      className={className}
      $variant={variant}
      $size={size}
      $removable={removable}
      $disabled={disabled}
      $rounded={rounded}
      $dot={dot}
      data-testid={dataTestId}
      role='status'
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {icon && <IconContainer $size={size}>{icon}</IconContainer>}

      {children && <span>{children}</span>}

      {removable && (
        <RemoveButton
          $size={size}
          $variant={variant}
          onClick={handleRemove}
          disabled={disabled}
          aria-label='Remove badge'
          type='button'
        >
          <CloseIcon />
        </RemoveButton>
      )}
    </StyledBadge>
  );
};

Badge.displayName = 'Badge';
