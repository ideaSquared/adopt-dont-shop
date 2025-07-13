import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ApplicationForm,
  ApplicationProgress,
  DraftRecoveryPrompt,
  ProfileCompletionPrompt,
  QuickApplicationPrompt,
} from '../components/application';
import { useAuth } from '../contexts/AuthContext';
import { applicationProfileService } from '../services/applicationProfileService';
import { applicationService } from '../services/applicationService';
import { petService } from '../services/petService';
import { ApplicationData, Pet } from '../types';
import {
  ApplicationPrePopulationData,
  DraftInfo,
  QuickApplicationCapability,
} from '../types/enhanced-profile';

/**
 * Phase 1 - Enhanced Application Page
 * Features smart pre-population, draft recovery, and quick application
 */

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    color: ${props => props.theme.colors.neutral[900]};
    margin-bottom: 0.5rem;
  }

  p {
    color: ${props => props.theme.colors.neutral[600]};
    font-size: 1.1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const steps = [
  { id: 1, title: 'Basic Information', description: 'Tell us about yourself' },
  { id: 2, title: 'Living Situation', description: 'Your home environment' },
  { id: 3, title: 'Pet Experience', description: 'Your experience with pets' },
  { id: 4, title: 'References', description: 'Veterinary and personal references' },
  { id: 5, title: 'Review & Submit', description: 'Review your application' },
];

export const EnhancedApplicationPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Component state
  const [pet, setPet] = useState<Pet | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<Partial<ApplicationData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase 1 enhanced state
  const [quickApplicationCapability, setQuickApplicationCapability] =
    useState<QuickApplicationCapability | null>(null);
  const [draftInfo] = useState<DraftInfo | null>(null);
  const [prePopulationData, setPrePopulationData] = useState<ApplicationPrePopulationData | null>(
    null
  );
  const [showQuickApplicationPrompt, setShowQuickApplicationPrompt] = useState(false);
  const [showDraftRecoveryPrompt, setShowDraftRecoveryPrompt] = useState(false);
  const [showProfileCompletionPrompt, setShowProfileCompletionPrompt] = useState(false);
  const [usePrePopulation] = useState(true);

  const populateFormWithData = useCallback(
    (data: ApplicationPrePopulationData) => {
      const populatedData: Partial<ApplicationData> = {
        petId: petId!,
        userId: user!.userId,
        personalInfo: {
          firstName: data.personalInfo?.firstName || user!.firstName,
          lastName: data.personalInfo?.lastName || user!.lastName,
          email: data.personalInfo?.email || user!.email,
          phone: data.personalInfo?.phone || user!.phoneNumber || '',
          address: data.personalInfo?.address || user!.addressLine1 || '',
          city: data.personalInfo?.city || user!.city || '',
          county: data.personalInfo?.county || '', // County is specific to the application, not stored in user profile
          postcode: data.personalInfo?.postcode || user!.postalCode || '',
          country: data.personalInfo?.country || user!.country || 'United Kingdom',
          dateOfBirth: data.personalInfo?.dateOfBirth || '',
          occupation: data.personalInfo?.occupation || '',
        },
        // Use type assertion for partial data with required fields
        livingsituation: {
          housingType: data.livingSituation?.housingType || 'apartment',
          isOwned: data.livingSituation?.isOwned || false,
          hasYard: data.livingSituation?.hasYard || false,
          ...data.livingSituation,
        } as ApplicationData['livingsituation'],
        petExperience: {
          hasPetsCurrently: data.petExperience?.hasPetsCurrently || false,
          experienceLevel: data.petExperience?.experienceLevel || 'beginner',
          willingToTrain: data.petExperience?.willingToTrain || true,
          hoursAloneDaily: data.petExperience?.hoursAloneDaily || 0,
          exercisePlans: data.petExperience?.exercisePlans || '',
          ...data.petExperience,
        } as ApplicationData['petExperience'],
        references: {
          personal: data.references?.personal || [],
          ...data.references,
        } as ApplicationData['references'],
      };

      setApplicationData(populatedData);

      // If we restored from a draft, set the current step
      if (data.lastSavedStep) {
        setCurrentStep(data.lastSavedStep);
      }
    },
    [petId, user]
  );

  const loadApplicationData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!petId) throw new Error('Pet ID is required');

      // Load pet data
      const petData = await petService.getPet(petId);
      setPet(petData);

      // Phase 1: Check for existing drafts
      // const draftRecoveryInfo = await applicationDraftService.getDraftRecoveryInfo(petId);
      // setDraftInfo(draftRecoveryInfo);

      // Phase 1: Check quick application capability
      const quickAppCapability = await applicationProfileService.canUseQuickApplication(petId);
      setQuickApplicationCapability(quickAppCapability);

      // Phase 1: Get pre-population data
      const prePopData = await applicationProfileService.getPrePopulationData(petId);
      setPrePopulationData(prePopData);

      // Phase 1: Determine what prompts to show
      if (quickAppCapability.canProceed && !quickAppCapability.missingFields?.length) {
        setShowQuickApplicationPrompt(true);
      } else if (quickAppCapability.missingFields?.length) {
        setShowProfileCompletionPrompt(true);
      }

      // Phase 1: Pre-populate form with available data
      if (usePrePopulation && prePopData) {
        populateFormWithData(prePopData);
      }
    } catch (error) {
      console.error('Failed to load application data:', error);
      setError('Failed to load application information. Please try again.');
      // Scroll to top so user sees the error notification
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  }, [petId, usePrePopulation, populateFormWithData]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate(`/login?redirect=/apply/${petId}`);
      return;
    }

    loadApplicationData();
  }, [petId, isAuthenticated, authLoading, navigate, loadApplicationData]);

  const handleQuickApplicationAccept = async () => {
    try {
      setShowQuickApplicationPrompt(false);

      if (quickApplicationCapability?.prePopulationData) {
        populateFormWithData(quickApplicationCapability.prePopulationData);
        // Jump to final review step
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Failed to set up quick application:', error);
      setError('Failed to set up quick application. Please try the regular form.');
      // Scroll to top so user sees the error notification
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuickApplicationDecline = () => {
    setShowQuickApplicationPrompt(false);
    // Continue with regular form flow
  };

  const handleDraftRecovery = async (shouldRecover: boolean) => {
    setShowDraftRecoveryPrompt(false);

    if (shouldRecover && draftInfo?.draftId) {
      try {
        // Load draft data and merge with pre-population
        // const restoredData = await applicationDraftService.restoreDraftWithPrePopulation(petId!);
        // populateFormWithData(restoredData);
      } catch (error) {
        console.error('Failed to restore draft:', error);
        setError('Failed to restore draft. Starting with fresh form.');
      }
    }
  };

  const handleProfileCompletionAction = async (action: 'complete' | 'skip') => {
    setShowProfileCompletionPrompt(false);

    if (action === 'complete') {
      // Navigate to profile completion page
      navigate('/profile/setup?returnTo=' + encodeURIComponent(`/apply/${petId}`));
    }
    // If skip, continue with regular form
  };

  const handleStepComplete = async (stepData: Partial<ApplicationData>) => {
    // Phase 1: Auto-save draft
    try {
      const updatedData = { ...applicationData, ...stepData };
      setApplicationData(updatedData);

      // Auto-save draft (if enabled in user preferences)
      // await applicationDraftService.saveDraft({
      //   petId: petId!,
      //   stepNumber: currentStep,
      //   totalSteps: steps.length,
      //   stepData: updatedData,
      // });

      if (currentStep < steps.length) {
        setCurrentStep(prev => prev + 1);
        setSuccessMessage(null); // Clear any success messages when moving to next step
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Don't block the user, just log the error
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setSuccessMessage(null); // Clear any success messages when going back
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      if (!pet || !user || !applicationData.personalInfo) {
        throw new Error('Application data is incomplete');
      }

      // Format data to match backend expectations
      const references = [];

      // Add veterinarian reference if provided
      if (
        applicationData.references?.veterinarian?.name &&
        applicationData.references?.veterinarian?.phone
      ) {
        const vet = applicationData.references.veterinarian;
        references.push({
          name: vet.name,
          relationship: 'Veterinarian',
          phone: vet.phone,
          email: vet.email || '',
        });
      }

      // Add personal references if provided
      if (applicationData.references?.personal && applicationData.references.personal.length > 0) {
        applicationData.references.personal.forEach(ref => {
          // Only add references that have required fields
          if (ref.name && ref.relationship && ref.phone) {
            references.push({
              name: ref.name,
              relationship: ref.relationship,
              phone: ref.phone,
              email: ref.email || '',
            });
          }
        });
      }

      // References are now optional - no need to add placeholder

      // Format answers object containing all application data
      const answers = {
        personal_info: applicationData.personalInfo || {},
        living_situation: applicationData.livingsituation || {},
        pet_experience: applicationData.petExperience || {},
        additional_info: {
          whyAdopt: 'I want to provide a loving home for a pet in need.',
          expectations: 'I expect to provide daily care, exercise, and companionship.',
          emergencyPlan: 'I have a local emergency vet and backup caregiver.',
          agreement: true,
        },
      };

      const submissionData = {
        pet_id: pet.pet_id,
        answers,
        ...(references.length > 0 && { references }),
        priority: 'normal' as const,
      };

      const result = await applicationService.submitApplication(submissionData);

      // Phase 1: Mark draft as completed
      // await applicationDraftService.completeDraft(petId!);

      // Phase 1: Save successful application data as defaults for future use
      await applicationProfileService.updateApplicationDefaults({
        personalInfo: applicationData.personalInfo,
        livingSituation: applicationData.livingsituation,
        petExperience: applicationData.petExperience,
        references: applicationData.references,
      });

      // Show success message
      setSuccessMessage(
        'Application submitted successfully! You will be redirected to your application details page shortly.'
      );
      setError(null);

      // Scroll to top so user sees the success notification
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Navigate after a longer delay to let user see the success message and feel confident
      setTimeout(() => {
        navigate(`/applications/${result.id}`, {
          state: {
            message: 'Application submitted successfully!',
          },
        });
      }, 3000);
    } catch (error) {
      console.error('Failed to submit application:', error);
      setError('Failed to submit application. Please try again.');
      setSuccessMessage(null);

      // Scroll to top so user sees the error notification
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <Spinner size='lg' />
        </LoadingContainer>
      </Container>
    );
  }

  if (error && !pet) {
    return (
      <Container>
        <Alert variant='error' title='Error'>
          {error}
        </Alert>
        <Button onClick={() => navigate('/search')} style={{ marginTop: '1rem' }}>
          Back to Search
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>Adoption Application</h1>
        <p>Complete your application to adopt {pet?.name}</p>
        {prePopulationData?.source && (
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
            Form pre-populated from your {prePopulationData.source.replace('_', ' ')}
          </p>
        )}
      </Header>

      {/* Phase 1: Quick Application Prompt */}
      {showQuickApplicationPrompt && quickApplicationCapability && (
        <QuickApplicationPrompt
          capability={quickApplicationCapability}
          onQuickApply={handleQuickApplicationAccept}
          onRegularApply={handleQuickApplicationDecline}
          petName={pet?.name}
        />
      )}

      {/* Phase 1: Draft Recovery Prompt */}
      {showDraftRecoveryPrompt && draftInfo && (
        <DraftRecoveryPrompt
          draftInfo={draftInfo}
          onRestore={() => handleDraftRecovery(true)}
          onStartFresh={() => handleDraftRecovery(false)}
          onDismiss={() => setShowDraftRecoveryPrompt(false)}
          petName={pet?.name}
        />
      )}

      {/* Phase 1: Profile Completion Prompt */}
      {showProfileCompletionPrompt && quickApplicationCapability?.missingFields && (
        <ProfileCompletionPrompt
          completionPercentage={quickApplicationCapability.completionPercentage || 0}
          missingFields={quickApplicationCapability.missingFields}
          onCompleteProfile={() => handleProfileCompletionAction('complete')}
          onSkip={() => handleProfileCompletionAction('skip')}
          onDismiss={() => setShowProfileCompletionPrompt(false)}
        />
      )}

      {error && (
        <div style={{ marginBottom: '2rem' }}>
          <Alert variant='error' title='Error' onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {successMessage && (
        <div style={{ marginBottom: '2rem' }}>
          <Alert variant='success' title='Success' onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </div>
      )}

      <ApplicationProgress steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

      <ApplicationForm
        step={currentStep}
        data={applicationData}
        pet={pet}
        onStepComplete={handleStepComplete}
        onStepBack={handleStepBack}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isUpdate={false}
      />
    </Container>
  );
};
