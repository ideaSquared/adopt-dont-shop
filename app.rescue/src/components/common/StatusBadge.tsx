import React from 'react';
import styled from 'styled-components';
import { formatStatusName, getStatusColor } from '../../utils/statusUtils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const Badge = styled.span<{ $variant: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 9999px;
  white-space: nowrap;
  
  ${props => {
    switch (props.$variant) {
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case 'danger':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'warning':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'primary':
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}
`;

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const variant = getStatusColor(status);
  
  return (
    <Badge $variant={variant} className={className}>
      {formatStatusName(status)}
    </Badge>
  );
};

export default StatusBadge;
