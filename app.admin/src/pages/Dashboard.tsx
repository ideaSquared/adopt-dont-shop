import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Heading, Text } from '@adopt-dont-shop/lib.components';
import { usePlatformMetrics } from '../hooks';

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
  color: ${props => (props.$positive ? '#10b981' : '#ef4444')};
  font-weight: 500;
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string }>`
  width: ${props => props.$width ?? '100%'};
  height: ${props => props.$height ?? '1rem'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.4s infinite linear;
`;

const ErrorBanner = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 1.5rem;
  color: #991b1b;
  font-size: 0.875rem;
`;

const formatNumber = (n: number): string => n.toLocaleString();

const formatGrowthLabel = (current: number, previous: number, label: string): string => {
  if (previous === 0) {
    return `${label}`;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}% from last month`;
};

type MetricDefinition = {
  icon: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
};

const Dashboard: React.FC = () => {
  const { data, isLoading, isError, error } = usePlatformMetrics();

  const metrics: MetricDefinition[] = data
    ? [
        {
          icon: '👥',
          label: 'Total Users',
          value: formatNumber(data.users.total),
          change: formatGrowthLabel(
            data.users.newThisMonth,
            0,
            `${formatNumber(data.users.newThisMonth)} new this month`
          ),
          positive: data.users.newThisMonth >= 0,
        },
        {
          icon: '🏠',
          label: 'Active Rescues',
          value: formatNumber(data.rescues.verified),
          change: `${formatNumber(data.rescues.pending)} pending verification`,
          positive: data.rescues.pending === 0,
        },
        {
          icon: '🐾',
          label: 'Pets Listed',
          value: formatNumber(data.pets.available),
          change: `${formatNumber(data.pets.total)} total pets`,
          positive: true,
        },
        {
          icon: '❤️',
          label: 'Adoptions (30d)',
          value: formatNumber(data.pets.adopted),
          change: `${formatNumber(data.applications.approved)} applications approved`,
          positive: data.pets.adopted > 0,
        },
        {
          icon: '📋',
          label: 'Pending Applications',
          value: formatNumber(data.applications.pending),
          change: `${formatNumber(data.applications.total)} total this month`,
          positive: data.applications.pending === 0,
        },
        {
          icon: '🎫',
          label: 'New Users (30d)',
          value: formatNumber(data.users.newThisMonth),
          change: `${formatNumber(data.users.active)} active users`,
          positive: data.users.newThisMonth > 0,
        },
      ]
    : [];

  return (
    <DashboardContainer>
      <PageHeader>
        <Heading level='h1'>Admin Dashboard</Heading>
        <Text>Welcome back! Here's what's happening across the platform today.</Text>
      </PageHeader>

      {isError && (
        <ErrorBanner role='alert'>
          Failed to load dashboard metrics:{' '}
          {error instanceof Error ? error.message : 'Unknown error'}
        </ErrorBanner>
      )}

      <MetricsGrid>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <MetricCard key={i} aria-busy='true'>
                <MetricHeader>
                  <SkeletonBlock $width='32px' $height='32px' />
                  <SkeletonBlock $width='120px' $height='0.875rem' />
                </MetricHeader>
                <SkeletonBlock $width='80px' $height='2.25rem' style={{ marginBottom: '0.5rem' }} />
                <SkeletonBlock $width='140px' $height='0.875rem' />
              </MetricCard>
            ))
          : metrics.map((metric, index) => (
              <MetricCard key={index}>
                <MetricHeader>
                  <span>{metric.icon}</span>
                  <MetricLabel>{metric.label}</MetricLabel>
                </MetricHeader>
                <MetricValue>{metric.value}</MetricValue>
                <MetricChange $positive={metric.positive}>{metric.change}</MetricChange>
              </MetricCard>
            ))}
      </MetricsGrid>

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem' }}>
          📊 Additional dashboard widgets will be added here: recent activity, charts, alerts, etc.
        </p>
      </div>
    </DashboardContainer>
  );
};

export default Dashboard;
