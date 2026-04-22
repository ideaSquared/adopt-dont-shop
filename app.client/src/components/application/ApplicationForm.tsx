import { ApplicationData, Pet } from '@/services';
import type { SaveStatus } from '@/hooks/use-auto-save';
import { Button } from '@adopt-dont-shop/lib.components';
import React from 'react';
import styled from 'styled-components';
import {
  BasicInfoStep,
  LivingSituationStep,
  PetExperienceStep,
  ReferencesStep,
  ReviewStep,
} from './steps';

export type PartialApplicationData = {
  [K in keyof ApplicationData]?: Partial<ApplicationData[K]>;
};

interface ApplicationFormProps {
  step: number;
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onStepComplete: (stepData: Partial<ApplicationData>) => void;
  onStepBack: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onDataChange: (stepData: PartialApplicationData) => void;
  isSubmitting: boolean;
  isUpdate: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
}

const FormContainer = styled.div`
  min-height: 400px;
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;

    button {
      flex: 1;
    }
  }
`;

const SaveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const SaveStatusText = styled.span<{ $status: SaveStatus }>`
  font-size: 0.8125rem;
  color: ${props => {
    switch (props.$status) {
      case 'saved':
        return props.theme.colors.semantic.success[600];
      case 'saving':
        return props.theme.colors.neutral[500];
      case 'error':
        return props.theme.colors.semantic.error[600];
      default:
        return props.theme.colors.neutral[400];
    }
  }};
`;

const formatLastSaved = (date: Date): string => {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return 'just now';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return '1 minute ago';
  }
  return `${diffMinutes} minutes ago`;
};

const SaveStatusMessage: React.FC<{ status: SaveStatus; lastSaved: Date | null }> = ({
  status,
  lastSaved,
}) => {
  if (status === 'saving') {
    return <SaveStatusText $status={status}>Saving draft…</SaveStatusText>;
  }
  if (status === 'saved' && lastSaved) {
    return (
      <SaveStatusText $status={status}>Draft saved {formatLastSaved(lastSaved)}</SaveStatusText>
    );
  }
  if (status === 'error') {
    return <SaveStatusText $status={status}>Failed to save draft</SaveStatusText>;
  }
  return null;
};

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  step,
  data,
  pet,
  onStepComplete,
  onStepBack,
  onSubmit,
  onSaveDraft,
  onDataChange,
  isSubmitting,
  isUpdate,
  saveStatus,
  lastSaved,
}) => {
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <BasicInfoStep
            data={data.personalInfo || {}}
            onComplete={(personalInfo: ApplicationData['personalInfo']) =>
              onStepComplete({ personalInfo })
            }
            onChange={personalInfo => onDataChange({ personalInfo })}
          />
        );
      case 2:
        return (
          <LivingSituationStep
            data={data.livingsituation || {}}
            onComplete={(livingsituation: ApplicationData['livingsituation']) =>
              onStepComplete({ livingsituation })
            }
            onChange={livingsituation => onDataChange({ livingsituation })}
          />
        );
      case 3:
        return (
          <PetExperienceStep
            data={data.petExperience || {}}
            onComplete={(petExperience: ApplicationData['petExperience']) =>
              onStepComplete({ petExperience })
            }
          />
        );
      case 4:
        return (
          <ReferencesStep
            data={data.references || {}}
            onComplete={(references: ApplicationData['references']) =>
              onStepComplete({ references })
            }
          />
        );
      case 5:
        return (
          <ReviewStep
            data={data}
            pet={pet}
            onComplete={(additionalInfo: ApplicationData['additionalInfo']) =>
              onStepComplete({ additionalInfo })
            }
            isUpdate={isUpdate}
          />
        );
      default:
        return null;
    }
  };

  const isFirstStep = step === 1;
  const isLastStep = step === 5;

  return (
    <FormContainer>
      {renderStep()}

      <NavigationButtons>
        <div>
          {!isFirstStep && (
            <Button variant='secondary' onClick={onStepBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
        </div>

        <ButtonGroup>
          <SaveIndicator>
            <SaveStatusMessage status={saveStatus} lastSaved={lastSaved} />
            <Button
              variant='ghost'
              onClick={onSaveDraft}
              disabled={isSubmitting || saveStatus === 'saving'}
              aria-label='Save draft'
            >
              Save draft
            </Button>
          </SaveIndicator>

          {isLastStep ? (
            <Button
              variant='primary'
              onClick={onSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isUpdate ? 'Update Application' : 'Submit Application'}
            </Button>
          ) : (
            <Button variant='primary' type='submit' form={`step-${step}-form`}>
              Continue
            </Button>
          )}
        </ButtonGroup>
      </NavigationButtons>
    </FormContainer>
  );
};
