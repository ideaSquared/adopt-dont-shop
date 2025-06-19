import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Badge variant
   */
  variant?: BadgeVariant;
  /**
   * Badge size
   */
  size?: BadgeSize;
  /**
   * Whether the badge is rounded
   */
  rounded?: boolean;
  /**
   * Whether the badge has a dot indicator
   */
  dot?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Badge content
   */
  children?: React.ReactNode;
}

interface StyledBadgeProps {
  $variant: BadgeVariant;
  $size: BadgeSize;
  $rounded: boolean;
  $dot: boolean;
}

const getSizeStyles = (size: BadgeSize, theme: Theme) => {
  switch (size) {
    case 'sm':
      return css`
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.size.xs};
        line-height: 1;
        min-height: 1.25rem;
      `;
    case 'lg':
      return css`
        padding: ${theme.spacing.sm} ${theme.spacing.md};
        font-size: ${theme.typography.size.sm};
        line-height: 1.2;
        min-height: 2rem;
      `;
    case 'md':
    default:
      return css`
        padding: ${theme.spacing.xs} ${theme.spacing.sm};
        font-size: ${theme.typography.size.sm};
        line-height: 1.1;
        min-height: 1.5rem;
      `;
  }
};

const getDotSizeStyles = (size: BadgeSize) => {
  switch (size) {
    case 'sm':
      return css`
        width: 0.5rem;
        height: 0.5rem;
      `;
    case 'lg':
      return css`
        width: 1rem;
        height: 1rem;
      `;
    case 'md':
    default:
      return css`
        width: 0.75rem;
        height: 0.75rem;
      `;
  }
};

const getVariantStyles = (variant: BadgeVariant, theme: Theme) => {
  switch (variant) {
    case 'primary':
      return css`
        background-color: ${theme.background.primary};
        color: ${theme.text.light};
        border: 1px solid ${theme.background.primary};
      `;
    case 'secondary':
      return css`
        background-color: ${theme.background.secondary};
        color: ${theme.text.light};
        border: 1px solid ${theme.background.secondary};
      `;
    case 'success':
      return css`
        background-color: ${theme.background.success};
        color: ${theme.text.dark};
        border: 1px solid ${theme.border.color.success};
      `;
    case 'danger':
      return css`
        background-color: ${theme.background.danger};
        color: ${theme.text.dark};
        border: 1px solid ${theme.border.color.danger};
      `;
    case 'warning':
      return css`
        background-color: ${theme.background.warning};
        color: ${theme.text.dark};
        border: 1px solid ${theme.border.color.warning};
      `;
    case 'info':
      return css`
        background-color: ${theme.background.info};
        color: ${theme.text.dark};
        border: 1px solid ${theme.border.color.info};
      `;
    case 'neutral':
      return css`
        background-color: ${theme.background.contrast};
        color: ${theme.text.dim};
        border: 1px solid ${theme.border.color.default};
      `;
    case 'outline':
      return css`
        background-color: transparent;
        color: ${theme.text.body};
        border: 1px solid ${theme.border.color.default};
      `;
    case 'default':
    default:
      return css`
        background-color: ${theme.background.contrast};
        color: ${theme.text.body};
        border: 1px solid ${theme.border.color.default};
      `;
  }
};

const StyledBadge = styled.span<StyledBadgeProps>`
  /* Base badge styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  vertical-align: middle;
  transition: all ${({ theme }) => theme.transitions.fast};

  /* Apply size styles */
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  
  /* Border radius */
  border-radius: ${({ $rounded, theme }) =>
    $rounded ? theme.border.radius.full : theme.border.radius.sm};

  /* Dot mode styles */
  ${({ $dot, $size }) =>
    $dot &&
    css`
      padding: 0;
      border-radius: 50%;
      ${getDotSizeStyles($size)}
    `}
`;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      rounded = false,
      dot = false,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <StyledBadge
        ref={ref}
        className={className}
        $variant={variant}
        $size={size}
        $rounded={rounded}
        $dot={dot}
        {...rest}
      >
        {!dot && children}
      </StyledBadge>
    );
  }
);

Badge.displayName = 'Badge';

