import { Button } from '@adopt-dont-shop/lib.components';
import React from 'react';
import styled from 'styled-components';

interface ProfileCompletionPromptProps {
  completionPercentage: number;
  missingFields: string[];
  onCompleteProfile: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

const PromptContainer = styled.div`
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: #1565c0;
  box-shadow: 0 4px 12px rgba(187, 222, 251, 0.4);
  border-left: 4px solid #2196f3;
`;

const PromptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
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
      color: #1565c0;
    }
  }

  .dismiss {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #1565c0;
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
    color: #1565c0;
  }

  .progress-container {
    margin-bottom: 1.5rem;
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.5);
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;

    .progress-fill {
      height: 100%;
      background: #2196f3;
      transition: width 0.3s ease;
    }
  }

  .progress-text {
    font-size: 0.875rem;
    color: #1976d2;
    font-weight: 500;
  }

  .missing-fields {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;

    h4 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #1565c0;
    }

    .field-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .field-tag {
      background: rgba(33, 150, 243, 0.2);
      color: #1565c0;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
  }

  .benefits {
    margin-bottom: 1.5rem;

    .benefit-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;

      .icon {
        margin-right: 0.5rem;
        font-size: 1rem;
      }

      span {
        font-size: 0.875rem;
        color: #1976d2;
      }
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

const CompleteButton = styled(Button)`
  background: #2196f3;
  color: white;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: #1976d2;
    transform: translateY(-1px);
  }
`;

const SkipButton = styled(Button)`
  background: transparent;
  color: #1565c0;
  border: 2px solid #1565c0;
  font-weight: 500;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: rgba(21, 101, 192, 0.1);
  }
`;

const formatFieldName = (field: string): string => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export const ProfileCompletionPrompt: React.FC<ProfileCompletionPromptProps> = ({
  completionPercentage,
  missingFields,
  onCompleteProfile,
  onSkip,
  onDismiss,
}) => {
  // Only show if profile is incomplete (less than 90%)
  if (completionPercentage >= 90) {
    return null;
  }

  const displayFields = missingFields.slice(0, 5); // Show max 5 fields
  const hasMoreFields = missingFields.length > 5;

  return (
    <PromptContainer>
      <PromptHeader>
        <div className='left'>
          <span className='icon'>🎯</span>
          <h3>Complete Your Profile</h3>
        </div>
        <button className='dismiss' onClick={onDismiss} aria-label='Dismiss'>
          ×
        </button>
      </PromptHeader>

      <PromptContent>
        <p>
          Complete your profile to unlock quick applications and improve your chances of adoption
          approval.
        </p>

        <div className='progress-container'>
          <div className='progress-bar'>
            <div className='progress-fill' style={{ width: `${completionPercentage}%` }} />
          </div>
          <div className='progress-text'>{completionPercentage}% complete</div>
        </div>

        {displayFields.length > 0 && (
          <div className='missing-fields'>
            <h4>Missing Information:</h4>
            <div className='field-list'>
              {displayFields.map((field, index) => (
                <span key={index} className='field-tag'>
                  {formatFieldName(field)}
                </span>
              ))}
              {hasMoreFields && <span className='field-tag'>+{missingFields.length - 5} more</span>}
            </div>
          </div>
        )}

        <div className='benefits'>
          <div className='benefit-item'>
            <span className='icon'>⚡</span>
            <span>Enable quick applications for future adoptions</span>
          </div>
          <div className='benefit-item'>
            <span className='icon'>📈</span>
            <span>Increase your application approval rate</span>
          </div>
          <div className='benefit-item'>
            <span className='icon'>💾</span>
            <span>Save time with pre-filled forms</span>
          </div>
        </div>

        <ButtonGroup>
          <CompleteButton onClick={onCompleteProfile}>
            Complete Profile ({100 - completionPercentage}% remaining)
          </CompleteButton>
          <SkipButton onClick={onSkip}>Skip for Now</SkipButton>
        </ButtonGroup>
      </PromptContent>
    </PromptContainer>
  );
};
