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
import { applicationProfileService } from '@/services/applicationProfileService';
import {
  buildInitialAnswers,
  splitAnswersForPersistence,
} from '@/utils/applicationFieldMapping';
import type { ApplicationDefaults } from '@/types';

type MacroStepDef = {
  id: string;
  title: string;
  description: (petName?: string) => string;
  categories: readonly string[];
};

const MACRO_STEPS: readonly MacroStepDef[] = [
  {
    id: 'about_you',
    title: 'About you 👋',
    description: () => 'A few quick details so we know who you are.',
    categories: ['personal_information'],
  },
  {
    id: 'your_home',
    title: 'Your home 🏠',
    description: () => 'Tell us where your new companion would be living.',
    categories: ['household_information'],
  },
  {
    id: 'pet_experience',
    title: 'Your pet experience 🐾',
    description: () => "Your history with pets — good, messy, and everything in between.",
    categories: [
      'pet_ownership_experience',
      'lifestyle_compatibility',
      'pet_care_commitment',
      'references_verification',
    ],
  },
  {
    id: 'this_pet',
    title: 'About {petName} ❤️',
    description: petName =>
      `Last bit! Just a few questions about ${petName ?? 'this pet'} and we're done.`,
    categories: ['final_acknowledgments'],
  },
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

const CATEGORY_ORDER = [
  'personal_information',
  'household_information',
  'pet_ownership_experience',
  'lifestyle_compatibility',
  'pet_care_commitment',
  'references_verification',
  'final_acknowledgments',
];

const groupQuestionsByMacroStep = (
  questions: Question[],
  petName?: string
): CategoryGroup[] => {
  const byCategory = new Map<string, Question[]>();
  for (const q of questions) {
    const existing = byCategory.get(q.category);
    if (existing) {
      existing.push(q);
    } else {
      byCategory.set(q.category, [q]);
    }
  }
  for (const qs of byCategory.values()) {
    qs.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const usedCategories = new Set<string>();
  const groups: CategoryGroup[] = [];

  for (const step of MACRO_STEPS) {
    const stepQuestions: Question[] = [];
    for (const category of step.categories) {
      const catQuestions = byCategory.get(category);
      if (catQuestions) {
        stepQuestions.push(...catQuestions);
        usedCategories.add(category);
      }
    }
    if (stepQuestions.length === 0) continue;
    groups.push({
      category: step.id,
      title: step.title.replace('{petName}', petName ?? 'this pet'),
      description: step.description(petName),
      questions: stepQuestions,
    });
  }

  // Any categories the rescue has enabled questions in that we didn't already
  // slot into a macro-step become a final "extras" step before acknowledgments.
  const leftovers: Question[] = [];
  for (const category of CATEGORY_ORDER) {
    if (usedCategories.has(category)) continue;
    const catQuestions = byCategory.get(category);
    if (catQuestions) leftovers.push(...catQuestions);
  }
  for (const [category, catQuestions] of byCategory) {
    if (usedCategories.has(category)) continue;
    if (CATEGORY_ORDER.includes(category)) continue;
    leftovers.push(...catQuestions);
  }
  if (leftovers.length > 0) {
    // Insert just before the last macro-step (acknowledgments), since those
    // should always be the final thing the user sees.
    const extrasGroup: CategoryGroup = {
      category: 'extras',
      title: 'A few extras 🧩',
      description: 'A couple of additional questions from this rescue.',
      questions: leftovers,
    };
    const insertAt = Math.max(0, groups.length - 1);
    groups.splice(insertAt, 0, extrasGroup);
  }

  return groups;
};

export const ApplicationPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [pet, setPet] = useState<Pet | null>(null);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(() => new Set());
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

      const [questionsResponse, defaults] = await Promise.all([
        apiService.get<{ questions: Question[] }>(`/api/v1/rescues/${petData.rescue_id}/questions`),
        applicationProfileService.getApplicationDefaults().catch(() => null),
      ]);
      const enabledQuestions = questionsResponse.questions.filter((q: Question) => q.isEnabled);
      setCategories(groupQuestionsByMacroStep(enabledQuestions, petData.name));

      const prePop = buildInitialAnswers(enabledQuestions, {
        user: user ?? null,
        defaults: (defaults as ApplicationDefaults | null) ?? null,
        customAnswers: (defaults as ApplicationDefaults | null)?.customAnswers ?? null,
      });
      setAnswers(prePop.answers);
      setPrefilledKeys(prePop.prefilledKeys);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setError('Failed to load application information. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  }, [petId, navigate, user]);

  useEffect(() => {
    if (!loadedDraft) {
      return;
    }
    setAnswers(loadedDraft.applicationData);
    setCurrentStep(loadedDraft.currentStep);
    // The draft contains the user's own edits, so "pre-filled" is no longer
    // an accurate label for any field — clear the badge state.
    setPrefilledKeys(new Set());
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

      // Fire-and-forget: persist the reusable parts of this application back
      // into the user's applicationDefaults so the next application pre-fills.
      // A failure here shouldn't block the successful submission.
      const allQuestions = categories.flatMap(c => c.questions);
      const { defaultsUpdate, customAnswers } = splitAnswersForPersistence(answers, allQuestions);
      const hasStructuredUpdate = Object.keys(defaultsUpdate).length > 0;
      const hasCustomUpdate = Object.keys(customAnswers).length > 0;
      if (hasStructuredUpdate || hasCustomUpdate) {
        applicationProfileService
          .updateApplicationDefaults({
            ...defaultsUpdate,
            ...(hasCustomUpdate ? { customAnswers } : {}),
          })
          .catch(err => {
            // Non-fatal — log and move on.
            console.warn('Failed to persist application defaults:', err);
          });
      }

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
      title: 'Review & send 💌',
      description: 'One quick look before we send it off.',
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
          if (step < currentStep) {
            setCurrentStep(step);
          }
        }}
      />

      {categories.length > 0 ? (
        <ApplicationForm
          categories={categories}
          currentStep={currentStep}
          answers={answers}
          pet={pet}
          prefilledKeys={prefilledKeys}
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
