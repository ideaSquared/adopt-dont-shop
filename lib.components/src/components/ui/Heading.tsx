import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';

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
  /**
   * Semantic heading level
   */
  level?: HeadingLevel;
  /**
   * Visual size (independent of semantic level)
   */
  size?: HeadingSize;
  /**
   * Font weight
   */
  weight?: HeadingWeight;
  /**
   * Text alignment
   */
  align?: HeadingAlign;
  /**
   * Text color
   */
  color?: HeadingColor;
  /**
   * Whether text is truncated with ellipsis
   */
  truncate?: boolean;
  /**
   * Whether heading has bottom margin
   */
  noMargin?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Heading content
   */
  children: React.ReactNode;
}

interface StyledHeadingProps {
  $level: HeadingLevel;
  $size: HeadingSize;
  $weight: HeadingWeight;
  $align: HeadingAlign;
  $color: HeadingColor;
  $truncate: boolean;
  $noMargin: boolean;
}

const getDefaultSizeForLevel = (level: HeadingLevel): HeadingSize => {
  switch (level) {
    case 'h1':
      return '4xl';
    case 'h2':
      return '3xl';
    case 'h3':
      return '2xl';
    case 'h4':
      return 'xl';
    case 'h5':
      return 'lg';
    case 'h6':
      return 'md';
    default:
      return 'lg';
  }
};

const getSizeStyles = (size: HeadingSize, theme: Theme) => {
  switch (size) {
    case 'xs':
      return css`
        font-size: ${theme.typography.size.sm};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case 'sm':
      return css`
        font-size: ${theme.typography.size.base};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case 'md':
      return css`
        font-size: ${theme.typography.size.lg};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case 'lg':
      return css`
        font-size: ${theme.typography.size.xl};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case 'xl':
      return css`
        font-size: ${theme.typography.size['2xl']};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case '2xl':
      return css`
        font-size: ${theme.typography.size['3xl']};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case '3xl':
      return css`
        font-size: ${theme.typography.size['4xl']};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    case '4xl':
      return css`
        font-size: ${theme.typography.size['5xl']};
        line-height: ${theme.typography.lineHeight.tight};
      `;
    default:
      return css`
        font-size: ${theme.typography.size.xl};
        line-height: ${theme.typography.lineHeight.tight};
      `;
  }
};

const getWeightStyles = (weight: HeadingWeight, theme: Theme) => {
  switch (weight) {
    case 'light':
      return `font-weight: ${theme.typography.weight.light};`;
    case 'normal':
      return `font-weight: ${theme.typography.weight.normal};`;
    case 'medium':
      return `font-weight: ${theme.typography.weight.medium};`;
    case 'semibold':
      return `font-weight: ${theme.typography.weight.semibold};`;
    case 'bold':
      return `font-weight: ${theme.typography.weight.bold};`;
    default:
      return `font-weight: ${theme.typography.weight.semibold};`;
  }
};

const getColorStyles = (color: HeadingColor, theme: Theme) => {
  switch (color) {
    case 'dark':
      return `color: ${theme.text.primary};`;
    case 'light':
      return `color: ${theme.text.inverse};`;
    case 'muted':
      return `color: ${theme.text.disabled};`;
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

const getMarginStyles = (level: HeadingLevel, noMargin: boolean, theme: Theme) => {
  if (noMargin) return `margin: 0;`;

  switch (level) {
    case 'h1':
      return `margin: 0 0 ${theme.spacing.xl} 0;`;
    case 'h2':
      return `margin: 0 0 ${theme.spacing.lg} 0;`;
    case 'h3':
      return `margin: 0 0 ${theme.spacing.md} 0;`;
    case 'h4':
    case 'h5':
    case 'h6':
      return `margin: 0 0 ${theme.spacing.sm} 0;`;
    default:
      return `margin: 0 0 ${theme.spacing.md} 0;`;
  }
};

const StyledHeading = styled.h1.withConfig({
  shouldForwardProp: prop => !prop.startsWith('$'),
})<StyledHeadingProps>`
  /* Base heading styles */
  font-family: ${({ theme }) => theme.typography.family.display};

  /* Apply size styles */
  ${({ $size, theme }) => getSizeStyles($size, theme)}

  /* Apply weight styles */
  ${({ $weight, theme }) => getWeightStyles($weight, theme)}
  
  /* Apply color styles */
  ${({ $color, theme }) => getColorStyles($color, theme)}
  
  /* Apply margin styles */
  ${({ $level, $noMargin, theme }) => getMarginStyles($level, $noMargin, theme)}
  
  /* Text alignment */
  text-align: ${({ $align }) => $align};

  /* Truncation */
  ${({ $truncate }) =>
    $truncate &&
    css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `}
`;

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
    // Use provided size or derive from level
    const headingSize = size || getDefaultSizeForLevel(level);

    return (
      <StyledHeading
        as={level}
        ref={ref}
        className={className}
        $level={level}
        $size={headingSize}
        $weight={weight}
        $align={align}
        $color={color}
        $truncate={truncate}
        $noMargin={noMargin}
        {...rest}
      >
        {children}
      </StyledHeading>
    );
  }
);

Heading.displayName = 'Heading';
