import React from 'react';
import styled, { css } from 'styled-components';

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

const getDirectionStyles = (direction: StackDirection) => {
  return direction === 'horizontal'
    ? css`
        flex-direction: row;
      `
    : css`
        flex-direction: column;
      `;
};

const getSpacingStyles = (spacing: StackSpacing, theme: any) => {
  if (spacing === 'none') return css``;

  const spacingValue = theme.spacing[spacing];

  return css`
    gap: ${spacingValue};
  `;
};

const getAlignStyles = (align: StackAlign) => {
  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };

  return css`
    align-items: ${alignMap[align]};
  `;
};

const getJustifyStyles = (justify: StackJustify) => {
  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };

  return css`
    justify-content: ${justifyMap[justify]};
  `;
};

const StyledStack = styled.div<{
  $direction: StackDirection;
  $spacing: StackSpacing;
  $align: StackAlign;
  $justify: StackJustify;
  $wrap: boolean;
  $fullWidth: boolean;
  $fullHeight: boolean;
}>`
  display: flex;

  ${({ $direction }) => getDirectionStyles($direction)}
  ${({ $spacing, theme }) => getSpacingStyles($spacing, theme)}
  ${({ $align }) => getAlignStyles($align)}
  ${({ $justify }) => getJustifyStyles($justify)}
  
  ${({ $wrap }) =>
    $wrap &&
    css`
      flex-wrap: wrap;
    `}

  ${({ $fullWidth }) =>
    $fullWidth &&
    css`
      width: 100%;
    `}

  ${({ $fullHeight }) =>
    $fullHeight &&
    css`
      height: 100%;
    `}
`;

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
    <StyledStack
      $direction={direction}
      $spacing={spacing}
      $align={align}
      $justify={justify}
      $wrap={wrap}
      $fullWidth={fullWidth}
      $fullHeight={fullHeight}
      className={className}
      data-testid={dataTestId}
      {...props}
    >
      {children}
    </StyledStack>
  );
};

