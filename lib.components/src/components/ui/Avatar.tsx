import clsx from 'clsx';
import React, { useState } from 'react';

import * as styles from './Avatar.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'square';
export type StatusIndicator = 'online' | 'offline' | 'away' | 'busy' | 'none';

export type AvatarProps = {
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  status?: StatusIndicator;
  statusColor?: string;
  clickable?: boolean;
  onClick?: () => void;
  fallbackIcon?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
};

const DefaultFallbackIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z' />
  </svg>
);

const generateInitials = (name: string): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
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

  const handleClick = () => {
    if (clickable && onClick) onClick();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  const displayInitials = initials || generateInitials(name);
  const showStatus = status !== 'none';
  const effectiveAlt = alt || `Avatar for ${name}` || 'Avatar';

  return (
    <div
      className={clsx(styles.container({ size, shape, clickable }), className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : 'img'}
      aria-label={clickable ? `Avatar for ${name}` : effectiveAlt}
      data-testid={dataTestId}
    >
      {src && !imageError && (
        <img
          className={styles.image}
          src={src}
          alt={effectiveAlt}
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
          loading='lazy'
        />
      )}

      {(!src || imageError) && (
        <>
          {displayInitials ? (
            <span className={styles.initials}>{displayInitials}</span>
          ) : (
            <div className={styles.fallbackIconContainer[size]}>
              {fallbackIcon ?? <DefaultFallbackIcon />}
            </div>
          )}
        </>
      )}

      {showStatus && (
        <div
          className={styles.statusDot({ size, status })}
          style={statusColor ? { background: statusColor } : undefined}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';
