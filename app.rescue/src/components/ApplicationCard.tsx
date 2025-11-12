import React from 'react';
import styled from 'styled-components';
import { TimelineWidget } from './TimelineWidget';
import { useTimelineWidget, useTimelineSummary } from '../hooks/useTimelineWidget';
import { formatDate, formatDateTime } from '@adopt-dont-shop/lib-utils';

interface ApplicationCardProps {
  application: {
    application_id: string;
    applicant_name: string;
    pet_name: string;
    stage: string;
    status: string;
    submitted_date: string;
    priority: 'high' | 'medium' | 'low';
  };
  onViewDetails: (applicationId: string) => void;
  onViewTimeline: (applicationId: string) => void;
}

const CardContainer = styled.div`
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: #d1d5db;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
`;

const BasicInfo = styled.div`
  flex: 1;
`;

const ApplicantName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
`;

const PetName = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const StatusBadge = styled.div<{ status: string; priority: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  ${props => {
    switch (props.status.toLowerCase()) {
      case 'pending':
        return 'background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;';
      case 'reviewing':
        return 'background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;';
      case 'visiting':
        return 'background: #e0f2fe; color: #0277bd; border: 1px solid #4fc3f7;';
      case 'deciding':
        return 'background: #f3e8ff; color: #7c3aed; border: 1px solid #c4b5fd;';
      case 'approved':
        return 'background: #dcfce7; color: #166534; border: 1px solid #86efac;';
      case 'rejected':
        return 'background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;';
      default:
        return 'background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;';
    }
  }}

  ${props =>
    props.priority === 'high' &&
    `
    box-shadow: 0 0 0 2px #ef4444;
  `}
`;

const PriorityIndicator = styled.div<{ priority: string }>`
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;

  ${props => {
    switch (props.priority) {
      case 'high':
        return 'background: #ef4444;';
      case 'medium':
        return 'background: #f59e0b;';
      case 'low':
        return 'background: #10b981;';
      default:
        return 'background: #6b7280;';
    }
  }}
`;

const MetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
`;

const ActivitySummary = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
`;

const ActivityIcon = styled.div<{ hasRecent: boolean }>`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: ${props => (props.hasRecent ? '#10b981' : '#6b7280')};
  position: relative;

  ${props =>
    props.hasRecent &&
    `
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 0.5rem;
      height: 0.5rem;
      background: #ef4444;
      border-radius: 50%;
      border: 1px solid white;
    }
  `}
`;

const ActivityText = styled.div`
  font-size: 0.75rem;
  color: #374151;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid;

  ${props =>
    props.variant === 'primary'
      ? `
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  `
      : `
    background: white;
    color: #374151;
    border-color: #d1d5db;
    
    &:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SkeletonBox = styled.div`
  background: #f3f4f6;
  border-radius: 0.25rem;
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

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onViewDetails,
  onViewTimeline,
}) => {
  const {
    events,
    loading: timelineLoading,
    hasEvents,
    recentEventCount,
  } = useTimelineWidget({
    applicationId: application.application_id,
    maxEvents: 3,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  const { summary, loading: summaryLoading } = useTimelineSummary({
    applicationId: application.application_id,
    recentThresholdHours: 24,
  });

  const handleViewDetails = () => {
    onViewDetails(application.application_id);
  };

  const handleViewTimeline = () => {
    onViewTimeline(application.application_id);
  };

  const getActivitySummaryText = () => {
    if (summaryLoading) return 'Loading activity...';
    if (!summary) return 'No activity data';

    const { totalEvents, lastActivity, hasRecentActivity } = summary;

    if (totalEvents === 0) return 'No activity yet';

    const lastActivityText = lastActivity ? formatDateTime(lastActivity) : 'Unknown';

    return hasRecentActivity
      ? `${totalEvents} events • Last: ${lastActivityText} • Recent activity`
      : `${totalEvents} events • Last: ${lastActivityText}`;
  };

  return (
    <CardContainer>
      <CardHeader>
        <BasicInfo>
          <ApplicantName>{application.applicant_name}</ApplicantName>
          <PetName>Applying for: {application.pet_name}</PetName>
          <StatusBadge status={application.status} priority={application.priority}>
            <PriorityIndicator priority={application.priority} />
            {application.status}
          </StatusBadge>
        </BasicInfo>
      </CardHeader>

      <MetaInfo>
        <div>Submitted: {formatDate(new Date(application.submitted_date))}</div>
        <div>•</div>
        <div>Stage: {application.stage}</div>
      </MetaInfo>

      <ActivitySummary>
        <ActivityIcon hasRecent={summary?.hasRecentActivity || false} />
        <ActivityText>{getActivitySummaryText()}</ActivityText>
      </ActivitySummary>

      {timelineLoading ? (
        <SkeletonBox style={{ height: '120px', marginBottom: '1rem' }} />
      ) : hasEvents ? (
        <TimelineWidget
          events={events}
          maxEvents={3}
          showViewAll={true}
          onViewAll={handleViewTimeline}
        />
      ) : (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.875rem',
            border: '1px dashed #d1d5db',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
          }}
        >
          No recent activity
        </div>
      )}

      <CardActions>
        <ActionButton variant="primary" onClick={handleViewDetails}>
          View Details
        </ActionButton>
        <ActionButton variant="secondary" onClick={handleViewTimeline}>
          Timeline ({recentEventCount})
        </ActionButton>
      </CardActions>
    </CardContainer>
  );
};
