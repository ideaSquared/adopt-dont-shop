import React, { useState } from 'react';
import styled, { css } from 'styled-components';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'square';
export type StatusIndicator = 'online' | 'offline' | 'away' | 'busy' | 'none';

export type AvatarProps = {
  /**
   * Source URL for the avatar image
   */
  src?: string;
  /**
   * Alt text for the avatar image
   */
  alt?: string;
  /**
   * Name used to generate initials as fallback
   */
  name?: string;
  /**
   * Custom initials (overrides name-based initials)
   */
  initials?: string;
  /**
   * Size of the avatar
   */
  size?: AvatarSize;
  /**
   * Shape of the avatar
   */
  shape?: AvatarShape;
  /**
   * Status indicator
   */
  status?: StatusIndicator;
  /**
   * Custom status color (overrides status-based color)
   */
  statusColor?: string;
  /**
   * Whether the avatar is clickable
   */
  clickable?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Custom fallback icon
   */
  fallbackIcon?: React.ReactNode;
  /**
   * Custom CSS class
   */
  className?: string;
  /**
   * Test ID for testing
   */
  'data-testid'?: string;
};

type Theme = {
  spacing: Record<string | number, string>;
  typography: {
    size: Record<string, string>;
    family: { sans: string };
    weight: { medium: number | string };
  };
  colors: {
    semantic: {
      success: Record<string, string>;
      warning: Record<string, string>;
      error: Record<string, string>;
    };
    neutral: Record<string, string>;
  };
  border: { radius: { full: string; lg: string } };
  transitions: { fast: string };
  mode?: string;
  shadows: { md: string; focus: string };
  background: { secondary: string };
};

const getSizeStyles = (size: AvatarSize, theme: Theme) => {
  const sizes = {
    xs: css`
      width: ${theme.spacing[6]};
      height: ${theme.spacing[6]};
      font-size: ${theme.typography.size.xs};
    `,
    sm: css`
      width: ${theme.spacing[8]};
      height: ${theme.spacing[8]};
      font-size: ${theme.typography.size.sm};
    `,
    md: css`
      width: ${theme.spacing[10]};
      height: ${theme.spacing[10]};
      font-size: ${theme.typography.size.base};
    `,
    lg: css`
      width: ${theme.spacing[12]};
      height: ${theme.spacing[12]};
      font-size: ${theme.typography.size.lg};
    `,
    xl: css`
      width: ${theme.spacing[16]};
      height: ${theme.spacing[16]};
      font-size: ${theme.typography.size.xl};
    `,
    '2xl': css`
      width: ${theme.spacing[20]};
      height: ${theme.spacing[20]};
      font-size: ${theme.typography.size['2xl']};
    `,
  };
  return sizes[size];
};

const getStatusColor = (status: StatusIndicator, theme: Theme) => {
  const colors = {
    online: theme.colors.semantic.success[500],
    offline: theme.colors.neutral[400],
    away: theme.colors.semantic.warning[500],
    busy: theme.colors.semantic.error[500],
    none: 'transparent',
  };
  return colors[status];
};

const AvatarContainer = styled.div<{
  $size: AvatarSize;
  $shape: AvatarShape;
  $clickable: boolean;
  $hasStatus: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.neutral[200]};
  color: ${({ theme }) => theme.colors.neutral[600]};
  font-family: ${({ theme }) => theme.typography.family.sans};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $size, theme }) => getSizeStyles($size, theme)}

  border-radius: ${({ $shape, theme }) =>
    $shape === 'circle' ? theme.border.radius.full : theme.border.radius.lg};

  ${({ $clickable, theme }) =>
    $clickable &&
    css`
      cursor: pointer;

      &:hover {
        transform: scale(1.05);
        box-shadow: ${theme.shadows.md};
      }

      &:focus-visible {
        outline: none;
        box-shadow: ${theme.shadows.focus};
      }

      &:active {
        transform: scale(0.95);
      }
    `}

  ${({ theme }) =>
    theme.mode === 'dark' &&
    css`
      background: ${theme.colors.neutral[700]};
      color: ${theme.colors.neutral[300]};
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    ${({ $clickable }) =>
      $clickable &&
      css`
        &:hover,
        &:active {
          transform: none;
        }
      `}
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
`;

const InitialsText = styled.span`
  text-transform: uppercase;
  user-select: none;
  line-height: 1;
`;

const FallbackIcon = styled.div<{ $size: AvatarSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: inherit;

  svg {
    width: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '16px';
        case 'sm':
          return '20px';
        case 'md':
          return '24px';
        case 'lg':
          return '28px';
        case 'xl':
          return '32px';
        case '2xl':
          return '40px';
        default:
          return '24px';
      }
    }};
    height: ${({ $size }) => {
      switch ($size) {
        case 'xs':
          return '16px';
        case 'sm':
          return '20px';
        case 'md':
          return '24px';
        case 'lg':
          return '28px';
        case 'xl':
          return '32px';
        case '2xl':
          return '40px';
        default:
          return '24px';
      }
    }};
  }
