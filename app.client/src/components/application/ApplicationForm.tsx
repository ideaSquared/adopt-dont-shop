import { ApplicationData, Pet } from '@/services';
import { Button } from '@adopt-dont-shop/lib.components';
import React from 'react';
import styled from 'styled-components';
import {
  BasicInfoStep,
  DocumentUploadStep,
  LivingSituationStep,
  PetExperienceStep,
  ReferencesStep,
  ReviewStep,
} from './steps';

type PendingDocument = {
  file: File;
  documentType: 'REFERENCE' | 'VETERINARY_RECORD' | 'PROOF_OF_RESIDENCE' | 'OTHER';
  id: string;
};

interface ApplicationFormProps {
  step: number;
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onStepComplete: (stepData: Partial<ApplicationData>) => void;
  onStepBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isUpdate: boolean;
  pendingDocuments?: PendingDocument[];
  onDocumentsChange?: (documents: PendingDocument[]) => void;
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

export const TOTAL_STEPS = 6;

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  step,
  data,
  pet,
  onStepComplete,
  onStepBack,
  onSubmit,
  isSubmitting,
  isUpdate,
  pendingDocuments = [],
  onDocumentsChange,
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
          <DocumentUploadStep
            initialDocuments={pendingDocuments}
            onComplete={(documents: PendingDocument[]) => {
              if (onDocumentsChange) {
                onDocumentsChange(documents);
              }
              onStepComplete({});
            }}
          />
        );
      case 6:
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
  const isLastStep = step === TOTAL_STEPS;

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
