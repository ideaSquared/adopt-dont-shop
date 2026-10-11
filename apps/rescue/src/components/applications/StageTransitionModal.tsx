import React, { useState } from 'react';
import { Input, toast } from '@adopt-dont-shop/lib.components';
import {
  ApplicationStage,
  STAGE_CONFIG,
  STAGE_ACTIONS,
  StageAction,
} from '../../types/applicationStages';
import * as styles from './StageTransitionModal.css';

type Choice = { value: string; label: string };

// Actions the bulk-update route can only apply with an extra value: the
// decision itself, the visit outcome, or when the visit is.
const DECISION_CHOICES: Choice[] = [
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
];
const VISIT_OUTCOME_CHOICES: Choice[] = [
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
];

const actionData = (
  type: StageAction['type'] | undefined,
  choice: string | null,
  visitAt: string
): Record<string, unknown> | undefined | null => {
  if (type === 'MAKE_DECISION') {
    return choice ? { status: choice } : null;
  }
  if (type === 'COMPLETE_VISIT') {
    return choice ? { outcome: choice } : null;
  }
  if (type === 'SCHEDULE_VISIT') {
    return visitAt ? { scheduledAt: new Date(visitAt).toISOString() } : null;
  }
  return undefined;
};

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
  const [choice, setChoice] = useState<string | null>(null);
  const [visitAt, setVisitAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableActions = STAGE_ACTIONS[currentStage] || [];
  // null = the selected action still needs its value; undefined = it needs none.
  const data = actionData(selectedAction?.type, choice, visitAt);

  const selectAction = (action: StageAction) => {
    setSelectedAction(action);
    setChoice(null);
    setVisitAt('');
  };

  const handleSubmit = async () => {
    if (!selectedAction || data === null) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onTransition(
        data ? { ...selectedAction, data } : selectedAction,
        notes.trim() || undefined
      );
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
      role="presentation"
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
            <p className={styles.noActionsMessage}>
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
                    onClick={() => selectAction(action)}
                    type="button"
                  >
                    <div className={styles.actionLabel}>{getActionLabel(action.type)}</div>
                    <div className={styles.actionDescription}>{getActionDescription(action)}</div>
                  </button>
                ))}
              </div>
            </div>

            {(selectedAction?.type === 'MAKE_DECISION' ||
              selectedAction?.type === 'COMPLETE_VISIT') && (
              <div className={styles.formField}>
                <p className={styles.label} id="stage-transition-choice">
                  {selectedAction.type === 'MAKE_DECISION' ? 'Decision' : 'Visit outcome'}
                </p>
                <div
                  className={styles.actionList}
                  role="group"
                  aria-labelledby="stage-transition-choice"
                >
                  {(selectedAction.type === 'MAKE_DECISION'
                    ? DECISION_CHOICES
                    : VISIT_OUTCOME_CHOICES
                  ).map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={styles.actionOption({ selected: choice === option.value })}
                      aria-pressed={choice === option.value}
                      onClick={() => setChoice(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedAction?.type === 'SCHEDULE_VISIT' && (
              <div className={styles.formField}>
                <Input
                  id="stage-transition-visit-at"
                  type="datetime-local"
                  label="Visit date and time"
                  value={visitAt}
                  onChange={e => setVisitAt(e.target.value)}
                  required
                />
              </div>
            )}

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
            disabled={
              !selectedAction || data === null || isSubmitting || availableActions.length === 0
            }
          >
            {isSubmitting ? 'Transitioning...' : 'Confirm Transition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageTransitionModal;
