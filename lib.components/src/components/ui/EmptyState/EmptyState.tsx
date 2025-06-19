import React from 'react';
import styled, { css } from 'styled-components';

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
        font-size: ${({ theme }) => theme.typography.size.md};
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

const getVariantStyles = (variant: EmptyStateVariant, theme: any) => {
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
        color: ${theme.colors.semantic.error.main};
      }
      .title {
        color: ${theme.colors.semantic.error.dark};
      }
      .description {
        color: ${theme.colors.neutral[600]};
      }
    `,
    search: css`
      .icon {
        color: ${theme.colors.primary.main};
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
          background-color: ${theme.colors.primary.main};
          border-color: ${theme.colors.primary.main};
          color: ${theme.colors.neutral.white};

          &:hover:not(:disabled) {
            background-color: ${theme.colors.primary.dark};
            border-color: ${theme.colors.primary.dark};
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
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
  }
`;

// Default icons for different variants
const DefaultIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' />
  </svg>
);

const LoadingIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z'>
      <animateTransform
        attributeName='transform'
        type='rotate'
        from='0 12 12'
        to='360 12 12'
        dur='1s'
        repeatCount='indefinite'
      />
    </path>
  </svg>
);

const BoxIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor'>
    <path d='M12,2L2,7L12,12L22,7L12,2M17,16L12,18.5L7,16V10.5L12,13L17,10.5V16Z' />
  </svg>
);

const getDefaultIcon = (variant: EmptyStateVariant) => {
  switch (variant) {
    case 'error':
      return <ErrorIcon />;
    case 'search':
      return <SearchIcon />;
    case 'loading':
      return <LoadingIcon />;
    default:
      return <BoxIcon />;
  }
};

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
  const displayIcon = icon || getDefaultIcon(variant);

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
