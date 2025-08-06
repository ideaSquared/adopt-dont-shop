import React from 'react';
import styled from 'styled-components';
import { ApplicationListItem } from '../../types/applications';
import { ApplicationStage, StageAction, OUTCOME_CONFIG } from '../../types/applicationStages';
import { formatDistanceToNow } from 'date-fns';

interface ApplicationStageCardProps {
  application: ApplicationListItem;
  stage: ApplicationStage;
  availableActions: StageAction[];
  onClick: () => void;
  onAction: (action: string, data?: any) => void;
}

const CardContainer = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
`;

const PetInfo = styled.div`
  flex: 1;
`;

const PetName = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
`;

const ApplicantName = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
`;

const Priority = styled.div<{ priority: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  
  ${props => {
    switch (props.priority) {
      case 'urgent':
        return 'background: #fee2e2; color: #dc2626;';
      case 'high':
        return 'background: #fef3c7; color: #d97706;';
      case 'medium':
        return 'background: #dbeafe; color: #2563eb;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  overflow: hidden;
  margin: 0.75rem 0;
`;

const ProgressFill = styled.div<{ percentage: number }>`
  width: ${props => props.percentage}%;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
`;

const CardBody = styled.div`
  margin-bottom: 0.75rem;
`;

const MetaInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
`;

const StatusBadges = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`;

const StatusBadge = styled.div<{ status: 'pending' | 'in_progress' | 'completed' | 'failed' }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return 'background: #d1fae5; color: #065f46;';
      case 'in_progress':
        return 'background: #fef3c7; color: #92400e;';
      case 'failed':
        return 'background: #fee2e2; color: #991b1b;';
      default:
        return 'background: #f3f4f6; color: #6b7280;';
    }
  }}
`;

const OutcomeBadge = styled.div<{ outcome: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.5rem;
  
  ${props => {
    const config = OUTCOME_CONFIG[props.outcome as keyof typeof OUTCOME_CONFIG];
    return `background: ${config?.color}20; color: ${config?.color};`;
  }}
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

const ApplicationStageCard: React.FC<ApplicationStageCardProps> = ({
  application,
  availableActions,
  onClick,
  onAction
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on an action button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick();
  };

  const handleActionClick = (action: StageAction, e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(action.type);
  };

  const getActionVariant = (actionType: string): 'primary' | 'secondary' | 'danger' => {
    if (actionType.includes('REJECT') || actionType.includes('WITHDRAW')) {
      return 'danger';
    }
    if (actionType === 'START_REVIEW' || actionType === 'SCHEDULE_VISIT' || actionType === 'MAKE_DECISION') {
      return 'primary';
    }
    return 'secondary';
  };

  const formatActionLabel = (actionType: string): string => {
    switch (actionType) {
      case 'START_REVIEW':
        return 'Start Review';
      case 'SCHEDULE_VISIT':
        return 'Schedule Visit';
      case 'COMPLETE_VISIT':
        return 'Complete Visit';
      case 'MAKE_DECISION':
        return 'Make Decision';
      case 'REJECT':
        return 'Reject';
      case 'WITHDRAW':
        return 'Withdraw';
      default:
        return actionType.replace('_', ' ');
    }
  };

  return (
    <CardContainer onClick={handleCardClick}>
      <CardHeader>
        <PetInfo>
          <PetName>{application.petName}</PetName>
          <ApplicantName>by {application.applicantName}</ApplicantName>
        </PetInfo>
        <Priority priority={application.priority}>
          {application.priority}
        </Priority>
      </CardHeader>

      <ProgressBar>
        <ProgressFill percentage={application.stageProgressPercentage} />
      </ProgressBar>

      <CardBody>
        <MetaInfo>
          <span>
            Submitted {application.submittedAt 
              ? formatDistanceToNow(new Date(application.submittedAt), { addSuffix: true })
              : 'recently'
            }
          </span>
          {application.assignedStaff && <span>Assigned to {application.assignedStaff}</span>}
        </MetaInfo>

        <StatusBadges>
          <StatusBadge status={application.referencesStatus}>
            References: {application.referencesStatus}
          </StatusBadge>
          {application.homeVisitStatus !== 'not_scheduled' && (
            <StatusBadge status={application.homeVisitStatus === 'completed' ? 'completed' : 'in_progress'}>
              Visit: {application.homeVisitStatus}
            </StatusBadge>
          )}
        </StatusBadges>

        {application.tags && application.tags.length > 0 && (
          <StatusBadges>
            {application.tags.map(tag => (
              <StatusBadge key={tag} status="pending">
                {tag}
              </StatusBadge>
            ))}
          </StatusBadges>
        )}

        {application.finalOutcome && (
          <OutcomeBadge outcome={application.finalOutcome}>
            {OUTCOME_CONFIG[application.finalOutcome]?.emoji} {OUTCOME_CONFIG[application.finalOutcome]?.label}
          </OutcomeBadge>
        )}
      </CardBody>

      {availableActions.length > 0 && (
        <CardActions>
          {availableActions.slice(0, 2).map(action => (
            <ActionButton
              key={action.type}
              variant={getActionVariant(action.type)}
              onClick={(e) => handleActionClick(action, e)}
            >
              {formatActionLabel(action.type)}
            </ActionButton>
          ))}
        </CardActions>
      )}
    </CardContainer>
  );
};

export default ApplicationStageCard;
