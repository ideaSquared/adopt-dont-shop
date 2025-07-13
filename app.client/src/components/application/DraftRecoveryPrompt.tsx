import { Button } from '@adopt-dont-shop/components';
import React from 'react';
import styled from 'styled-components';
import { DraftInfo } from '../../types/enhanced-profile';

interface DraftRecoveryPromptProps {
  draftInfo: DraftInfo;
  onRestore: () => void;
  onStartFresh: () => void;
  onDismiss: () => void;
  petName?: string;
}

const PromptContainer = styled.div`
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: #8b4513;
  box-shadow: 0 4px 12px rgba(252, 182, 159, 0.3);
  border-left: 4px solid #ff8c42;
`;

const PromptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;

  .left {
    display: flex;
    align-items: center;

    .icon {
      font-size: 1.5rem;
      margin-right: 0.75rem;
    }

    h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #8b4513;
    }
  }

  .dismiss {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #8b4513;
    cursor: pointer;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
`;

const PromptContent = styled.div`
  p {
    margin: 0 0 1rem 0;
    line-height: 1.5;
    color: #8b4513;
  }

  .draft-details {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .label {
      font-weight: 500;
      color: #8b4513;
    }

    .value {
      color: #a0522d;
      font-weight: 600;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const RestoreButton = styled(Button)`
  background: #ff8c42;
  color: white;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: #e07835;
    transform: translateY(-1px);
  }
`;

const FreshButton = styled(Button)`
  background: transparent;
  color: #8b4513;
  border: 2px solid #8b4513;
  font-weight: 500;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: rgba(139, 69, 19, 0.1);
  }
`;

export const DraftRecoveryPrompt: React.FC<DraftRecoveryPromptProps> = ({
  draftInfo,
  onRestore,
  onStartFresh,
  onDismiss,
  petName = 'this pet',
}) => {
  if (!draftInfo.hasDraft || !draftInfo.canRestore) {
    return null;
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Unknown';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const completionPercentage = Math.round(draftInfo.completionPercentage || 0);

  return (
    <PromptContainer>
      <PromptHeader>
        <div className='left'>
          <span className='icon'>📝</span>
          <h3>Continue Your Application</h3>
        </div>
        <button className='dismiss' onClick={onDismiss} aria-label='Dismiss'>
          ×
        </button>
      </PromptHeader>

      <PromptContent>
        <p>
          We found an unfinished application for {petName}. Would you like to continue where you
          left off?
        </p>

        <div className='draft-details'>
          <div className='detail-row'>
            <span className='label'>Progress:</span>
            <span className='value'>{completionPercentage}% complete</span>
          </div>
          <div className='detail-row'>
            <span className='label'>Last updated:</span>
            <span className='value'>{formatDate(draftInfo.lastAccessedAt)}</span>
          </div>
          {draftInfo.lastSavedStep && (
            <div className='detail-row'>
              <span className='label'>Current step:</span>
              <span className='value'>Step {draftInfo.lastSavedStep}</span>
            </div>
          )}
        </div>

        <ButtonGroup>
          <RestoreButton onClick={onRestore}>Continue Application</RestoreButton>
          <FreshButton onClick={onStartFresh}>Start Fresh</FreshButton>
        </ButtonGroup>
      </PromptContent>
    </PromptContainer>
  );
};
