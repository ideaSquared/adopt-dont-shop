import React from 'react';
import styled from 'styled-components';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface ApplicationProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

const ProgressContainer = styled.div`
  margin-bottom: 3rem;
`;

const StepsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding: 1rem 0;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const StepItem = styled.div<{ $isActive: boolean; $isCompleted: boolean; $isClickable: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 120px;
  cursor: ${props => (props.$isClickable ? 'pointer' : 'default')};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: ${props => (props.$isClickable ? 0.8 : 1)};
  }

  @media (max-width: 768px) {
    flex-direction: row;
    text-align: left;
    min-width: auto;
    width: 100%;
    padding: 0.5rem;
    border-radius: 8px;
    background: ${props => (props.$isActive ? props.theme.colors.primary[50] : 'transparent')};
  }
`;

const StepNumber = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  border: 2px solid;

  ${props => {
    if (props.$isCompleted) {
      return `
        background: ${props.theme.colors.semantic.success[500]};
        border-color: ${props.theme.colors.semantic.success[500]};
        color: white;
      `;
    } else if (props.$isActive) {
      return `
        background: ${props.theme.colors.primary[500]};
        border-color: ${props.theme.colors.primary[500]};
        color: white;
      `;
    } else {
      return `
        background: transparent;
        border-color: ${props.theme.colors.neutral[300]};
        color: ${props.theme.colors.neutral[400]};
      `;
    }
  }}

  @media (max-width: 768px) {
    margin-bottom: 0;
    margin-right: 1rem;
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }
`;

const StepContent = styled.div`
  @media (max-width: 768px) {
    flex: 1;
  }
`;

const StepTitle = styled.h3<{ $isActive: boolean; $isCompleted: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: ${props => {
    if (props.$isCompleted || props.$isActive) {
      return props.theme.text.primary;
    }
    return props.theme.text.tertiary;
  }};

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const StepDescription = styled.p<{ $isActive: boolean; $isCompleted: boolean }>`
  font-size: 0.75rem;
  margin: 0;
  color: ${props => {
    if (props.$isCompleted || props.$isActive) {
      return props.theme.text.secondary;
    }
    return props.theme.text.tertiary;
  }};

  @media (max-width: 768px) {
    font-size: 0.875rem;
  }
`;

const StepConnector = styled.div<{ $isCompleted: boolean }>`
  flex: 1;
  height: 2px;
  background: ${props =>
    props.$isCompleted
      ? props.theme.colors.semantic.success[500]
      : props.theme.colors.neutral[200]};
  margin: 0 1rem;
  transition: background-color 0.3s ease;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${props => props.theme.colors.neutral[200]};
  border-radius: 2px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: ${props => props.theme.colors.primary[500]};
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
  border-radius: 2px;
`;

export const ApplicationProgress: React.FC<ApplicationProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <ProgressContainer>
      <StepsContainer>
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= currentStep;

          return (
            <React.Fragment key={step.id}>
              <StepItem
                $isActive={isActive}
                $isCompleted={isCompleted}
                $isClickable={isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
              >
                <StepNumber $isActive={isActive} $isCompleted={isCompleted}>
                  {isCompleted ? '✓' : step.id}
                </StepNumber>
                <StepContent>
                  <StepTitle $isActive={isActive} $isCompleted={isCompleted}>
                    {step.title}
                  </StepTitle>
                  <StepDescription $isActive={isActive} $isCompleted={isCompleted}>
                    {step.description}
                  </StepDescription>
                </StepContent>
              </StepItem>
              {index < steps.length - 1 && <StepConnector $isCompleted={isCompleted} />}
            </React.Fragment>
          );
        })}
      </StepsContainer>

      <ProgressBar>
        <ProgressFill $progress={progressPercentage} />
      </ProgressBar>
    </ProgressContainer>
  );
};
