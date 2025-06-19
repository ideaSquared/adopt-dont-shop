import React from 'react';
import styled, { css } from 'styled-components';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ContainerProps = {
  children: React.ReactNode;
  size?: ContainerSize;
  fluid?: boolean;
  centerContent?: boolean;
  className?: string;
  'data-testid'?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const getSizeStyles = (size: ContainerSize, fluid: boolean) => {
  if (fluid) {
    return css`
      max-width: 100%;
      width: 100%;
    `;
  }

  const sizes = {
    sm: css`
      max-width: 640px;
    `,
    md: css`
      max-width: 768px;
    `,
    lg: css`
      max-width: 1024px;
    `,
    xl: css`
      max-width: 1280px;
    `,
    full: css`
      max-width: 100%;
    `,
  };

  return sizes[size];
};

const StyledContainer = styled.div<{
  $size: ContainerSize;
  $fluid: boolean;
  $centerContent: boolean;
}>`
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: ${({ theme }) => theme.spacing.md};
  padding-right: ${({ theme }) => theme.spacing.md};

  ${({ $size, $fluid }) => getSizeStyles($size, $fluid)}

  ${({ $centerContent }) =>
    $centerContent &&
    css`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `}

  @media (max-width: 768px) {
    padding-left: ${({ theme }) => theme.spacing.sm};
    padding-right: ${({ theme }) => theme.spacing.sm};
  }
`;

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
    <StyledContainer
      $size={size}
      $fluid={fluid}
      $centerContent={centerContent}
      className={className}
      data-testid={dataTestId}
      {...props}
    >
      {children}
    </StyledContainer>
  );
};
