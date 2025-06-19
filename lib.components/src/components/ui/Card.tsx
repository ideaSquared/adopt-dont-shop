import React from 'react';
import styled from 'styled-components';
import { Theme } from '../../styles/theme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card content
   */
  children: React.ReactNode;
  /**
   * Whether the card has a hover effect
   */
  hoverable?: boolean;
  /**
   * Whether the card has a shadow
   */
  shadowed?: boolean;
  /**
   * Whether the card has a border
   */
  bordered?: boolean;
  /**
   * Card padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface StyledCardProps {
  $hoverable: boolean;
  $shadowed: boolean;
  $bordered: boolean;
  $padding: 'none' | 'sm' | 'md' | 'lg';
}

// Helper for padding styles
const getPaddingStyles = (padding: 'none' | 'sm' | 'md' | 'lg', theme: Theme) => {
  switch (padding) {
    case 'none':
      return 'padding: 0;';
    case 'sm':
      return `padding: ${theme.spacing.sm};`;
    case 'lg':
      return `padding: ${theme.spacing.lg};`;
    case 'md':
    default:
      return `padding: ${theme.spacing.md};`;
  }
};

const StyledCard = styled.div<StyledCardProps>`
  background-color: ${({ theme }) => theme.background.content};
  border-radius: ${({ theme }) => theme.border.radius.md};
  overflow: hidden;

  /* Border styles */
  ${({ theme, $bordered }) =>
    $bordered
      ? `border: ${theme.border.width.thin} solid ${theme.border.color.default};`
      : 'border: none;'}

  /* Shadow styles */
  box-shadow: ${({ theme, $shadowed }) => ($shadowed ? theme.shadows.md : 'none')};

  /* Hover effect */
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  ${({ $hoverable, theme }) =>
    $hoverable &&
    `
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.lg};
    }
  `}
`;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      hoverable = false,
      shadowed = true,
      bordered = true,
      padding = 'md',
      ...props
    },
    ref
  ) => {
    return (
      <StyledCard
        ref={ref}
        className={className}
        $hoverable={hoverable}
        $shadowed={shadowed}
        $bordered={bordered}
        $padding={padding}
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const StyledCardHeader = styled.div<{ $padding: 'none' | 'sm' | 'md' | 'lg' }>`
  ${({ $padding, theme }) => getPaddingStyles($padding, theme)}

  ${({ $padding, theme }) =>
    $padding !== 'none' &&
    `
    border-bottom: ${theme.border.width.thin} solid ${theme.border.color.default};
  `}
  
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  CardHeaderProps & { padding?: 'none' | 'sm' | 'md' | 'lg' }
>(({ className, children, padding = 'md', ...props }, ref) => {
  return (
    <StyledCardHeader ref={ref} className={className} $padding={padding} {...props}>
      {children}
    </StyledCardHeader>
  );
});

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const StyledCardContent = styled.div<{ $padding: 'none' | 'sm' | 'md' | 'lg' }>`
  ${({ $padding, theme }) => getPaddingStyles($padding, theme)}
`;

export const CardContent = React.forwardRef<
  HTMLDivElement,
  CardContentProps & { padding?: 'none' | 'sm' | 'md' | 'lg' }
>(({ className, children, padding = 'md', ...props }, ref) => {
  return (
    <StyledCardContent ref={ref} className={className} $padding={padding} {...props}>
      {children}
    </StyledCardContent>
  );
});

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const StyledCardFooter = styled.div<{ $padding: 'none' | 'sm' | 'md' | 'lg' }>`
  ${({ $padding, theme }) => getPaddingStyles($padding, theme)}

  ${({ $padding, theme }) =>
    $padding !== 'none' &&
    `
    border-top: ${theme.border.width.thin} solid ${theme.border.color.default};
  `}
  
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  CardFooterProps & { padding?: 'none' | 'sm' | 'md' | 'lg' }
>(({ className, children, padding = 'md', ...props }, ref) => {
  return (
    <StyledCardFooter ref={ref} className={className} $padding={padding} {...props}>
      {children}
    </StyledCardFooter>
  );
});

CardFooter.displayName = 'CardFooter';
