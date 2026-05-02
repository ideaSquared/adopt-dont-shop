import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Spinner } from '@adopt-dont-shop/lib.components';
import * as styles from './ApplicationPage.css';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { ApplicationForm, ApplicationProgress, QuickApplyView } from '@/components/application';
import type { CategoryGroup } from '@/components/application/ApplicationForm';
import type { Question } from '@/components/application/QuestionField';
import { useAutoSave } from '@/hooks/use-auto-save';
import { petService, apiService, type Pet } from '@/services';
import { applicationProfileService } from '@/services/applicationProfileService';
import {
  buildInitialAnswers,
  canQuickApply,
  splitAnswersForPersistence,
} from '@/utils/applicationFieldMapping';
import { applyConditionalDefaults } from '@/components/application/questionConditions';
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
    description: () => 'Your history with pets — good, messy, and everything in between.',
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

const CATEGORY_ORDER = [
  'personal_information',
  'household_information',
  'pet_ownership_experience',
  'lifestyle_compatibility',
  'pet_care_commitment',
  'references_verification',
  'final_acknowledgments',
];

const groupQuestionsByMacroStep = (questions: Question[], petName?: string): CategoryGroup[] => {
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
    if (stepQuestions.length === 0) {
      continue;
    }
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
    if (usedCategories.has(category)) {
      continue;
    }
    const catQuestions = byCategory.get(category);
    if (catQuestions) {
      leftovers.push(...catQuestions);
    }
  }
  for (const [category, catQuestions] of byCategory) {
    if (usedCategories.has(category)) {
      continue;
    }
    if (CATEGORY_ORDER.includes(category)) {
      continue;
    }
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
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<'quick' | 'guided'>('guided');
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
      setAllQuestions(enabledQuestions);
      setCategories(groupQuestionsByMacroStep(enabledQuestions, petData.name));

      const sources = {
        user: user ?? null,
        defaults: (defaults as ApplicationDefaults | null) ?? null,
        customAnswers: (defaults as ApplicationDefaults | null)?.customAnswers ?? null,
      };
      const prePop = buildInitialAnswers(enabledQuestions, sources);
      setAnswers(applyConditionalDefaults(prePop.answers));
      setPrefilledKeys(prePop.prefilledKeys);
      setViewMode(canQuickApply(enabledQuestions, sources) ? 'quick' : 'guided');
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
    // A restored draft implies mid-flow editing — use the guided view so the
    // saved `currentStep` makes sense, and drop the badge state since the
    // draft reflects the user's own typed answers.
    setPrefilledKeys(new Set());
    setViewMode('guided');
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
      const normalised = applyConditionalDefaults(updated);
      setAnswers(normalised);
      scheduleSave(normalised, currentStepRef.current);
    },
    [scheduleSave]
  );

  const handleStepComplete = useCallback(
    (updatedAnswers: Record<string, unknown>) => {
      const normalised = applyConditionalDefaults(updatedAnswers);
      setAnswers(normalised);
      scheduleSave(normalised, currentStepRef.current);
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
        `You're in! 🎉 We've sent your application to ${pet.name}'s rescue — taking you to your application details now.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        navigate(`/applications/${result.data.applicationId}`, {
          state: { message: `Application for ${pet.name} sent! 🐾` },
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to submit application:', err);
      const message = err instanceof Error ? err.message : null;
      setError(
        message?.includes('validation failed')
          ? `A few required answers are still missing — pop back through and double-check each section.`
          : (message ?? 'Something went wrong sending your application. Mind giving it another go?')
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
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size='lg' />
        </div>
      </div>
    );
  }

  if (error && !pet) {
    return (
      <div className={styles.container}>
        <Alert variant='error' title='Error'>
          {error}
        </Alert>
        <Button onClick={() => navigate('/search')} style={{ marginTop: '1rem' }}>
          Back to Search
        </Button>
      </div>
    );
  }

  const showQuickApply = viewMode === 'quick' && pet && allQuestions.length > 0;

  return (
    <div className={styles.container}>
      {!showQuickApply && (
        <div className={styles.header}>
          <h1>Let&apos;s get you adopting {pet?.name} 🐾</h1>
          <p>A few quick questions and {pet?.name}&apos;s rescue will take it from there.</p>
          {loadedDraft && (
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
              Welcome back — we picked up where you left off. ✨
            </p>
          )}
        </div>
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

      {showQuickApply ? (
        <QuickApplyView
          pet={pet}
          firstName={user?.firstName}
          questions={allQuestions}
          answers={answers}
          prefilledKeys={prefilledKeys}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onSwitchToGuided={() => setViewMode('guided')}
          isSubmitting={isSubmitting}
          saveStatus={saveStatus}
        />
      ) : (
        <>
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
              This rescue hasn&apos;t set up their application questions yet — try reaching out to
              them directly.
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
