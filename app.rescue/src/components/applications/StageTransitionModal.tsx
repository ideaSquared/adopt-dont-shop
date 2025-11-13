import React, { useState } from 'react';
import styled from 'styled-components';
import {
  ApplicationStage,
  STAGE_CONFIG,
  STAGE_ACTIONS,
  StageAction,
} from '../../types/applicationStages';

// Styled Components
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(75, 85, 99, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
`;

const Modal = styled.div`
  background: white;
  border-radius: 0.5rem;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 28rem;
  width: 90%;
  padding: 1.5rem;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`;

const StageDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
`;

const StageBox = styled.div<{ $color: string }>`
  flex: 1;
  padding: 0.75rem;
  background: ${props => props.$color};
  color: white;
  border-radius: 0.375rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
`;

const Arrow = styled.div`
  font-size: 1.25rem;
  color: #9ca3af;
`;

const FormField = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ActionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ActionOption = styled.button<{ $selected: boolean }>`
  padding: 0.75rem;
  border: 2px solid ${props => (props.$selected ? '#3b82f6' : '#e5e7eb')};
  border-radius: 0.375rem;
  background: ${props => (props.$selected ? '#eff6ff' : 'white')};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }
`;

const ActionLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
`;

const ActionDescription = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
          &:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

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
      alert(
        `Failed to transition stage: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    <Overlay onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>Transition Application Stage</Title>
          <Subtitle>Move this application to a new stage</Subtitle>
        </Header>

        {selectedAction && selectedAction.nextStage && (
          <StageDisplay>
            <StageBox $color={STAGE_CONFIG[currentStage]?.color || '#9ca3af'}>
              {STAGE_CONFIG[currentStage]?.emoji} {STAGE_CONFIG[currentStage]?.label}
            </StageBox>
            <Arrow>→</Arrow>
            <StageBox $color={STAGE_CONFIG[selectedAction.nextStage]?.color || '#9ca3af'}>
              {STAGE_CONFIG[selectedAction.nextStage]?.emoji}{' '}
              {STAGE_CONFIG[selectedAction.nextStage]?.label}
            </StageBox>
          </StageDisplay>
        )}

        {availableActions.length === 0 ? (
          <FormField>
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
          </FormField>
        ) : (
          <>
            <FormField>
              <Label>Select Action</Label>
              <ActionList>
                {availableActions.map(action => (
                  <ActionOption
                    key={action.type}
                    $selected={selectedAction?.type === action.type}
                    onClick={() => setSelectedAction(action)}
                    type="button"
                  >
                    <ActionLabel>{getActionLabel(action.type)}</ActionLabel>
                    <ActionDescription>{getActionDescription(action)}</ActionDescription>
                  </ActionOption>
                ))}
              </ActionList>
            </FormField>

            {selectedAction && (
              <FormField>
                <Label>Notes (optional)</Label>
                <TextArea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any notes about this stage transition..."
                />
              </FormField>
            )}
          </>
        )}

        <ButtonGroup>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={!selectedAction || isSubmitting || availableActions.length === 0}
          >
            {isSubmitting ? 'Transitioning...' : 'Confirm Transition'}
          </Button>
        </ButtonGroup>
      </Modal>
    </Overlay>
  );
};

export default StageTransitionModal;
