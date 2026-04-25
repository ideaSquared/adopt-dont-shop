import clsx from 'clsx';
import React from 'react';

import * as styles from './Heading.css';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export type HeadingWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export type HeadingAlign = 'left' | 'center' | 'right' | 'justify';

export type HeadingColor =
  | 'body'
  | 'dark'
  | 'light'
  | 'muted'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  size?: HeadingSize;
  weight?: HeadingWeight;
  align?: HeadingAlign;
  color?: HeadingColor;
  truncate?: boolean;
  noMargin?: boolean;
  className?: string;
  children: React.ReactNode;
}

const defaultSizeForLevel: Record<HeadingLevel, HeadingSize> = {
  h1: '4xl',
  h2: '3xl',
  h3: '2xl',
  h4: 'xl',
  h5: 'lg',
  h6: 'md',
};

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    {
      level = 'h2',
      size,
      weight = 'semibold',
      align = 'left',
      color = 'body',
      truncate = false,
      noMargin = false,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const Tag = level;
    const headingSize = size ?? defaultSizeForLevel[level];

    return (
      <Tag
        ref={ref}
        className={clsx(
          styles.base,
          styles.sizes[headingSize],
          styles.weights[weight],
          styles.colors[color],
          styles.aligns[align],
          noMargin ? styles.margins.none : styles.margins[level],
          truncate && styles.truncate,
          className
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  }
);

Heading.displayName = 'Heading';
