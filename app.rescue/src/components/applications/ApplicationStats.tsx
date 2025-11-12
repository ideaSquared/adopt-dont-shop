import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { RescueApplicationService } from '../../services/applicationService';
import type { ApplicationListItem } from '../../types/applications';

// Calculate statistics from application data
const calculateApplicationStats = (applications: ApplicationListItem[]) => {
  const total = applications.length;
  const byStatus = applications.reduce(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate average processing time for completed applications
  const completedApps = applications.filter(
    app => app.status === 'approved' || app.status === 'rejected'
  );
  const avgProcessingTime =
    completedApps.length > 0
      ? Math.round(
          completedApps.reduce((sum, app) => sum + app.submittedDaysAgo, 0) / completedApps.length
        )
      : 0;

  return {
    total,
    byStatus,
    avgProcessingTime,
    recentSubmissions: applications.filter(app => app.submittedDaysAgo <= 7).length,
    pendingReferences: applications.filter(app => app.referencesStatus !== 'completed').length,
    scheduledVisits: applications.filter(app => app.homeVisitStatus === 'scheduled').length,
  };
};

// Styled Components
const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatCard = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const LoadingCard = styled(StatCard)`
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const CardContent = styled.div`
  padding: 1.25rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
`;

const IconContainer = styled.div`
  flex-shrink: 0;
`;

const Icon = styled.div<{ $color: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${props => {
    switch (props.$color) {
      case 'blue':
        return 'background: #dbeafe; color: #1d4ed8;';
      case 'yellow':
        return 'background: #fef3c7; color: #92400e;';
      case 'green':
        return 'background: #dcfce7; color: #166534;';
      case 'red':
        return 'background: #fecaca; color: #dc2626;';
      default:
        return 'background: #f3f4f6; color: #374151;';
    }
  }}
`;

const CardBody = styled.div`
  margin-left: 1.25rem;
  width: 0;
  flex: 1;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const StatValue = styled.div`
  margin-top: 0.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
`;

const StatChange = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;

  ${props => {
    switch (props.$trend) {
      case 'up':
        return 'color: #059669;';
      case 'down':
        return 'color: #dc2626;';
      default:
        return 'color: #6b7280;';
    }
  }}
`;

const LoadingIconPlaceholder = styled.div`
  width: 2rem;
  height: 2rem;
  background: #d1d5db;
  border-radius: 0.375rem;
`;

const LoadingTextPlaceholder = styled.div<{ width: string }>`
  height: 1rem;
  background: #d1d5db;
  border-radius: 0.25rem;
  width: ${props => props.width};
`;

const LoadingValuePlaceholder = styled.div<{ width: string }>`
  height: 1.5rem;
  background: #d1d5db;
  border-radius: 0.25rem;
  width: ${props => props.width};
  margin-top: 0.5rem;
`;

const ErrorContainer = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const ErrorContent = styled.div`
  display: flex;
`;

const ErrorText = styled.div`
  margin-left: 0.75rem;
`;

const ErrorTitle = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: #991b1b;
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: 0.875rem;
  color: #b91c1c;
  margin: 0.25rem 0 0 0;
`;

interface ApplicationStatsProps {
  // No props needed - component handles its own data fetching
}

const ApplicationStatsCards: React.FC<ApplicationStatsProps> = () => {
  const [applicationService] = useState(() => new RescueApplicationService());
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all applications without any filters for statistics
      const result = await applicationService.getApplications(
        {}, // No filters
        { field: 'submittedAt', direction: 'desc' },
        1,
        1000 // Large limit to get all applications
      );

      setApplications(result.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch application statistics');
    } finally {
      setLoading(false);
    }
  }, [applicationService]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllApplications();
  }, [fetchAllApplications]);

  if (loading) {
    return (
      <StatsContainer>
        {[...Array(4)].map((_, i) => (
          <LoadingCard key={i}>
            <CardContent>
              <CardHeader>
                <IconContainer>
                  <LoadingIconPlaceholder />
                </IconContainer>
                <CardBody>
                  <LoadingTextPlaceholder width="4rem" />
                  <LoadingValuePlaceholder width="3rem" />
                </CardBody>
              </CardHeader>
            </CardContent>
          </LoadingCard>
        ))}
      </StatsContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorContent>
          <ErrorText>
            <ErrorTitle>Error loading stats</ErrorTitle>
            <ErrorMessage>{error}</ErrorMessage>
          </ErrorText>
        </ErrorContent>
      </ErrorContainer>
    );
  }

  if (!applications || applications.length === 0) {
    return null;
  }

  const stats = calculateApplicationStats(applications);

  const statCards = [
    {
      name: 'Total Applications',
      value: stats.total,
      change: 0, // Change tracking not implemented yet
      trend: 'neutral' as const,
      icon: '📄',
      color: 'blue' as const,
    },
    {
      name: 'Submitted',
      value: stats.byStatus.submitted || 0,
      change: 0,
      trend: 'neutral' as const,
      icon: '⏳',
      color: 'yellow' as const,
    },
    {
      name: 'Approved',
      value: stats.byStatus.approved || 0,
      change: 0,
      trend: 'neutral' as const,
      icon: '✅',
      color: 'green' as const,
    },
    {
      name: 'Avg. Processing Time',
      value: `${stats.avgProcessingTime}d`,
      change: 0,
      trend: 'neutral' as const,
      icon: '⏱️',
      color: 'red' as const,
    },
  ];

  return (
    <StatsContainer>
      {statCards.map(stat => (
        <StatCard key={stat.name}>
          <CardContent>
            <CardHeader>
              <IconContainer>
                <Icon $color={stat.color}>{stat.icon}</Icon>
              </IconContainer>
              <CardBody>
                <StatLabel>{stat.name}</StatLabel>
                <StatValue>{stat.value}</StatValue>
                {stat.change !== 0 && (
                  <StatChange $trend={stat.trend}>→ No change from last month</StatChange>
                )}
              </CardBody>
            </CardHeader>
          </CardContent>
        </StatCard>
      ))}
    </StatsContainer>
  );
};

export default ApplicationStatsCards;
