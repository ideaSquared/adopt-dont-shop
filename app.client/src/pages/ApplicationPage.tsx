import { ApplicationForm, ApplicationProgress, PetSummary } from '@/components/application';
import { useAuth } from '@adopt-dont-shop/lib-auth';
import { useStatsig } from '@/hooks/useStatsig';
import { applicationService, petService } from '@/services';
import { Application, ApplicationData, Pet } from '@/services';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ApplicationForm,
  ApplicationProgress,
  ProfileCompletionPrompt,
  QuickApplicationPrompt,
} from '../components/application';
import { useAuth } from '../contexts/AuthContext';
import { applicationProfileService } from '../services/applicationProfileService';
import { applicationService } from '../services/applicationService';
import { petService } from '../services/petService';
import {
  ApplicationData,
  ApplicationDefaults,
  ApplicationPrePopulationData,
  Pet,
  QuickApplicationCapability,
} from '../types';

/**
 * Application Page
 * Features smart pre-population and quick application based on user profile
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
  { id: 5, title: 'Additional Information', description: 'Why do you want to adopt?' },
  { id: 6, title: 'Review & Submit', description: 'Review your application' },
];

export const ApplicationPage: React.FC = () => {
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
  const [prePopulationData, setPrePopulationData] = useState<ApplicationPrePopulationData | null>(
    null
  );
  const [showQuickApplicationPrompt, setShowQuickApplicationPrompt] = useState(false);
  const [showProfileCompletionPrompt, setShowProfileCompletionPrompt] = useState(false);
  const [usePrePopulation] = useState(true);

  const populateFormWithData = useCallback(
    (data: ApplicationPrePopulationData) => {
      const populatedData: Partial<ApplicationData> = {
        petId: petId!,
        userId: user!.userId,
        personalInfo: {
          firstName: data.defaults.personalInfo?.firstName || user!.firstName,
          lastName: data.defaults.personalInfo?.lastName || user!.lastName,
          email: data.defaults.personalInfo?.email || user!.email,
          phone: data.defaults.personalInfo?.phone || user!.phoneNumber || '',
          address: data.defaults.personalInfo?.address || user!.addressLine1 || '',
          city: data.defaults.personalInfo?.city || user!.city || '',
          county: data.defaults.personalInfo?.county || '', // County is specific to the application, not stored in user profile
          postcode: data.defaults.personalInfo?.postcode || user!.postalCode || '',
          country: data.defaults.personalInfo?.country || user!.country || 'United Kingdom',
          dateOfBirth: data.defaults.personalInfo?.dateOfBirth || '',
          occupation: data.defaults.personalInfo?.occupation || '',
        },
        // Use type assertion for partial data with required fields
        livingsituation: {
          housingType: data.defaults.livingSituation?.housingType || 'apartment',
          isOwned: data.defaults.livingSituation?.isOwned || false,
          hasYard: data.defaults.livingSituation?.hasYard || false,
          ...data.defaults.livingSituation,
        } as ApplicationData['livingsituation'],
        petExperience: {
          hasPetsCurrently: data.defaults.petExperience?.hasPetsCurrently || false,
          experienceLevel: data.defaults.petExperience?.experienceLevel || 'beginner',
          willingToTrain: data.defaults.petExperience?.willingToTrain || true,
          hoursAloneDaily: data.defaults.petExperience?.hoursAloneDaily || 0,
          exercisePlans: data.defaults.petExperience?.exercisePlans || '',
          ...data.defaults.petExperience,
        } as ApplicationData['petExperience'],
        references: {
          personal: data.defaults.references?.personal || [],
          ...data.defaults.references,
        } as ApplicationData['references'],
      };

      setApplicationData(populatedData);

      // Note: lastSavedStep is not part of ApplicationDefaults,
      // step progression will be handled by the application flow
    },
    [petId, user]
  );

  const populateFormWithDefaults = useCallback(
    (defaults: ApplicationDefaults) => {
      const populatedData: Partial<ApplicationData> = {
        petId: petId!,
        userId: user!.userId,
        personalInfo: {
          firstName: defaults.personalInfo?.firstName || user!.firstName,
          lastName: defaults.personalInfo?.lastName || user!.lastName,
          email: defaults.personalInfo?.email || user!.email,
          phone: defaults.personalInfo?.phone || user!.phoneNumber || '',
          address: defaults.personalInfo?.address || user!.addressLine1 || '',
          city: defaults.personalInfo?.city || user!.city || '',
          county: defaults.personalInfo?.county || '',
          postcode: defaults.personalInfo?.postcode || user!.postalCode || '',
          country: defaults.personalInfo?.country || user!.country || 'United Kingdom',
          dateOfBirth: defaults.personalInfo?.dateOfBirth || '',
          occupation: defaults.personalInfo?.occupation || '',
        },
        livingsituation: {
          housingType: defaults.livingSituation?.housingType || 'apartment',
          isOwned: defaults.livingSituation?.isOwned || false,
          hasYard: defaults.livingSituation?.hasYard || false,
          ...defaults.livingSituation,
        } as ApplicationData['livingsituation'],
        petExperience: {
          hasPetsCurrently: defaults.petExperience?.hasPetsCurrently || false,
          experienceLevel: defaults.petExperience?.experienceLevel || 'beginner',
          willingToTrain: defaults.petExperience?.willingToTrain || true,
          hoursAloneDaily: defaults.petExperience?.hoursAloneDaily || 0,
          exercisePlans: defaults.petExperience?.exercisePlans || '',
          ...defaults.petExperience,
        } as ApplicationData['petExperience'],
        references: {
          personal: defaults.references?.personal || [],
          ...defaults.references,
        } as ApplicationData['references'],
      };

      setApplicationData(populatedData);
    },
    [petId, user]
  );

  const loadApplicationData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!petId) throw new Error('Pet ID is required');

        // Load pet data
        const petData = await petService.getPetById(petId);
        setPet(petData);

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

      if (prePopulationData?.defaults) {
        populateFormWithDefaults(prePopulationData.defaults);
        // Jump to additional info step so user can add personal motivation
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

  const handleProfileCompletionAction = async (action: 'complete' | 'skip') => {
    setShowProfileCompletionPrompt(false);

    if (action === 'complete') {
      // Navigate to profile completion page
      navigate('/profile/setup?returnTo=' + encodeURIComponent(`/apply/${petId}`));
    }
    // If skip, continue with regular form
  };

  const handleStepComplete = async (stepData: Partial<ApplicationData>) => {
    // Phase 1: Auto-save progress
    try {
      const updatedData = { ...applicationData, ...stepData };
      setApplicationData(updatedData);

      // Auto-save progress (if enabled in user preferences)
      // await applicationProgressService.saveProgress({
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
      console.error('Failed to save progress:', error);
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
        additional_info: applicationData.additionalInfo || {},
      };

      const submissionData = {
        pet_id: pet.pet_id,
        answers,
        ...(references.length > 0 && { references }),
        priority: 'normal' as const,
      };

      const result = await applicationService.submitApplication(submissionData);

      // Phase 1: Mark progress as completed
      // await applicationProgressService.completeProgress(petId!);

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
        {prePopulationData && (
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
            Form data has been pre-populated from your profile
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