`;

const StatusIndicatorDot = styled.div<{
  $size: AvatarSize;
  $status: StatusIndicator;
  $customColor?: string;
}>`
  position: absolute;
  border-radius: ${({ theme }) => theme.border.radius.full};
  border: 2px solid ${({ theme }) => theme.background.secondary};
  background: ${({ $status, $customColor, theme }) =>
    $customColor || getStatusColor($status, theme)};

  ${({ $size, theme }) => {
    const dotSizes = {
      xs: css`
        width: ${theme.spacing[2]};
        height: ${theme.spacing[2]};
        bottom: 0;
        right: 0;
      `,
      sm: css`
        width: ${theme.spacing[2.5]};
        height: ${theme.spacing[2.5]};
        bottom: 0;
        right: 0;
      `,
      md: css`
        width: ${theme.spacing[3]};
        height: ${theme.spacing[3]};
        bottom: 0;
        right: 0;
      `,
      lg: css`
        width: ${theme.spacing[3.5]};
        height: ${theme.spacing[3.5]};
        bottom: 1px;
        right: 1px;
      `,
      xl: css`
        width: ${theme.spacing[4]};
        height: ${theme.spacing[4]};
        bottom: 2px;
        right: 2px;
      `,
      '2xl': css`
        width: ${theme.spacing[5]};
        height: ${theme.spacing[5]};
        bottom: 3px;
        right: 3px;
      `,
    };
    return dotSizes[$size];
  }}
`;

const DefaultFallbackIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' />
  </svg>
);

const generateInitials = (name: string): string => {
  if (!name) {
    return '';
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = '',
  initials,
  size = 'md',
  shape = 'circle',
  status = 'none',
  statusColor,
  clickable = false,
  onClick,
  fallbackIcon,
  className,
  'data-testid': dataTestId,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  // Removed imageLoaded state and handler as it was unused
  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  const displayInitials = initials || generateInitials(name);
  const showStatusIndicator = status !== 'none';
  const effectiveAlt = alt || `Avatar for ${name}` || 'Avatar';

  return (
    <AvatarContainer
      className={className}
      $size={size}
      $shape={shape}
      $clickable={clickable}
      $hasStatus={showStatusIndicator}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : 'img'}
      aria-label={clickable ? `Avatar for ${name}` : effectiveAlt}
      data-testid={dataTestId}
    >
      {/* Image */}
      {src && !imageError && (
        <AvatarImage
          src={src}
          alt={effectiveAlt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading='lazy'
        />
      )}

      {/* Fallback content when image fails or is not provided */}
      {(!src || imageError) && (
        <>
          {displayInitials ? (
            <InitialsText>{displayInitials}</InitialsText>
          ) : (
            <FallbackIcon $size={size}>{fallbackIcon || <DefaultFallbackIcon />}</FallbackIcon>
          )}
        </>
      )}

      {/* Status indicator */}
      {showStatusIndicator && (
        <StatusIndicatorDot
          $size={size}
          $status={status}
          $customColor={statusColor}
          aria-label={`Status: ${status}`}
        />
      )}
    </AvatarContainer>
  );
};

Avatar.displayName = 'Avatar';
