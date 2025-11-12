import React from 'react';
import styled from 'styled-components';

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const Card = styled.div<{ $clickable?: boolean }>`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: ${props => (props.$clickable ? 'translateY(-2px)' : 'none')};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Icon = styled.span`
  font-size: 1.5rem;
  line-height: 1;
`;

const Label = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  flex: 1;
`;

const Value = styled.div`
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  line-height: 1;
`;

const Change = styled.div<{ $positive?: boolean }>`
  font-size: 0.875rem;
  color: ${props => (props.$positive ? '#10b981' : '#ef4444')};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const LoadingSkeleton = styled.div`
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 4px;
  height: 1.5rem;
  width: 100%;

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  change,
  changePositive = true,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return (
      <Card>
        <Header>
          <Icon>{icon}</Icon>
          <Label>{label}</Label>
        </Header>
        <LoadingSkeleton style={{ height: '2.25rem', marginBottom: '0.5rem' }} />
        <LoadingSkeleton style={{ height: '0.875rem', width: '60%' }} />
      </Card>
    );
  }

  return (
    <Card $clickable={!!onClick} onClick={onClick}>
      <Header>
        <Icon>{icon}</Icon>
        <Label>{label}</Label>
      </Header>
      <Value>{value}</Value>
      {change && (
        <Change $positive={changePositive}>
          {changePositive ? '↑' : '↓'} {change}
        </Change>
      )}
    </Card>
  );
};
