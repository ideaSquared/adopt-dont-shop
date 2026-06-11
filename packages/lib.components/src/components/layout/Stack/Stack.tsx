import clsx from 'clsx';
import React from 'react';

import * as styles from './Stack.css';

export type StackDirection = 'vertical' | 'horizontal';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type StackSpacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none';

export type StackProps = {
  children: React.ReactNode;
  direction?: StackDirection;
  spacing?: StackSpacing;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  fullWidth?: boolean;
  fullHeight?: boolean;
  className?: string;
  'data-testid'?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  fullWidth = false,
  fullHeight = false,
  className,
  'data-testid': dataTestId,
  ...props
}) => {
  return (
    <div
      className={clsx(
        styles.stack({ direction, spacing, align, justify, wrap, fullWidth, fullHeight }),
        className
      )}
      data-testid={dataTestId}
      {...props}
    >
      {children}
    </div>
  );
};
