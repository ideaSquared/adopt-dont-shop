import React from 'react';
import styled, { css } from 'styled-components';
import { Theme } from '../../styles/theme';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
export type AlertSize = 'sm' | 'md' | 'lg';

export type AlertProps = {
  children: React.ReactNode;
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
  'data-testid'?: string;
};

const getVariantStyles = (variant: AlertVariant, theme: Theme) => {
  const variants = {
    success: css`
      background-color: ${theme.colors.semantic.success.light};
      border-color: ${theme.colors.semantic.success.main};
      color: ${theme.colors.semantic.success.dark};
    `,
    error: css`
      background-color: ${theme.colors.semantic.error.light};
      border-color: ${theme.colors.semantic.error.main};
      color: ${theme.colors.semantic.error.dark};
    `,
    warning: css`
      background-color: ${theme.colors.semantic.warning.light};
      border-color: ${theme.colors.semantic.warning.main};
      color: ${theme.colors.semantic.warning.dark};
    `,
    info: css`
      background-color: ${theme.colors.semantic.info.light};
      border-color: ${theme.colors.semantic.info.main};
      color: ${theme.colors.semantic.info.dark};
    `,
  };
  return variants[variant];
};

const getSizeStyles = (size: AlertSize, theme: Theme) => {
  const sizes = {
    sm: css`
      padding: ${theme.spacing.sm};
      font-size: ${theme.typography.size.sm};
    `,
    md: css`
      padding: ${theme.spacing.md};
      font-size: ${theme.typography.size.base};
    `,
    lg: css`
      padding: ${theme.spacing.lg};
      font-size: ${theme.typography.size.lg};
    `,
  };
  return sizes[size];
};

const StyledAlert = styled.div<{
  $variant: AlertVariant;
  $size: AlertSize;
}>`
  position: relative;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.spacing.xs};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};

  ${({ $variant, theme }) => getVariantStyles($variant, theme)}
  ${({ $size, theme }) => getSizeStyles($size, theme)}
`;

const AlertContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const AlertTitle = styled.h4`
  margin: 0;
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  font-size: inherit;
`;

const AlertMessage = styled.div`
  margin: 0;
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const CloseButton = styled.button<{ $variant: AlertVariant }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  color: currentColor;
  opacity: 0.7;
  border-radius: ${({ theme }) => theme.spacing.xs};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  &:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  size = 'md',
  title,
  closable = false,
  onClose,
  className,
  'data-testid': dataTestId,
}) => {
  return (
    <StyledAlert
      className={className}
      $variant={variant}
      $size={size}
      role='alert'
      data-testid={dataTestId}
    >
      <AlertContent>
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertMessage>{children}</AlertMessage>
      </AlertContent>
      {closable && onClose && (
        <CloseButton type='button' onClick={onClose} $variant={variant} aria-label='Close alert'>
          ×
        </CloseButton>
      )}
    </StyledAlert>
  );
};
