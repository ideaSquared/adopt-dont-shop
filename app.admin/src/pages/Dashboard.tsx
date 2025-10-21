import React from 'react';
import styled from 'styled-components';
import { Heading, Text } from '@adopt-dont-shop/components';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const PageHeader = styled.div`
  margin-bottom: 1rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;

  span {
    font-size: 1.5rem;
  }
`;

const MetricLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const MetricValue = styled.div`
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`;

const MetricChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.875rem;
  color: ${props => props.$positive ? '#10b981' : '#ef4444'};
  font-weight: 500;
`;

const Dashboard: React.FC = () => {
  const metrics = [
    {
      icon: '👥',
      label: 'Total Users',
      value: '12,543',
      change: '+12% from last month',
      positive: true
    },
    {
      icon: '🏠',
      label: 'Active Rescues',
      value: '284',
      change: '+8% from last month',
      positive: true
    },
    {
      icon: '🐾',
      label: 'Pets Listed',
      value: '1,892',
      change: '+15% from last month',
      positive: true
    },
    {
      icon: '❤️',
      label: 'Adoptions (30d)',
      value: '456',
      change: '+23% from last month',
      positive: true
    },
    {
      icon: '📋',
      label: 'Pending Applications',
      value: '187',
      change: '-5% from last month',
      positive: false
    },
    {
      icon: '🎫',
      label: 'Open Tickets',
      value: '34',
      change: '+2 from yesterday',
      positive: false
    }
  ];

  return (
    <DashboardContainer>
      <PageHeader>
        <Heading level="h1">Admin Dashboard</Heading>
        <Text>Welcome back! Here's what's happening across the platform today.</Text>
      </PageHeader>

      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard key={index}>
            <MetricHeader>
              <span>{metric.icon}</span>
              <MetricLabel>{metric.label}</MetricLabel>
            </MetricHeader>
            <MetricValue>{metric.value}</MetricValue>
            <MetricChange $positive={metric.positive}>
              {metric.change}
            </MetricChange>
          </MetricCard>
        ))}
      </MetricsGrid>

      {/* Placeholder for more dashboard content */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          📊 Additional dashboard widgets will be added here: recent activity, charts, alerts, etc.
        </p>
      </div>
    </DashboardContainer>
  );
};

export default Dashboard;
