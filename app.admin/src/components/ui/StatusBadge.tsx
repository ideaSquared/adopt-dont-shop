import React from 'react';
import styled from 'styled-components';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

const variantStyles = {
  success: {
    background: '#d1fae5',
    color: '#065f46',
    border: '#6ee7b7'
  },
  warning: {
    background: '#fef3c7',
    color: '#92400e',
    border: '#fcd34d'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '#fca5a5'
  },
  info: {
    background: '#dbeafe',
    color: '#1e40af',
    border: '#93c5fd'
  },
  neutral: {
    background: '#f3f4f6',
    color: '#374151',
    border: '#d1d5db'
  }
};

const sizeStyles = {
  small: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem'
  },
  medium: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem'
  },
  large: {
    padding: '0.5rem 1rem',
    fontSize: '1rem'
  }
};

const Badge = styled.span<{ $variant: BadgeVariant; $size: 'small' | 'medium' | 'large' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 9999px;
  white-space: nowrap;

  background: ${props => variantStyles[props.$variant].background};
  color: ${props => variantStyles[props.$variant].color};
  border: 1px solid ${props => variantStyles[props.$variant].border};

  padding: ${props => sizeStyles[props.$size].padding};
  font-size: ${props => sizeStyles[props.$size].fontSize};
`;

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  children,
  size = 'medium'
}) => {
  return (
    <Badge $variant={variant} $size={size}>
      {children}
    </Badge>
  );
};
