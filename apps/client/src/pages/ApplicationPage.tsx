import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Button,
  ErrorState,
  PageHeader,
  Spinner,
  toast,
} from '@adopt-dont-shop/lib.components';
import * as styles from './ApplicationPage.css';
import { useAuth } from '@adopt-dont-shop/lib.auth';
import { ApplicationForm, ApplicationProgress, QuickApplyView } from '@/components/application';
import type { CategoryGroup } from '@/components/application/ApplicationForm';
import { DraftRestoreBanner } from '@/components/application/DraftRestoreBanner';
import { findActiveApplicationForPet } from '@/components/application/active-application';
import type { Question } from '@/components/application/QuestionField';
import { SubmissionSuccess } from '@/components/application/SubmissionSuccess';
// Backend-synced draft replaces the legacy localStorage-backed useAutoSave —
// drafts are persisted via PUT /api/v1/applications/drafts/:petId so the user
// can resume on any device.
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import { petService, apiService } from '@/services';
import { applicationProfileService } from '@/services/applicationProfileService';
import {
  buildInitialAnswers,
  canQuickApply,
  splitAnswersForPersistence,
} from '@/utils/applicationFieldMapping';
import {
  applyConditionalDefaults,
  shouldShowQuestion,
} from '@/components/application/questionConditions';
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
      `Last bit — a few questions about ${petName ?? 'this pet'} and we're done.`,
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

const hasAnswer = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

const findMissingRequiredLabels = (
  questions: Question[],
  answers: Record<string, unknown>
): string[] =>
  questions
    .filter(
      q => q.isRequired && shouldShowQuestion(q, answers) && !hasAnswer(answers[q.questionKey])
    )
    .map(q => q.questionText);

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

type ApplicationBootstrap =
  | { kind: 'existing'; applicationId: string }
  | {
      kind: 'ready';
      pet: Awaited<ReturnType<typeof petService.getPetById>>;
      questions: Question[];
      defaults: ApplicationDefaults | null;
    };

const isReadyBootstrap = (
  value: ApplicationBootstrap | undefined
): value is Extract<ApplicationBootstrap, { kind: 'ready' }> => value?.kind === 'ready';

const loadApplicationBootstrap = async (petId: string): Promise<ApplicationBootstrap> => {
  const pet = await petService.getPetById(petId);

  // Check for an existing active application for this pet before showing the
  // form. The list has no pet filter server-side, so fetch the largest page.
  const existing = await apiService.get<{
    data: { id: string; petId: string; status: string }[];
  }>(`/api/v1/applications?petId=${encodeURIComponent(petId)}&limit=100`);
  const active = findActiveApplicationForPet(existing.data, petId);
  if (active) {
    return { kind: 'existing', applicationId: active.id };
  }

  const [questionsResponse, defaults] = await Promise.all([
    apiService.get<{ data: Question[] }>(`/api/v1/rescues/${pet.rescue_id}/questions`),
    applicationProfileService.getApplicationDefaults().catch(() => null),
  ]);
  return {
    kind: 'ready',
    pet,
    questions: questionsResponse.data.filter((q: Question) => q.isEnabled),
    // The service returns its own defaults shape; narrowed once here.
    defaults: (defaults as ApplicationDefaults | null) ?? null,
  };
};

