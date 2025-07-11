import React from 'react';
import styled, { css, DefaultTheme } from 'styled-components';

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateVariant = 'default' | 'error' | 'search' | 'loading';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  image?: string;
  size?: EmptyStateSize;
  variant?: EmptyStateVariant;
  actions?: EmptyStateAction[];
  className?: string;
  'data-testid'?: string;
}

const getSizeStyles = (size: EmptyStateSize) => {
  const sizes = {
    sm: css`
      padding: ${({ theme }) => theme.spacing.lg};

      .icon {
        width: 48px;
        height: 48px;
        margin-bottom: ${({ theme }) => theme.spacing.sm};
      }

      .title {
        font-size: ${({ theme }) => theme.typography.size.lg};
        margin-bottom: ${({ theme }) => theme.spacing.xs};
      }

      .description {
        font-size: ${({ theme }) => theme.typography.size.sm};
        margin-bottom: ${({ theme }) => theme.spacing.md};
      }
    `,
    md: css`
      padding: ${({ theme }) => theme.spacing.xl};

      .icon {
        width: 64px;
        height: 64px;
        margin-bottom: ${({ theme }) => theme.spacing.md};
      }

      .title {
        font-size: ${({ theme }) => theme.typography.size.xl};
        margin-bottom: ${({ theme }) => theme.spacing.sm};
      }

      .description {
        font-size: ${({ theme }) => theme.typography.size.base};
        margin-bottom: ${({ theme }) => theme.spacing.lg};
      }
    `,
    lg: css`
      padding: ${({ theme }) => theme.spacing['2xl']};

      .icon {
        width: 80px;
        height: 80px;
        margin-bottom: ${({ theme }) => theme.spacing.lg};
      }

      .title {
        font-size: ${({ theme }) => theme.typography.size['2xl']};
        margin-bottom: ${({ theme }) => theme.spacing.md};
      }

      .description {
        font-size: ${({ theme }) => theme.typography.size.lg};
        margin-bottom: ${({ theme }) => theme.spacing.xl};
      }
    `,
  };
  return sizes[size];
};

const getVariantStyles = (variant: EmptyStateVariant, theme: DefaultTheme) => {
  const variants = {
    default: css`
      .icon {
        color: ${theme.colors.neutral[400]};
      }
      .title {
        color: ${theme.colors.neutral[700]};
      }
      .description {
        color: ${theme.colors.neutral[500]};
      }
    `,
    error: css`
      .icon {
        color: ${theme.colors.semantic.error[500]};
      }
      .title {
        color: ${theme.colors.semantic.error[900]};
      }
      .description {
        color: ${theme.colors.neutral[600]};
      }
    `,
    search: css`
      .icon {
        color: ${theme.colors.primary[500]};
      }
      .title {
        color: ${theme.colors.neutral[700]};
      }
      .description {
        color: ${theme.colors.neutral[500]};
      }
    `,
    loading: css`
      .icon {
        color: ${theme.colors.neutral[300]};
      }
      .title {
        color: ${theme.colors.neutral[600]};
      }
      .description {
        color: ${theme.colors.neutral[400]};
      }
    `,
  };
  return variants[variant];
};

const EmptyStateContainer = styled.div<{
  $size: EmptyStateSize;
  $variant: EmptyStateVariant;
}>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;

  ${({ $size }) => getSizeStyles($size)}
  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const Image = styled.img`
  max-width: 100%;
  height: auto;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h3`
  margin: 0;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  line-height: 1.3;
`;

const Description = styled.p`
  margin: 0;
  line-height: 1.5;
  max-width: 400px;
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: row;
    justify-content: center;
  }
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.border.radius.md};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-size: ${({ theme }) => theme.typography.size.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  text-decoration: none;
  border: 1px solid;

  ${({ $variant, theme }) =>
    $variant === 'primary'
      ? css`
          background-color: ${theme.colors.primary[500]};
          border-color: ${theme.colors.primary[500]};
          color: ${theme.colors.neutral[50]};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.primary[700]};
            border-color: ${theme.colors.primary[700]};
          }
        `
      : css`
          background-color: transparent;
          border-color: ${theme.colors.neutral[300]};
          color: ${theme.colors.neutral[700]};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.neutral[50]};
            border-color: ${theme.colors.neutral[400]};
          }
        `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background-color: inherit;
      border-color: inherit;
    }
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  image,
  size = 'md',
  variant = 'default',
  actions = [],
  className,
  'data-testid': testId,
}) => {
  const displayIcon = icon;

  return (
    <EmptyStateContainer
      $size={size}
      $variant={variant}
      className={className}
      data-testid={testId}
      role='status'
      aria-live='polite'
    >
      {image ? (
        <Image src={image} alt='' className='image' />
      ) : (
        <IconContainer className='icon'>{displayIcon}</IconContainer>
      )}

      <Title className='title'>{title}</Title>

      {description && <Description className='description'>{description}</Description>}

      {actions.length > 0 && (
        <ActionContainer>
          {actions.map((action, index) => (
            <ActionButton
              key={index}
              $variant={action.variant || 'primary'}
              onClick={action.onClick}
              disabled={action.disabled}
              type='button'
            >
              {action.label}
            </ActionButton>
          ))}
        </ActionContainer>
      )}
    </EmptyStateContainer>
  );
};
