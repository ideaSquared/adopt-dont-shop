import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type AvatarVariant = 'circle' | 'square' | 'rounded';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Avatar size
   */
  size?: AvatarSize;
  /**
   * Avatar shape variant
   */
  variant?: AvatarVariant;
  /**
   * Image source URL
   */
  src?: string;
  /**
   * Alt text for the image
   */
  alt?: string;
  /**
   * Fallback text when no image is provided (usually initials)
   */
  fallback?: string;
  /**
   * Custom fallback icon
   */
  fallbackIcon?: React.ReactNode;
  /**
   * Background color for fallback
   */
  backgroundColor?: string;
  /**
   * Text color for fallback
   */
  textColor?: string;
  /**
   * Whether the avatar has a border
   */
  bordered?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

interface StyledAvatarProps {
  $size: AvatarSize;
  $variant: AvatarVariant;
  $backgroundColor?: string;
  $textColor?: string;
  $bordered: boolean;
}

const getSizeStyles = (size: AvatarSize) => {
  switch (size) {
    case 'xs':
      return css`
        width: 1.5rem;
        height: 1.5rem;
        font-size: 0.625rem;
      `;
    case 'sm':
      return css`
        width: 2rem;
        height: 2rem;
        font-size: 0.75rem;
      `;
    case 'lg':
      return css`
        width: 4rem;
        height: 4rem;
        font-size: 1.125rem;
      `;
    case 'xl':
      return css`
        width: 5rem;
        height: 5rem;
        font-size: 1.25rem;
      `;
    case '2xl':
      return css`
        width: 6rem;
        height: 6rem;
        font-size: 1.5rem;
      `;
    case 'md':
    default:
      return css`
        width: 3rem;
        height: 3rem;
        font-size: 1rem;
      `;
  }
};

const getVariantStyles = (variant: AvatarVariant, theme: Theme) => {
  switch (variant) {
    case 'square':
      return css`
        border-radius: 0;
      `;
    case 'rounded':
      return css`
        border-radius: ${theme.border.radius.md};
      `;
    case 'circle':
    default:
      return css`
        border-radius: ${theme.border.radius.full};
      `;
  }
};

const StyledAvatar = styled.div<StyledAvatarProps>`
  /* Base avatar styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  vertical-align: middle;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  line-height: 1;
  user-select: none;

  /* Apply size styles */
  ${({ $size }) => getSizeStyles($size)}

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  
  /* Background and text colors */
  background-color: ${({ $backgroundColor, theme }) =>
    $backgroundColor || theme.background.contrast};
  color: ${({ $textColor, theme }) => $textColor || theme.text.body};

  /* Border */
  ${({ $bordered, theme }) =>
    $bordered &&
    css`
      border: ${theme.border.width.normal} solid ${theme.border.color.default};
    `}
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
`;

const AvatarFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-transform: uppercase;
  font-weight: inherit;
`;

const DefaultFallbackIcon = styled.div`
  width: 60%;
  height: 60%;
  background-color: currentColor;
  mask: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3e%3c/svg%3e")
    no-repeat center;
  mask-size: contain;
`;

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      size = 'md',
      variant = 'circle',
      src,
      alt = '',
      fallback,
      fallbackIcon,
      backgroundColor,
      textColor,
      bordered = false,
      className = '',
      ...rest
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);

    const handleImageError = () => {
      setImageError(true);
    };

    const handleImageLoad = () => {
      setImageLoaded(true);
      setImageError(false);
    };

    // Reset error state when src changes
    React.useEffect(() => {
      if (src) {
        setImageError(false);
        setImageLoaded(false);
      }
    }, [src]);

    const shouldShowImage = src && !imageError && imageLoaded;
    const shouldShowFallback = !src || imageError || !imageLoaded;

    return (
      <StyledAvatar
        ref={ref}
        className={className}
        $size={size}
        $variant={variant}
        $backgroundColor={backgroundColor}
        $textColor={textColor}
        $bordered={bordered}
        {...rest}
      >
        {src && (
          <AvatarImage
            src={src}
            alt={alt}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              display: shouldShowImage ? 'block' : 'none',
            }}
          />
        )}
        {shouldShowFallback && (
          <AvatarFallback>
            {fallbackIcon || (fallback ? fallback : <DefaultFallbackIcon />)}
          </AvatarFallback>
        )}
      </StyledAvatar>
    );
  }
);

Avatar.displayName = 'Avatar';
