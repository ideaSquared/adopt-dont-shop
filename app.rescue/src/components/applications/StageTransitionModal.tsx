import React, { useState } from 'react';
import { toast } from '@adopt-dont-shop/lib.components';
import {
  ApplicationStage,
  STAGE_CONFIG,
  STAGE_ACTIONS,
  StageAction,
} from '../../types/applicationStages';
import * as styles from './StageTransitionModal.css';

interface StageTransitionModalProps {
  currentStage: ApplicationStage;
  onClose: () => void;
  onTransition: (action: StageAction, notes?: string) => Promise<void>;
}

const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  currentStage,
  onClose,
  onTransition,
}) => {
  const [selectedAction, setSelectedAction] = useState<StageAction | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableActions = STAGE_ACTIONS[currentStage] || [];

  const handleSubmit = async () => {
    if (!selectedAction) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onTransition(selectedAction, notes.trim() || undefined);
      onClose();
    } catch (error) {
      console.error('Failed to transition stage:', error);
      toast.error(
        `Failed to transition stage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { action: { label: 'Retry', onClick: handleSubmit } }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionLabel = (type: string): string => {
    const labels: Record<string, string> = {
      START_REVIEW: 'Start Review',
      SCHEDULE_VISIT: 'Schedule Home Visit',
      COMPLETE_VISIT: 'Complete Visit',
      MAKE_DECISION: 'Make Final Decision',
      REJECT: 'Reject Application',
      WITHDRAW: 'Withdraw Application',
    };
    return labels[type] || type;
  };

  const getActionDescription = (action: StageAction): string => {
    const descriptions: Record<string, string> = {
      START_REVIEW: 'Begin reviewing the application and checking references',
      SCHEDULE_VISIT: 'Move to home visit stage and schedule a visit',
      COMPLETE_VISIT: 'Mark home visit as complete and proceed to decision',
      MAKE_DECISION: 'Make the final approval or rejection decision',
      REJECT: 'Reject this application and close it',
      WITHDRAW: 'Mark this application as withdrawn by the applicant',
    };
    return descriptions[action.type] || '';
  };

  return (
    <div
      className={styles.overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={-1}
      aria-label="Close modal"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Transition Application Stage</h2>
          <p className={styles.subtitle}>Move this application to a new stage</p>
        </div>

        {selectedAction && selectedAction.nextStage && (
          <div className={styles.stageDisplay}>
            <div
              className={styles.stageBox}
              style={{ background: STAGE_CONFIG[currentStage]?.color || '#9ca3af' }}
            >
              {STAGE_CONFIG[currentStage]?.emoji} {STAGE_CONFIG[currentStage]?.label}
            </div>
            <div className={styles.arrow}>→</div>
            <div
              className={styles.stageBox}
              style={{ background: STAGE_CONFIG[selectedAction.nextStage]?.color || '#9ca3af' }}
            >
              {STAGE_CONFIG[selectedAction.nextStage]?.emoji}{' '}
              {STAGE_CONFIG[selectedAction.nextStage]?.label}
            </div>
          </div>
        )}

        {availableActions.length === 0 ? (
          <div className={styles.formField}>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'center',
                padding: '1rem',
              }}
            >
              No stage transitions available for {STAGE_CONFIG[currentStage]?.label || currentStage}
              .
            </p>
          </div>
        ) : (
          <>
            <div className={styles.formField}>
              <p className={styles.label}>Select Action</p>
              <div className={styles.actionList}>
                {availableActions.map(action => (
                  <button
                    key={action.type}
                    className={styles.actionOption({
                      selected: selectedAction?.type === action.type,
                    })}
                    onClick={() => setSelectedAction(action)}
                    type="button"
                  >
                    <div className={styles.actionLabel}>{getActionLabel(action.type)}</div>
                    <div className={styles.actionDescription}>{getActionDescription(action)}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedAction && (
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="stage-transition-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="stage-transition-notes"
                  className={styles.textArea}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any notes about this stage transition..."
                />
              </div>
            )}
          </>
        )}

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.button({ variant: 'secondary' })}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.button({ variant: 'primary' })}
            onClick={handleSubmit}
            disabled={!selectedAction || isSubmitting || availableActions.length === 0}
          >
            {isSubmitting ? 'Transitioning...' : 'Confirm Transition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageTransitionModal;
