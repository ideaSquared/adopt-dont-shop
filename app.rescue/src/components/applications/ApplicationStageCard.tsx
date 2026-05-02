import React from 'react';
import { ApplicationListItem } from '../../types/applications';
import { ApplicationStage, StageAction, OUTCOME_CONFIG } from '../../types/applicationStages';
import { formatRelativeDate } from '@adopt-dont-shop/lib.utils';
import * as styles from './ApplicationStageCard.css';

interface ApplicationStageCardProps {
  application: ApplicationListItem;
  stage: ApplicationStage;
  availableActions: StageAction[];
  onClick: () => void;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}

const ApplicationStageCard: React.FC<ApplicationStageCardProps> = ({
  application,
  availableActions,
  onClick,
  onAction,
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
    if (
      actionType === 'START_REVIEW' ||
      actionType === 'SCHEDULE_VISIT' ||
      actionType === 'MAKE_DECISION'
    ) {
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

  // Check if application is in terminal status
  const isTerminalStatus = () => {
    const terminalStatuses = ['approved', 'rejected', 'withdrawn', 'expired'];
    return terminalStatuses.includes(application.status?.toLowerCase());
  };

  // Don't show actions for terminal statuses
  const shouldShowActions = () => {
    return availableActions.length > 0 && !isTerminalStatus();
  };

  const priorityValue = application.priority as 'urgent' | 'high' | 'medium' | 'low' | 'default';
  const refStatus = application.referencesStatus as
    | 'completed'
    | 'in_progress'
    | 'failed'
    | 'pending';

  return (
    <div
      className={styles.cardContainer}
      onClick={handleCardClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleCardClick()}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardHeader}>
        <div className={styles.petInfo}>
          <h4 className={styles.petName}>{application.petName}</h4>
          <div className={styles.applicantName}>by {application.applicantName}</div>
        </div>
        <div className={styles.priority({ priority: priorityValue })}>{application.priority}</div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${application.stageProgressPercentage}%` }}
        />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.metaInfo}>
          <span>
            Submitted{' '}
            {application.submittedAt
              ? formatRelativeDate(new Date(application.submittedAt))
              : 'recently'}
          </span>
          {application.assignedStaff && <span>Assigned to {application.assignedStaff}</span>}
        </div>

        <div className={styles.statusBadges}>
          <div className={styles.statusBadge({ status: refStatus })}>
            References: {application.referencesStatus}
          </div>
          {application.homeVisitStatus !== 'not_scheduled' && (
            <div
              className={styles.statusBadge({
                status: application.homeVisitStatus === 'completed' ? 'completed' : 'in_progress',
              })}
            >
              Visit: {application.homeVisitStatus}
            </div>
          )}
        </div>

        {application.tags && application.tags.length > 0 && (
          <div className={styles.statusBadges}>
            {application.tags.map(tag => (
              <div key={tag} className={styles.statusBadge({ status: 'pending' })}>
                {tag}
              </div>
            ))}
          </div>
        )}

        {application.finalOutcome && (
          <div
            className={styles.outcomeBadge}
            style={{
              background: `${OUTCOME_CONFIG[application.finalOutcome]?.color}20`,
              color: OUTCOME_CONFIG[application.finalOutcome]?.color,
            }}
          >
            {OUTCOME_CONFIG[application.finalOutcome]?.emoji}{' '}
            {OUTCOME_CONFIG[application.finalOutcome]?.label}
          </div>
        )}

        {isTerminalStatus() && (
          <div className={styles.outcomeBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>
            🔒 Application Closed
          </div>
        )}
      </div>

      {shouldShowActions() && (
        <div className={styles.cardActions}>
          {availableActions.slice(0, 2).map(action => (
            <button
              key={action.type}
              className={styles.actionButton({ variant: getActionVariant(action.type) })}
              onClick={e => handleActionClick(action, e)}
            >
              {formatActionLabel(action.type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationStageCard;
