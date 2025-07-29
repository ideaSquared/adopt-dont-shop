import { ApplicationForm, ApplicationProgress, PetSummary } from '@/components/application';
import { useAuth } from '@/contexts/AuthContext';
import { useStatsig } from '@/hooks/useStatsig';
import { applicationService, petService } from '@/services';
import { Application, ApplicationData, Pet } from '@/services';
import { Alert, Button, Spinner } from '@adopt-dont-shop/components';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;

  h1 {
    font-size: 2.5rem;
    color: ${props => props.theme.text.primary};
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text.secondary};
  }

  @media (max-width: 768px) {
    margin-bottom: 2rem;

    h1 {
      font-size: 2rem;
    }
  }
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const MainContent = styled.div`
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 12px;
  padding: 2rem;
`;

const Sidebar = styled.div`
  @media (max-width: 1024px) {
    order: -1;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const steps = [
  { id: 1, title: 'Basic Information', description: 'Tell us about yourself' },
  { id: 2, title: 'Living Situation', description: 'Your home environment' },
  { id: 3, title: 'Pet Experience', description: 'Your experience with pets' },
  { id: 4, title: 'References', description: 'Veterinary and personal references' },
  { id: 5, title: 'Review & Submit', description: 'Review your application' },
];

export const ApplicationPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { logEvent } = useStatsig();

  const [pet, setPet] = useState<Pet | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<Partial<ApplicationData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);

  useEffect(() => {
    // Debug logging in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('ApplicationPage useEffect triggered:', {
        authLoading,
        isAuthenticated,
        user: user?.email,
        petId,
        timestamp: new Date().toISOString(),
      });
    }

    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('ApplicationPage: Auth still loading, waiting...');
      }
      return;
    }

    if (!isAuthenticated) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('ApplicationPage: Not authenticated, redirecting to login');
      }
      navigate(`/login?redirect=/apply/${petId}`);
      return;
    }

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('ApplicationPage: Authentication passed, loading data...');
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        if (!petId) throw new Error('Pet ID is required');

        // Load pet data
        const petData = await petService.getPetById(petId);
        setPet(petData);

        // Log application page view
        logEvent('application_page_viewed', 1, {
          pet_id: petId,
          pet_name: petData.name || 'unknown',
          pet_type: petData.type || 'unknown',
          user_authenticated: isAuthenticated.toString(),
        });

        // Check for existing application
        try {
          const existing = await applicationService.getApplicationByPetId(petId);
          if (existing) {
            setExistingApplication(existing);
            setApplicationData(existing);
          }
        } catch (error) {
          // No existing application found, continue with new application
        }

        // Initialize application data with user info
        if (user) {
          setApplicationData(prev => ({
            ...prev,
            petId,
            userId: user.userId,
            personalInfo: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone || '',
              address: user.location?.address || '',
              city: user.location?.city || '',
              state: user.location?.state || '',
              zipCode: user.location?.zipCode || '',
            },
          }));
        }
      } catch (error) {
        console.error('Failed to load application data:', error);
        setError('Failed to load pet information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [petId, isAuthenticated, navigate, user, authLoading, logEvent]);

  const handleStepComplete = (stepData: Partial<ApplicationData>) => {
    setApplicationData(prev => ({ ...prev, ...stepData }));
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!pet || !user || !applicationData.personalInfo) {
        throw new Error('Application data is incomplete');
      }

      // Log application submission attempt
      logEvent('application_submission_attempted', 1, {
        pet_id: pet.pet_id.toString(),
        pet_name: pet.name || 'unknown',
        pet_type: pet.type || 'unknown',
        rescue_id: pet.rescue_id?.toString() || 'unknown',
        is_update: existingApplication ? 'true' : 'false',
        user_authenticated: isAuthenticated.toString(),
      });

      const submissionData: ApplicationData = {
        ...(applicationData as ApplicationData),
        petId: pet.pet_id,
        userId: user.userId,
        rescueId: pet.rescue_id,
      };

      let result;
      if (existingApplication) {
        result = await applicationService.updateApplication(existingApplication.id, submissionData);
      } else {
        result = await applicationService.submitApplication(submissionData);
      }

      // Log successful application submission
      logEvent('application_submission_successful', 1, {
        pet_id: pet.pet_id.toString(),
        pet_name: pet.name || 'unknown',
        application_id: result.id.toString(),
        rescue_id: pet.rescue_id?.toString() || 'unknown',
        is_update: existingApplication ? 'true' : 'false',
        user_authenticated: isAuthenticated.toString(),
      });

      // Navigate to success page or application tracking
      navigate(`/applications/${result.id}`, {
        state: {
          message: existingApplication
            ? 'Application updated successfully!'
            : 'Application submitted successfully!',
        },
      });
    } catch (error) {
      console.error('Failed to submit application:', error);

      // Log application submission error
      if (pet) {
        logEvent('application_submission_error', 1, {
          pet_id: pet.pet_id.toString(),
          pet_name: pet.name || 'unknown',
          rescue_id: pet.rescue_id?.toString() || 'unknown',
          error_message: error instanceof Error ? error.message : 'unknown_error',
          is_update: existingApplication ? 'true' : 'false',
          user_authenticated: isAuthenticated.toString(),
        });
      }

      setError('Failed to submit application. Please try again.');
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
        <h1>{existingApplication ? 'Update Application' : 'Adoption Application'}</h1>
        <p>
          {existingApplication
            ? 'Update your application for this special pet'
            : 'Complete your application to adopt this special pet'}
        </p>
      </Header>

      <Content>
        <MainContent>
          {error && (
            <div style={{ marginBottom: '2rem' }}>
              <Alert variant='error' title='Error' onClose={() => setError(null)}>
                {error}
              </Alert>
            </div>
          )}

          <ApplicationProgress
            steps={steps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />

          <ApplicationForm
            step={currentStep}
            data={applicationData}
            pet={pet}
            onStepComplete={handleStepComplete}
            onStepBack={handleStepBack}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isUpdate={!!existingApplication}
          />
        </MainContent>

        <Sidebar>{pet && <PetSummary pet={pet} />}</Sidebar>
      </Content>
    </Container>
  );
};

export default ApplicationPage;