export const ApplicationPage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [prefilledKeys, setPrefilledKeys] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<'quick' | 'guided'>('guided');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Which bootstrap result the form state was last seeded from.
  const [seededFrom, setSeededFrom] = useState<ApplicationBootstrap | null>(null);
  // ADS-581: once the user submits, swap the form for a rich success view
  // that names the next steps (confirmation email, response window, links to
  // the dashboard) instead of a vague toast + 3s auto-redirect.
  const [submittedApplicationId, setSubmittedApplicationId] = useState<string | null>(null);
  // ADS-581: draft restore is now explicit — the user has to opt in to seeing
  // their previous answers, or opt out by starting over. `null` = undecided
  // (banner showing); 'resume'/'startOver' = decided and banner hidden.
  const [draftDecision, setDraftDecision] = useState<'resume' | 'startOver' | null>(null);
  // ADS-535: model hook rejects SUBMITTED rows without this flag set true.
  // Captured on the review step (or QuickApply submit area), not as a question.
  const [referencesConsented, setReferencesConsented] = useState(false);

  const { saveStatus, lastSaved, scheduleSave, saveNow, clearDraft, loadedDraft } =
    useApplicationDraft(petId);

  // Always reload on visit: the form state below is seeded from this result once.
  const bootstrapQuery = useQuery({
    queryKey: ['application-form', petId],
    queryFn: () => loadApplicationBootstrap(petId ?? ''),
    enabled: !!petId && isAuthenticated && !authLoading,
    staleTime: 0,
    gcTime: 0,
  });
  const bootstrap = bootstrapQuery.data;
  const ready = isReadyBootstrap(bootstrap) ? bootstrap : null;
  const pet = ready?.pet ?? null;
  const allQuestions = useMemo(() => ready?.questions ?? [], [ready]);
  const categories = useMemo<CategoryGroup[]>(
    () => groupQuestionsByMacroStep(allQuestions, pet?.name),
    [allQuestions, pet?.name]
  );
  const loadError = bootstrapQuery.isError
    ? 'Failed to load application information. Please try again.'
    : null;
  const error = submitError ?? loadError;
  const isLoading =
    authLoading || bootstrapQuery.isLoading || (!!bootstrap && seededFrom !== bootstrap);

  const handleResumeDraft = useCallback(() => {
    if (!loadedDraft) {
      return;
    }
    setAnswers(loadedDraft.answers);
    // Backend drafts only persist answers (not step) — last-write-wins means
    // every device sees the same answers, so the resumed user starts the
    // guided flow at step 1 with their answers already filled in.
    setCurrentStep(1);
    setPrefilledKeys(new Set());
    setViewMode('guided');
    setDraftDecision('resume');
  }, [loadedDraft]);

  const handleStartOver = useCallback(() => {
    void clearDraft();
    setDraftDecision('startOver');
  }, [clearDraft]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      navigate(`/login?redirect=/apply/${petId}`);
      return;
    }
  }, [petId, isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!bootstrap || seededFrom === bootstrap) {
      return;
    }
    if (bootstrap.kind === 'existing') {
      navigate(`/applications/${bootstrap.applicationId}`, {
        state: { message: 'You already have an active application for this pet.' },
      });
      setSeededFrom(bootstrap);
      return;
    }
    const sources = {
      user: user ?? null,
      defaults: bootstrap.defaults,
      customAnswers: bootstrap.defaults?.customAnswers ?? null,
    };
    const prePop = buildInitialAnswers(bootstrap.questions, sources);
    setAnswers(applyConditionalDefaults(prePop.answers));
    setPrefilledKeys(prePop.prefilledKeys);
    setViewMode(canQuickApply(bootstrap.questions, sources) ? 'quick' : 'guided');
    setSeededFrom(bootstrap);
  }, [bootstrap, seededFrom, navigate, user]);

  useEffect(() => {
    if (loadError) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [loadError]);

  const handleChange = useCallback(
    (updated: Record<string, unknown>) => {
      const normalised = applyConditionalDefaults(updated);
      setAnswers(normalised);
      scheduleSave(normalised);
    },
    [scheduleSave]
  );

  const handleStepComplete = useCallback(
    (updatedAnswers: Record<string, unknown>) => {
      const normalised = applyConditionalDefaults(updatedAnswers);
      setAnswers(normalised);
      scheduleSave(normalised);
      setCurrentStep(prev => prev + 1);
    },
    [scheduleSave]
  );

  const handleStepBack = useCallback(() => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  }, []);

  // Without this, moving between steps leaves the user mid-page on the
  // bottom of the previous form. Scroll back to the top so the new step's
  // heading is the first thing in view.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!pet) {
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // The gateway answers with the application view, whose id is `id`.
      const result = await apiService.post<{ data: { id: string } }>('/api/v1/applications', {
        petId: pet.pet_id,
        answers,
        referencesConsented,
      });

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

      void clearDraft();
      setSubmittedApplicationId(result.data.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // ADS-125: toast confirmation with a quick action to jump straight there.
      toast.success('Application submitted', {
        action: {
          label: 'View',
          onClick: () => navigate(`/applications/${result.data.id}`),
        },
      });
    } catch (err) {
      console.error('Failed to submit application:', err);
      const message = err instanceof Error ? err.message : null;
      if (message?.includes('validation failed')) {
        const missing = findMissingRequiredLabels(allQuestions, answers);
        const intro =
          missing.length > 0
            ? `${missing.length} required ${missing.length === 1 ? 'answer is' : 'answers are'} still missing: ${missing.join(', ')}.`
            : 'A few required answers are still missing.';
        setSubmitError(`${intro} Pop back through and double-check each section.`);
      } else {
        setSubmitError(
          message ?? 'Something went wrong sending your application. Mind giving it another go?'
        );
      }
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
        <ErrorState message={error} onRetry={() => void bootstrapQuery.refetch()} />
        <Button onClick={() => navigate('/search')} className={styles.backToSearchButton}>
          Back to Search
        </Button>
      </div>
    );
  }

  if (submittedApplicationId && pet) {
    return (
      <div className={styles.container}>
        <SubmissionSuccess
          petName={pet.name}
          rescueName={pet.rescue?.name ?? 'this rescue'}
          email={user?.email ?? ''}
          applicationId={submittedApplicationId}
          onViewApplication={() => navigate(`/applications/${submittedApplicationId}`)}
          onViewAllApplications={() => navigate('/applications')}
        />
      </div>
    );
  }

  const showQuickApply = viewMode === 'quick' && pet && allQuestions.length > 0;

  return (
    <div className={styles.container}>
      {!showQuickApply && (
        <PageHeader
          title={<>Let&apos;s get you adopting {pet?.name} 🐾</>}
          description={
            <>A few quick questions and {pet?.name}&apos;s rescue will take it from there.</>
          }
        />
      )}

      {loadedDraft && draftDecision === null && (
        <DraftRestoreBanner
          savedAt={new Date(loadedDraft.updatedAt)}
          onResume={handleResumeDraft}
          onStartOver={handleStartOver}
        />
      )}

      {error && (
        <div className={styles.sectionAlert}>
          <Alert variant='error' title='Error' onClose={() => setSubmitError(null)}>
            {error}
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
          referencesConsented={referencesConsented}
          onReferencesConsentChange={setReferencesConsented}
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
              referencesConsented={referencesConsented}
              onReferencesConsentChange={setReferencesConsented}
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
