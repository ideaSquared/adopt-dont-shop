import clsx from 'clsx';
import React from 'react';

import * as styles from './Container.css';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ContainerProps = {
  children: React.ReactNode;
  size?: ContainerSize;
  fluid?: boolean;
  centerContent?: boolean;
  className?: string;
  'data-testid'?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  fluid = false,
  centerContent = false,
  className,
  'data-testid': dataTestId,
  ...props
}) => {
  return (
    <div
      className={clsx(styles.container({ size, fluid, centerContent }), className)}
      data-testid={dataTestId}
      {...props}
    >
      {children}
    </div>
  );
};
