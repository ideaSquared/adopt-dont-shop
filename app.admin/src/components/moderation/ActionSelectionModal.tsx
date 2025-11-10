import React, { useState } from 'react';
import styled from 'styled-components';
import { FiX } from 'react-icons/fi';

export type ActionType =
  | 'no_action'
  | 'warning_issued'
  | 'content_removed'
  | 'user_suspended'
  | 'user_banned'
  | 'account_restricted'
  | 'content_flagged';

export interface ActionSelectionData {
  actionType: ActionType;
  reason: string;
  internalNotes?: string;
  duration?: number; // in hours, for suspensions
}

interface ActionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActionSelectionData) => void;
  reportTitle: string;
  isLoading?: boolean;
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  svg {
    font-size: 1.25rem;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ReportInfo = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const ReportTitle = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const ReportText = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: #111827;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }
`;

const HelpText = styled.p`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  margin-bottom: 0;
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${props => props.$variant === 'primary' ? `
    background: ${props.theme.colors.primary[600]};
    color: #ffffff;

    &:hover:not(:disabled) {
      background: ${props.theme.colors.primary[700]};
    }
  ` : `
    background: #ffffff;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover:not(:disabled) {
      background: #f9fafb;
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const actionTypeLabels: Record<ActionType, string> = {
  no_action: 'No Action Required',
  warning_issued: 'Issue Warning',
  content_removed: 'Remove Content',
  user_suspended: 'Suspend User',
  user_banned: 'Ban User Permanently',
  account_restricted: 'Restrict Account',
  content_flagged: 'Flag Content for Review',
};

const actionTypeDescriptions: Record<ActionType, string> = {
  no_action: 'Report will be dismissed without any action taken',
  warning_issued: 'User will receive a formal warning',
  content_removed: 'The reported content will be removed from the platform',
  user_suspended: 'User account will be temporarily suspended',
  user_banned: 'User account will be permanently banned',
  account_restricted: 'User will have limited access to certain features',
  content_flagged: 'Content will be flagged for senior moderator review',
};

export const ActionSelectionModal: React.FC<ActionSelectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reportTitle,
  isLoading = false,
}) => {
  const [actionType, setActionType] = useState<ActionType>('no_action');
  const [reason, setReason] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [duration, setDuration] = useState<number>(24);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    const data: ActionSelectionData = {
      actionType,
      reason: reason.trim(),
      internalNotes: internalNotes.trim() || undefined,
    };

    if (actionType === 'user_suspended' && duration) {
      data.duration = duration;
    }

    onSubmit(data);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Overlay $isOpen={isOpen} onClick={handleClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Take Moderation Action</ModalTitle>
          <CloseButton onClick={handleClose} disabled={isLoading}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <ReportInfo>
              <ReportTitle>Report:</ReportTitle>
              <ReportText>{reportTitle}</ReportText>
            </ReportInfo>

            <FormGroup>
              <Label htmlFor="actionType">Action Type *</Label>
              <Select
                id="actionType"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as ActionType)}
                disabled={isLoading}
              >
                {Object.entries(actionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <HelpText>{actionTypeDescriptions[actionType]}</HelpText>
            </FormGroup>

            {actionType === 'user_suspended' && (
              <FormGroup>
                <Label htmlFor="duration">Suspension Duration (hours) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="8760"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 24)}
                  disabled={isLoading}
                />
                <HelpText>
                  Duration in hours (24 hours = 1 day, 168 hours = 1 week, 720 hours = 30 days)
                </HelpText>
              </FormGroup>
            )}

            <FormGroup>
              <Label htmlFor="reason">Reason (visible to user) *</Label>
              <TextArea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this action is being taken. This will be shown to the user."
                disabled={isLoading}
                required
              />
              <HelpText>This message will be visible to the affected user</HelpText>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="internalNotes">Internal Notes (optional)</Label>
              <TextArea
                id="internalNotes"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Add any internal notes for other moderators (not visible to users)"
                disabled={isLoading}
              />
              <HelpText>These notes are only visible to moderators</HelpText>
            </FormGroup>
          </ModalBody>

          <ModalFooter>
            <Button type="button" $variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" $variant="primary" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Take Action'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </Overlay>
  );
};
