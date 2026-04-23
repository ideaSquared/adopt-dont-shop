import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Alert, Button, Spinner } from '@adopt-dont-shop/lib.components';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { ApplicationForm, ApplicationProgress } from '@/components/application';
import type { CategoryGroup } from '@/components/application/ApplicationForm';
import type { Question } from '@/components/application/QuestionField';
import { useAutoSave } from '@/hooks/use-auto-save';
import { petService, apiService, type Pet } from '@/services';

const CATEGORY_LABELS: Record<string, string> = {
  personal_information: 'Personal Information',
  household_information: 'Household Information',
  pet_ownership_experience: 'Pet Ownership Experience',
  lifestyle_compatibility: 'Lifestyle Compatibility',
  pet_care_commitment: 'Pet Care Commitment',
  references_verification: 'References & Verification',
  final_acknowledgments: 'Final Acknowledgments',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  personal_information: 'Tell us about your work schedule and availability.',
  household_information: 'Describe your home environment.',
  pet_ownership_experience: 'Share your experience with animals.',
  lifestyle_compatibility: 'Help us understand your daily routine.',
  pet_care_commitment: 'Show us you are prepared for the responsibility.',
  references_verification: 'Provide a reference who knows you well.',
  final_acknowledgments: 'Almost there — a few final questions.',
};

const CATEGORY_ORDER = [
  'personal_information',
  'household_information',
  'pet_ownership_experience',
  'lifestyle_compatibility',
  'pet_care_commitment',
  'references_verification',
  'final_acknowledgments',
];

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

const groupQuestionsByCategory = (questions: Question[]): CategoryGroup[] => {
  const grouped = new Map<string, Question[]>();
  for (const q of questions) {
    const existing = grouped.get(q.category);
    if (existing) {
      existing.push(q);
    } else {
      grouped.set(q.category, [q]);
    }
  }
  for (const qs of grouped.values()) {
    qs.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return CATEGORY_ORDER.filter(cat => grouped.has(cat)).map(cat => ({
    category: cat,
    title: CATEGORY_LABELS[cat] ?? cat,
    description: CATEGORY_DESCRIPTIONS[cat],
    questions: grouped.get(cat) ?? [],
  }));
};

export const ApplicationPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [pet, setPet] = useState<Pet | null>(null);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { saveStatus, lastSaved, scheduleSave, saveNow, clearDraft, loadedDraft } =
    useAutoSave<Record<string, unknown>>(petId);

  const currentStepRef = useRef(currentStep);
  currentStepRef.current = currentStep;

  const loadData = useCallback(async () => {
    if (!petId) {
      return;
    }
    try {
      setIsLoading(true);
      const petData = await petService.getPetById(petId);
      setPet(petData);

      // Check for an existing active application for this pet before showing the form
      const existing = await apiService.get<{
        data: { id: string; status: string }[];
      }>(`/api/v1/applications?petId=${encodeURIComponent(petId)}`);
      const active = existing.data.find(a => a.status !== 'withdrawn' && a.status !== 'rejected');
      if (active) {
        navigate(`/applications/${active.id}`, {
          state: { message: 'You already have an active application for this pet.' },
        });
        return;
      }

      const response = await apiService.get<{ questions: Question[] }>(
        `/api/v1/rescues/${petData.rescue_id}/questions`
      );
      const enabledQuestions = response.questions.filter((q: Question) => q.isEnabled);
      setCategories(groupQuestionsByCategory(enabledQuestions));
    } catch (err) {
      console.error('Failed to load application data:', err);
      setError('Failed to load application information. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  }, [petId, navigate]);

  useEffect(() => {
    if (!loadedDraft) {
      return;
    }
    setAnswers(loadedDraft.applicationData);
    setCurrentStep(loadedDraft.currentStep);
  }, [loadedDraft]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      navigate(`/login?redirect=/apply/${petId}`);
      return;
    }
    loadData();
  }, [petId, isAuthenticated, authLoading, navigate, loadData]);

  const handleChange = useCallback(
    (updated: Record<string, unknown>) => {
      setAnswers(updated);
      scheduleSave(updated, currentStepRef.current);
    },
    [scheduleSave]
  );

  const handleStepComplete = useCallback(
    (updatedAnswers: Record<string, unknown>) => {
      setAnswers(updatedAnswers);
      scheduleSave(updatedAnswers, currentStepRef.current);
      setCurrentStep(prev => prev + 1);
    },
    [scheduleSave]
  );

  const handleStepBack = useCallback(() => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = async () => {
    if (!pet) {
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await apiService.post<{ data: { applicationId: string } }>(
        '/api/v1/applications',
        {
          petId: pet.pet_id,
          answers,
        }
      );

      clearDraft();
      setSuccessMessage(
        'Application submitted successfully! You will be redirected to your application details shortly.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        navigate(`/applications/${result.data.applicationId}`, {
          state: { message: 'Application submitted successfully!' },
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to submit application:', err);
      const message = err instanceof Error ? err.message : null;
      setError(
        message?.includes('validation failed')
          ? `Some required fields are missing. Please review your answers and ensure all required fields are completed.`
          : (message ?? 'Failed to submit application. Please try again.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    ...categories.map((c, i) => ({
      id: i + 1,
      title: c.title,
      description: c.description ?? '',
    })),
    {
      id: categories.length + 1,
      title: 'Review & Submit',
      description: 'Review your application before submitting',
    },
  ];

  if (!isAuthenticated) {
    return null;
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
        {loadedDraft && (
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
            Your draft has been restored. Continue where you left off.
          </p>
        )}
      </Header>

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

      <ApplicationProgress
        steps={steps}
        currentStep={currentStep}
        onStepClick={step => {
          if (step < currentStep) setCurrentStep(step);
        }}
      />

      {categories.length > 0 ? (
        <ApplicationForm
          categories={categories}
          currentStep={currentStep}
          answers={answers}
          pet={pet}
          onStepComplete={handleStepComplete}
          onStepBack={handleStepBack}
          onSubmit={handleSubmit}
          onSaveDraft={saveNow}
          onChange={handleChange}
          isSubmitting={isSubmitting}
          saveStatus={saveStatus}
          lastSaved={lastSaved}
        />
      ) : (
        <Alert variant='error' title='No questions available'>
          This rescue has not configured any application questions. Please contact them directly.
        </Alert>
      )}
    </Container>
  );
};
