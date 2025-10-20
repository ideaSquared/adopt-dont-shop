import React from 'react';
import styled from 'styled-components';
import { EventAnalytics as EventAnalyticsType } from '../../types/events';

interface EventAnalyticsProps {
  analytics: EventAnalyticsType | null;
  loading?: boolean;
}

const AnalyticsContainer = styled.div`
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 12px;
  padding: 1.5rem;
`;

const Title = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const MetricCard = styled.div`
  padding: 1.5rem;
  background: ${props => props.theme.colors.neutral?.[50] || '#f9fafb'};
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 8px;
`;

const MetricLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
  text-transform: uppercase;
  letter-spacing: 0.025em;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.theme.text?.primary || '#111827'};
  margin-bottom: 0.25rem;
`;

const MetricSubtext = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 4px;
  overflow: hidden;
  margin-top: 0.5rem;
`;

const ProgressFill = styled.div<{ $percentage: number; $color?: string }>`
  height: 100%;
  width: ${props => props.$percentage}%;
  background: ${props => props.$color || props.theme.colors.primary?.[600] || '#2563eb'};
  transition: width 0.3s ease;
`;

const Section = styled.div`
  margin-bottom: 1.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.text?.primary || '#111827'};
`;

const DemographicRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border: 1px solid ${props => props.theme.colors.neutral?.[200] || '#e5e7eb'};
  border-radius: 8px;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: ${props => props.theme.text?.secondary || '#6b7280'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 0.875rem;
    color: ${props => props.theme.text?.secondary || '#6b7280'};
  }
`;

const getAttendanceColor = (rate: number): string => {
  if (rate >= 80) return '#10b981'; // Green
  if (rate >= 60) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
};

const EventAnalytics: React.FC<EventAnalyticsProps> = ({ analytics, loading }) => {
  if (loading) {
    return (
      <AnalyticsContainer>
        <LoadingState>Loading analytics...</LoadingState>
      </AnalyticsContainer>
    );
  }

  if (!analytics) {
    return (
      <AnalyticsContainer>
        <EmptyState>
          <div className="icon">📊</div>
          <p>No analytics data available yet.</p>
          <p>Analytics will be available after the event is completed.</p>
        </EmptyState>
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer>
      <Title>Event Analytics</Title>

      <MetricsGrid>
        <MetricCard>
          <MetricLabel>Total Registrations</MetricLabel>
          <MetricValue>{analytics.totalRegistrations}</MetricValue>
          <MetricSubtext>People registered</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricLabel>Actual Attendance</MetricLabel>
          <MetricValue>{analytics.actualAttendance}</MetricValue>
          <MetricSubtext>People attended</MetricSubtext>
        </MetricCard>

        <MetricCard>
          <MetricLabel>Attendance Rate</MetricLabel>
          <MetricValue>{analytics.attendanceRate}%</MetricValue>
          <ProgressBar>
            <ProgressFill
              $percentage={analytics.attendanceRate}
              $color={getAttendanceColor(analytics.attendanceRate)}
            />
          </ProgressBar>
        </MetricCard>

        {analytics.adoptionsFromEvent !== undefined && (
          <MetricCard>
            <MetricLabel>Adoptions</MetricLabel>
            <MetricValue>{analytics.adoptionsFromEvent}</MetricValue>
            <MetricSubtext>Successful adoptions</MetricSubtext>
          </MetricCard>
        )}

        {analytics.fundsRaised !== undefined && (
          <MetricCard>
            <MetricLabel>Funds Raised</MetricLabel>
            <MetricValue>£{analytics.fundsRaised.toLocaleString()}</MetricValue>
            <MetricSubtext>Total fundraising</MetricSubtext>
          </MetricCard>
        )}

        {analytics.volunteerHours !== undefined && (
          <MetricCard>
            <MetricLabel>Volunteer Hours</MetricLabel>
            <MetricValue>{analytics.volunteerHours}</MetricValue>
            <MetricSubtext>Hours contributed</MetricSubtext>
          </MetricCard>
        )}

        {analytics.feedbackScore !== undefined && (
          <MetricCard>
            <MetricLabel>Feedback Score</MetricLabel>
            <MetricValue>{analytics.feedbackScore}/5</MetricValue>
            <ProgressBar>
              <ProgressFill $percentage={(analytics.feedbackScore / 5) * 100} $color="#f59e0b" />
            </ProgressBar>
          </MetricCard>
        )}
      </MetricsGrid>

      {analytics.demographics && (
        <Section>
          <SectionTitle>Demographics</SectionTitle>
          <DemographicRow>
            <span>New Visitors</span>
            <strong>{analytics.demographics.newVisitors}</strong>
          </DemographicRow>
          <DemographicRow>
            <span>Returning Visitors</span>
            <strong>{analytics.demographics.returningVisitors}</strong>
          </DemographicRow>
        </Section>
      )}
    </AnalyticsContainer>
  );
};

export default EventAnalytics;
