import { ApplicationData, Pet } from '@/types';
import { Button } from '@adopt-dont-shop/components';
import React from 'react';
import styled from 'styled-components';
import {
  BasicInfoStep,
  LivingSituationStep,
  PetExperienceStep,
  ReferencesStep,
  ReviewStep,
} from './steps';

interface ApplicationFormProps {
  step: number;
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onStepComplete: (stepData: Partial<ApplicationData>) => void;
  onStepBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isUpdate: boolean;
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

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  step,
  data,
  pet,
  onStepComplete,
  onStepBack,
  onSubmit,
  isSubmitting,
  isUpdate,
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
          />
        );
      case 2:
        return (
          <LivingSituationStep
            data={data.livingsituation || {}}
            onComplete={(livingsituation: ApplicationData['livingsituation']) =>
              onStepComplete({ livingsituation })
            }
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
