import clsx from 'clsx';
import React from 'react';

import * as styles from './Text.css';

export type TextVariant = 'body' | 'caption' | 'small' | 'lead' | 'muted' | 'highlight';

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

export type TextWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export type TextColor =
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

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  align?: TextAlign;
  color?: TextColor;
  as?: keyof React.JSX.IntrinsicElements;
  truncate?: boolean;
  italic?: boolean;
  underline?: boolean;
  className?: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
}

export const Text = ({
  variant = 'body',
  size = 'base',
  weight = 'normal',
  align = 'left',
  color = 'body',
  as = 'span' as keyof React.JSX.IntrinsicElements,
  truncate = false,
  italic = false,
  underline = false,
  className = '',
  children,
  ref,
  ...rest
}: TextProps) => {
  const Component = as as React.ElementType;
  return (
    <Component
      ref={ref}
      className={clsx(
        styles.base,
        styles.variants[variant],
        styles.sizes[size],
        styles.weights[weight],
        styles.colors[color],
        styles.aligns[align],
        truncate && styles.truncate,
        italic && styles.italic,
        underline && styles.underline,
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
};
