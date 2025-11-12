import React from 'react';
import styled from 'styled-components';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

const Card = styled.div<{ $clickable?: boolean }>`
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral[200]};
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    ${props =>
      props.$clickable &&
      `
      border-color: ${props.theme.colors.primary[300]};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    `}
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.theme.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: ${props => props.theme.colors.primary[50]};
  color: ${props => props.theme.colors.primary[600]};
  font-size: 1.25rem;
`;

const Value = styled.div`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${props => props.theme.text.primary};
  margin-bottom: 0.5rem;
  line-height: 1;
`;

const TrendContainer = styled.div<{ $positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: ${props =>
    props.$positive ? props.theme.colors.success[600] : props.theme.colors.error[600]};
  font-weight: 500;
`;

const TrendIcon = styled.div`
  display: flex;
  align-items: center;
  font-size: 1rem;
`;

const Subtitle = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.text.tertiary};
  margin-top: 0.25rem;
`;

const LoadingBar = styled.div`
  height: 4px;
  background: ${props => props.theme.colors.neutral[200]};
  border-radius: 2px;
  overflow: hidden;
  margin-top: auto;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: 40%;
    background: ${props => props.theme.colors.primary[500]};
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(300%);
    }
  }
`;

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick,
  loading = false,
}) => {
  return (
    <Card $clickable={!!onClick} onClick={onClick}>
      <Header>
        <Title>{title}</Title>
        {icon && <IconContainer>{icon}</IconContainer>}
      </Header>

      <Value>{loading ? '...' : value}</Value>

      {trend && !loading && (
        <TrendContainer $positive={trend.isPositive}>
          <TrendIcon>{trend.isPositive ? <FiTrendingUp /> : <FiTrendingDown />}</TrendIcon>
          <span>
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
          {trend.label && <span>{trend.label}</span>}
        </TrendContainer>
      )}

      {subtitle && !loading && <Subtitle>{subtitle}</Subtitle>}

      {loading && <LoadingBar />}
    </Card>
  );
};

export default MetricCard;
