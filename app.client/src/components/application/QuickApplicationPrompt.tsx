import { Button } from '@adopt-dont-shop/components';
import React from 'react';
import styled from 'styled-components';
import { QuickApplicationCapability } from '../../types';

interface QuickApplicationPromptProps {
  capability: QuickApplicationCapability;
  onQuickApply: () => void;
  onRegularApply: () => void;
  petName?: string;
}

const PromptContainer = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
`;

const PromptHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;

  .icon {
    font-size: 1.5rem;
    margin-right: 0.75rem;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

const PromptContent = styled.div`
  p {
    margin: 0 0 1rem 0;
    opacity: 0.9;
    line-height: 1.5;
  }

  .benefits {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .benefit {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
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

const QuickApplyButton = styled(Button)`
  background: white;
  color: #667eea;
  border: none;
  font-weight: 600;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: #f8f9ff;
    transform: translateY(-1px);
  }
`;

const RegularButton = styled(Button)`
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
  font-weight: 500;
  padding: 0.75rem 1.5rem;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
  }
`;

export const QuickApplicationPrompt: React.FC<QuickApplicationPromptProps> = ({
  capability,
  onQuickApply,
  onRegularApply,
  petName = 'this pet',
}) => {
  if (!capability.canProceed) {
    return null;
  }

  const completionPercentage = Math.round(capability.completionPercentage || 0);

  return (
    <PromptContainer>
      <PromptHeader>
        <span className='icon'>⚡</span>
        <h3>Quick Application Available</h3>
      </PromptHeader>

      <PromptContent>
        <p>
          Great news! Your profile is {completionPercentage}% complete, so you can apply for{' '}
          {petName} with just a few clicks using your saved information.
        </p>

        <div className='benefits'>
          <span className='benefit'>✨ Pre-filled forms</span>
          <span className='benefit'>⏱️ 2-minute application</span>
          <span className='benefit'>🎯 Higher approval rate</span>
        </div>

        <ButtonGroup>
          <QuickApplyButton onClick={onQuickApply}>Quick Apply (2 min)</QuickApplyButton>
          <RegularButton variant='outline' onClick={onRegularApply}>
            Standard Application
          </RegularButton>
        </ButtonGroup>
      </PromptContent>
    </PromptContainer>
  );
};
