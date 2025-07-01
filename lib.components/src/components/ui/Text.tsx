import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';

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
  /**
   * Text variant style
   */
  variant?: TextVariant;
  /**
   * Text size
   */
  size?: TextSize;
  /**
   * Font weight
   */
  weight?: TextWeight;
  /**
   * Text alignment
   */
  align?: TextAlign;
  /**
   * Text color
   */
  color?: TextColor;
  /**
   * HTML element to render as
   */
  as?: keyof JSX.IntrinsicElements;
  /**
   * Whether text is truncated with ellipsis
   */
  truncate?: boolean;
  /**
   * Whether text is italic
   */
  italic?: boolean;
  /**
   * Whether text is underlined
   */
  underline?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Text content
   */
  children: React.ReactNode;
}

interface StyledTextProps {
  $variant: TextVariant;
  $size: TextSize;
  $weight: TextWeight;
  $align: TextAlign;
  $color: TextColor;
  $truncate: boolean;
  $italic: boolean;
  $underline: boolean;
}

const getVariantStyles = (variant: TextVariant, theme: Theme) => {
  switch (variant) {
    case 'caption':
      return css`
        font-size: ${theme.typography.size.xs};
        font-weight: ${theme.typography.weight.normal};
        color: ${theme.text.tertiary};
        text-transform: uppercase;
        letter-spacing: 0.05em;
      `;
    case 'small':
      return css`
        font-size: ${theme.typography.size.sm};
        font-weight: ${theme.typography.weight.normal};
      `;
    case 'lead':
      return css`
        font-size: ${theme.typography.size.lg};
        font-weight: ${theme.typography.weight.normal};
        line-height: 1.6;
      `;
    case 'muted':
      return css`
        color: ${theme.text.tertiary};
      `;
    case 'highlight':
      return css`
        color: ${theme.text.primary};
        font-weight: ${theme.typography.weight.medium};
      `;
    case 'body':
    default:
      return css`
        font-size: ${theme.typography.size.base};
        font-weight: ${theme.typography.weight.normal};
      `;
  }
};

const getSizeStyles = (size: TextSize, theme: Theme) => {
  switch (size) {
    case 'xs':
      return `font-size: ${theme.typography.size.xs};`;
    case 'sm':
      return `font-size: ${theme.typography.size.sm};`;
    case 'lg':
      return `font-size: ${theme.typography.size.lg};`;
    case 'xl':
      return `font-size: ${theme.typography.size.xl};`;
    case 'base':
    default:
      return `font-size: ${theme.typography.size.base};`;
  }
};

const getWeightStyles = (weight: TextWeight, theme: Theme) => {
  switch (weight) {
    case 'light':
      return `font-weight: ${theme.typography.weight.light};`;
    case 'medium':
      return `font-weight: ${theme.typography.weight.medium};`;
    case 'semibold':
      return `font-weight: ${theme.typography.weight.semibold};`;
    case 'bold':
      return `font-weight: ${theme.typography.weight.bold};`;
    case 'normal':
    default:
      return `font-weight: ${theme.typography.weight.normal};`;
  }
};

const getColorStyles = (color: TextColor, theme: Theme) => {
  switch (color) {
    case 'dark':
      return `color: ${theme.text.primary};`;
    case 'light':
      return `color: ${theme.text.inverse};`;
    case 'muted':
      return `color: ${theme.text.tertiary};`;
    case 'primary':
      return `color: ${theme.text.primary};`;
    case 'secondary':
      return `color: ${theme.text.secondary};`;
    case 'success':
      return `color: ${theme.text.success};`;
    case 'danger':
      return `color: ${theme.text.error};`;
    case 'warning':
      return `color: ${theme.text.warning};`;
    case 'info':
      return `color: ${theme.text.info};`;
    case 'body':
    default:
      return `color: ${theme.text.primary};`;
  }
};

const StyledText = styled.span<StyledTextProps>`
  /* Base text styles */
  font-family: ${({ theme }) => theme.typography.family.sans};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};

  /* Apply variant styles */
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}

  /* Apply size styles */
  ${({ $size, theme }) => getSizeStyles($size, theme)}
  
  /* Apply weight styles */
  ${({ $weight, theme }) => getWeightStyles($weight, theme)}
  
  /* Apply color styles */
  ${({ $color, theme }) => getColorStyles($color, theme)}
  
  /* Text alignment */
  text-align: ${({ $align }) => $align};

  /* Text decorations */
  font-style: ${({ $italic }) => ($italic ? 'italic' : 'normal')};
  text-decoration: ${({ $underline }) => ($underline ? 'underline' : 'none')};

  /* Truncation */
  ${({ $truncate }) =>
    $truncate &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}
`;

export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      variant = 'body',
      size = 'base',
      weight = 'normal',
      align = 'left',
      color = 'body',
      as = 'span',
      truncate = false,
      italic = false,
      underline = false,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <StyledText
        as={as}
        ref={ref}
        className={className}
        $variant={variant}
        $size={size}
        $weight={weight}
        $align={align}
        $color={color}
        $truncate={truncate}
        $italic={italic}
        $underline={underline}
        {...rest}
      >
        {children}
      </StyledText>
    );
  }
);

Text.displayName = 'Text';
