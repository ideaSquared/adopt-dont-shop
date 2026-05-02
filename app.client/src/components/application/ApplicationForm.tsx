import React from 'react';
import clsx from 'clsx';
import { Button } from '@adopt-dont-shop/lib.components';
import type { SaveStatus } from '@/hooks/use-auto-save';
import type { Pet } from '@/services';
import { QuestionCategoryStep } from './QuestionCategoryStep';
import type { Question } from './QuestionField';
import { formatHouseholdMembers, parseHouseholdMembers } from './HouseholdMembersField';
import { formatCurrentPets, parseCurrentPets } from './CurrentPetsField';
import { shouldShowQuestion } from './questionConditions';
import * as styles from './ApplicationForm.css';

export type CategoryGroup = {
  category: string;
  title: string;
  description?: string;
  questions: Question[];
};

type ApplicationFormProps = {
  categories: CategoryGroup[];
  currentStep: number;
  answers: Record<string, unknown>;
  pet: Pet | null;
  prefilledKeys?: ReadonlySet<string>;
  onStepComplete: (answers: Record<string, unknown>) => void;
  onStepBack: () => void;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onChange: (answers: Record<string, unknown>) => void;
  isSubmitting: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
};

const formatLastSaved = (date: Date): string => {
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) {
    return 'just now';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
};

const SaveStatusMessage: React.FC<{ status: SaveStatus; lastSaved: Date | null }> = ({
  status,
  lastSaved,
}) => {
  if (status === 'saving') {
    return (
      <span className={clsx(styles.saveStatusText, styles.saveStatusVariants.saving)}>
        Saving draft…
      </span>
    );
  }
  if (status === 'saved' && lastSaved) {
    return (
      <span className={clsx(styles.saveStatusText, styles.saveStatusVariants.saved)}>
        Draft saved {formatLastSaved(lastSaved)}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className={clsx(styles.saveStatusText, styles.saveStatusVariants.error)}>
        Failed to save draft
      </span>
    );
  }
  return null;
};

const formatAnswerValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  if (Array.isArray(value)) {
    const householdMembers = parseHouseholdMembers(value);
    if (householdMembers.length > 0) {
      return formatHouseholdMembers(householdMembers);
    }
    const currentPets = parseCurrentPets(value);
    if (currentPets.length > 0) {
      return formatCurrentPets(currentPets);
    }
    return value.join(', ');
  }
  return String(value);
};

const ReviewStep: React.FC<{ categories: CategoryGroup[]; answers: Record<string, unknown> }> = ({
  categories,
  answers,
}) => (
  <div className={styles.reviewContainer}>
    <h2 className={styles.reviewTitle}>One last look 👀</h2>
    <p className={styles.reviewDescription}>
      Everything checked? You can pop back to any section to tweak an answer before we send it off.
    </p>
    {categories.map(({ category, title, questions }) => {
      const answeredQuestions = questions.filter(
        q =>
          shouldShowQuestion(q, answers) &&
          answers[q.questionKey] !== undefined &&
          answers[q.questionKey] !== ''
      );
      if (answeredQuestions.length === 0) {
        return null;
      }
      return (
        <div className={styles.reviewCategory} key={category}>
          <h3 className={styles.reviewCategoryTitle}>{title}</h3>
          {answeredQuestions.map(q => (
            <div className={styles.reviewItem} key={q.questionId}>
              <span className={styles.reviewLabel}>{q.questionText}</span>
              <span className={styles.reviewValue}>{formatAnswerValue(answers[q.questionKey])}</span>
            </div>
          ))}
        </div>
      );
    })}
  </div>
);

export const ApplicationForm: React.FC<ApplicationFormProps> = ({
  categories,
  currentStep,
  answers,
  pet: _pet,
  prefilledKeys,
  onStepComplete,
  onStepBack,
  onSubmit,
  onSaveDraft,
  onChange,
  isSubmitting,
  saveStatus,
  lastSaved,
}) => {
  const totalSteps = categories.length + 1;
  const isFirstStep = currentStep === 1;
  const isReviewStep = currentStep === totalSteps;

  const renderStep = () => {
    if (isReviewStep) {
      return <ReviewStep categories={categories} answers={answers} />;
    }

    const categoryGroup = categories[currentStep - 1];
    if (!categoryGroup) {
      return null;
    }

    return (
      <QuestionCategoryStep
        stepId={String(currentStep)}
        title={categoryGroup.title}
        description={categoryGroup.description}
        questions={categoryGroup.questions}
        answers={answers}
        prefilledKeys={prefilledKeys}
        onComplete={onStepComplete}
        onChange={onChange}
      />
    );
  };

  return (
    <div className={styles.formContainer}>
      {renderStep()}

      <div className={styles.navigationButtons}>
        <div>
          {!isFirstStep && (
            <Button variant='secondary' onClick={onStepBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
        </div>

        <div className={styles.buttonGroup}>
          <div className={styles.saveIndicator}>
            <SaveStatusMessage status={saveStatus} lastSaved={lastSaved} />
            <Button
              variant='ghost'
              onClick={onSaveDraft}
              disabled={isSubmitting || saveStatus === 'saving'}
              aria-label='Save for later'
            >
              Save for later
            </Button>
          </div>

          {isReviewStep ? (
            <Button
              variant='primary'
              onClick={onSubmit}
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Send my application 💌
            </Button>
          ) : (
            <Button variant='primary' type='submit' form={`step-${currentStep}-form`}>
              Continue →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
