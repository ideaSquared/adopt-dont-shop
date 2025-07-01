import React from 'react';
import styled, { css } from 'styled-components';
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
  /**
   * Card variant for different visual styles
   */
  variant?: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass';
  /**
   * Whether the card is clickable
   */
  clickable?: boolean;
}

interface StyledCardProps {
  $hoverable: boolean;
  $shadowed: boolean;
  $bordered: boolean;
  $padding: 'none' | 'sm' | 'md' | 'lg';
  $variant: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass';
  $clickable: boolean;
}

const getPaddingStyles = (padding: 'none' | 'sm' | 'md' | 'lg', theme: Theme) => {
  switch (padding) {
    case 'none':
      return css`
        padding: 0;
      `;
    case 'sm':
      return css`
        padding: ${theme.spacing[3]};
      `;
    case 'lg':
      return css`
        padding: ${theme.spacing[6]};
      `;
    case 'md':
    default:
      return css`
        padding: ${theme.spacing[4]};
      `;
  }
};

const getVariantStyles = (
  variant: 'default' | 'outlined' | 'elevated' | 'filled' | 'glass',
  theme: Theme
) => {
  switch (variant) {
    case 'outlined':
      return css`
        background: ${theme.background.secondary};
        border: 1px solid ${theme.border.color.primary};
        box-shadow: none;
        backdrop-filter: blur(10px);
      `;
    case 'elevated':
      return css`
        background: ${theme.background.secondary};
        border: none;
        box-shadow: ${theme.shadows.xl};
        backdrop-filter: blur(10px);
      `;
    case 'filled':
      return css`
        background: ${theme.background.tertiary};
        border: none;
        box-shadow: ${theme.shadows.md};
        backdrop-filter: blur(10px);
      `;
    case 'glass':
      return css`
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: ${theme.shadows.lg};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
      `;
    case 'default':
    default:
      return css`
        background: ${theme.background.secondary};
        border: 1px solid ${theme.border.color.primary};
        box-shadow: ${theme.shadows.md};
        backdrop-filter: blur(10px);
      `;
  }
};

const StyledCard = styled.div<StyledCardProps>`
  position: relative;
  border-radius: ${({ theme }) => theme.border.radius.xl};
  transition: all ${({ theme }) => theme.transitions.normal}
    ${({ theme }) => theme.animations.easing.smooth};
  overflow: hidden;
  isolation: isolate;

  ${({ $padding, theme }) => getPaddingStyles($padding, theme)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      user-select: none;
    `}

  ${({ $hoverable, $clickable, theme }) =>
    ($hoverable || $clickable) &&
    css`
      &:hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: ${theme.shadows['2xl']};
      }

      &:active {
        transform: translateY(-2px) scale(1.01);
        box-shadow: ${theme.shadows.xl};
      }
    `}

  ${({ $bordered, theme }) =>
    $bordered &&
    css`
      border: 1px solid ${theme.border.color.secondary};
    `}

  /* Focus styles for accessibility */
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focusPrimary};
    transform: translateY(-2px);
  }

  /* Modern glass morphism effect for glass variant */
  ${({ $variant }) =>
    $variant === 'glass' &&
    css`
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.05) 100%
        );
        border-radius: inherit;
        z-index: -1;
      }
    `}

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }

    &:active {
      transform: none;
    }
  }
`;

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
  const effectiveTabIndex = clickable ? (tabIndex ?? 0) : tabIndex;

  return (
    <StyledCard
      className={className}
      $hoverable={hoverable}
      $shadowed={shadowed}
      $bordered={bordered}
      $padding={padding}
      $variant={variant}
      $clickable={clickable}
      tabIndex={effectiveTabIndex}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {children}
    </StyledCard>
  );
};

// Card subcomponents with modern styling
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * Whether to show a bottom border
   */
  bordered?: boolean;
}

const StyledCardHeader = styled.div<{ $bordered: boolean }>`
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]} 0;
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  ${({ $bordered, theme }) =>
    $bordered &&
    css`
      border-bottom: 1px solid ${theme.border.color.tertiary};
      padding-bottom: ${theme.spacing[4]};
    `}

  h1, h2, h3, h4, h5, h6 {
    margin-bottom: ${({ theme }) => theme.spacing[2]};
    color: ${({ theme }) => theme.text.primary};
    font-weight: ${({ theme }) => theme.typography.weight.semibold};
  }

  p {
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 0;
  }
`;

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  bordered = false,
  className,
  ...props
}) => (
  <StyledCardHeader className={className} $bordered={bordered} {...props}>
    {children}
  </StyledCardHeader>
);

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const StyledCardContent = styled.div`
  flex: 1;
  color: ${({ theme }) => theme.text.secondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

export const CardContent: React.FC<CardContentProps> = ({ children, className, ...props }) => (
  <StyledCardContent className={className} {...props}>
    {children}
  </StyledCardContent>
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * Whether to show a top border
   */
  bordered?: boolean;
}

const StyledCardFooter = styled.div<{ $bordered: boolean }>`
  padding: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};

  ${({ $bordered, theme }) =>
    $bordered &&
    css`
      border-top: 1px solid ${theme.border.color.tertiary};
      padding-top: ${theme.spacing[4]};
    `}

  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  justify-content: flex-end;
`;

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  bordered = false,
  className,
  ...props
}) => (
  <StyledCardFooter className={className} $bordered={bordered} {...props}>
    {children}
  </StyledCardFooter>
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

