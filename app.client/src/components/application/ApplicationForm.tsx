/**
 * Application Form with Performance Optimizations
 */

import { ApplicationData, Pet } from '@/types';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { LivingSituationStep } from './steps/LivingSituationStep';
import { PetExperienceStep } from './steps/PetExperienceStep';
import { ReferencesStep } from './steps/ReferencesStep';
import { ReviewStep } from './steps/ReviewStep';

interface ApplicationFormProps {
  step: number;
  data: Partial<ApplicationData>;
  pet: Pet | null;
  onStepComplete: (stepData: Partial<ApplicationData>) => void;
  onStepBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isUpdate: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  onRetry?: () => void;
  error?: {
    message: string;
    userMessage: string;
    recoverable: boolean;
    retryable: boolean;
  } | null;
}

const FormContainer = styled.div`
  min-height: 400px;
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const SaveIndicator = styled.div<{ visible: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: ${props => props.theme.colors.semantic.success || '#10b981'};
  color: white;
  border-radius: 4px;
  font-size: 0.875rem;
  opacity: ${props => (props.visible ? 1 : 0)};
  transform: translateY(${props => (props.visible ? 0 : '-10px')});
  transition: all 0.3s ease;
  z-index: 1000;
`;

export const ApplicationForm: React.FC<ApplicationFormProps> = memo(
  ({
    step,
    data,
    pet,
    onStepComplete,
    onStepBack,
    onSubmit,
    isSubmitting,
    isUpdate,
    isSaving = false,
    lastSaved = null,
    onRetry,
    error,
  }) => {
    // Memoize step data to prevent unnecessary re-renders
    const stepData = useMemo(() => {
      switch (step) {
        case 1:
          return data.personalInfo || {};
        case 2:
          return data.livingsituation || {};
        case 3:
          return data.petExperience || {};
        case 4:
          return data.references || {};
        case 5:
          return data.additionalInfo || {};
        case 6:
          return data;
        default:
          return {};
      }
    }, [step, data]);

    // Render step components with step-specific handling
    const renderStep = () => {
      switch (step) {
        case 1:
          return (
            <BasicInfoStep
              data={stepData as Partial<ApplicationData['personalInfo']>}
              onComplete={data =>
                onStepComplete({ personalInfo: data } as Partial<ApplicationData>)
              }
            />
          );
        case 2:
          return (
            <LivingSituationStep
              data={stepData as Partial<ApplicationData['livingsituation']>}
              onComplete={data =>
                onStepComplete({ livingsituation: data } as Partial<ApplicationData>)
              }
            />
          );
        case 3:
          return (
            <PetExperienceStep
              data={stepData as Partial<ApplicationData['petExperience']>}
              onComplete={data =>
                onStepComplete({ petExperience: data } as Partial<ApplicationData>)
              }
            />
          );
        case 4:
          return (
            <ReferencesStep
              data={stepData as Partial<ApplicationData['references']>}
              onComplete={data => onStepComplete({ references: data } as Partial<ApplicationData>)}
            />
          );
        case 5:
          return (
            <AdditionalInfoStep
              data={stepData as ApplicationData['additionalInfo']}
              onComplete={data =>
                onStepComplete({ additionalInfo: data } as Partial<ApplicationData>)
              }
            />
          );
        case 6:
          return (
            <ReviewStep
              data={data}
              pet={pet}
              onComplete={data =>
                onStepComplete({ additionalInfo: data } as Partial<ApplicationData>)
              }
              isUpdate={isUpdate}
            />
          );
        default:
          return null;
      }
    };

    // Format last saved time
    const lastSavedText = useMemo(() => {
      if (!lastSaved) return null;
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Saved just now';
      if (diffMins < 60) return `Saved ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

      const diffHours = Math.floor(diffMins / 60);
      return `Saved ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }, [lastSaved]);

    return (
      <FormContainer>
        {/* Error Display */}
        {error && (
          <Alert variant='error' title='Error'>
            {error.userMessage}
            {error.recoverable && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
                Your progress has been saved and you can continue where you left off.
              </p>
            )}
            {error.retryable && onRetry && (
              <div style={{ marginTop: '1rem' }}>
                <Button variant='secondary' onClick={onRetry}>
                  Try Again
                </Button>
              </div>
            )}
          </Alert>
        )}

        {/* Auto-save Indicator */}
        <SaveIndicator visible={isSaving}>Saving...</SaveIndicator>

        {/* Last Saved Indicator */}
        {lastSaved && !isSaving && <SaveIndicator visible={true}>✓ {lastSavedText}</SaveIndicator>}

        {/* Step Content */}
        {renderStep()}

        {/* Loading Overlay for Submission */}
        {isSubmitting && (
          <LoadingOverlay>
            <div style={{ textAlign: 'center' }}>
              <Spinner />
              <p style={{ marginTop: '1rem', color: '#666' }}>Submitting your application...</p>
            </div>
          </LoadingOverlay>
        )}

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid #eee',
          }}
        >
          <Button variant='secondary' onClick={onStepBack} disabled={step === 1 || isSubmitting}>
            Back
          </Button>

          {step < 6 ? (
            <Button type='submit' form={`step-${step}-form`} disabled={isSubmitting}>
              Continue
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
              {isUpdate ? 'Update Application' : 'Submit Application'}
            </Button>
          )}
        </div>
      </FormContainer>
    );
  }
);

ApplicationForm.displayName = 'ApplicationForm';
