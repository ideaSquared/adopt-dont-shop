import clsx from 'clsx';
import React from 'react';

import * as styles from './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  shadowed?: boolean;
  bordered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass';
  clickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  shadowed = true,
  bordered = false,
  padding = 'md',
  variant = 'default',
  clickable = false,
  className,
  tabIndex,
  ...props
}) => {
  const effectiveHoverable = hoverable || clickable;
  const effectiveTabIndex = clickable ? (tabIndex ?? 0) : tabIndex;

  return (
    <div
      className={clsx(
        styles.card({ variant, padding, clickable, hoverable: effectiveHoverable, bordered }),
        className
      )}
      tabIndex={effectiveTabIndex}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  bordered?: boolean;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  bordered = false,
  className,
  ...props
}) => (
  <div className={clsx(styles.cardHeader({ bordered }), className)} {...props}>
    {children}
  </div>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className, ...props }) => (
  <div className={clsx(styles.cardContent, className)} {...props}>
    {children}
  </div>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  bordered?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  bordered = false,
  className,
  ...props
}) => (
  <div className={clsx(styles.cardFooter({ bordered }), className)} {...props}>
    {children}
  </div>
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';
