import React, { useEffect, useRef, useState } from 'react';
import { Question, QuestionField } from './QuestionField';
import { shouldShowQuestion } from './questionConditions';
import * as styles from './QuestionCategoryStep.css';

type QuestionCategoryStepProps = {
  stepId: string;
  title: string;
  description?: string;
  questions: Question[];
  answers: Record<string, unknown>;
  prefilledKeys?: ReadonlySet<string>;
  onComplete: (answers: Record<string, unknown>) => void;
  onChange: (answers: Record<string, unknown>) => void;
};

const hasAnswer = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
};

const buildRevealAnnouncement = (revealedQuestions: Question[]): string => {
  if (revealedQuestions.length === 0) {
    return '';
  }
  if (revealedQuestions.length === 1) {
    return `Additional question revealed: ${revealedQuestions[0].questionText}`;
  }
  return `${revealedQuestions.length} additional questions revealed.`;
};

export const QuestionCategoryStep: React.FC<QuestionCategoryStepProps> = ({
  stepId,
  title,
  description,
  questions,
  answers,
  prefilledKeys,
  onComplete,
  onChange,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingFieldLabels, setMissingFieldLabels] = useState<readonly string[]>([]);
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(() => new Set());
  const [revealAnnouncement, setRevealAnnouncement] = useState<string>('');
  const previousVisibleKeys = useRef<Set<string> | null>(null);

  const visibleQuestions = questions.filter(q => shouldShowQuestion(q, answers));

  useEffect(() => {
    const currentKeys = new Set(visibleQuestions.map(q => q.questionKey));
    const previous = previousVisibleKeys.current;
    // Only announce on subsequent renders, not the initial mount.
    if (previous) {
      const newlyVisible = visibleQuestions.filter(q => !previous.has(q.questionKey));
      if (newlyVisible.length > 0) {
        setRevealAnnouncement(buildRevealAnnouncement(newlyVisible));
      }
    }
    previousVisibleKeys.current = currentKeys;
  }, [visibleQuestions]);

  const handleFieldChange = (questionKey: string, value: unknown) => {
    const updated = { ...answers, [questionKey]: value };
    if (errors[questionKey]) {
      setErrors(prev => ({ ...prev, [questionKey]: '' }));
    }
    setTouchedKeys(prev => {
      if (prev.has(questionKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(questionKey);
      return next;
    });
    onChange(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const missing: string[] = [];
    for (const q of questions) {
      if (!shouldShowQuestion(q, answers)) {
        continue;
      }
      if (q.isRequired && !hasAnswer(answers[q.questionKey])) {
        newErrors[q.questionKey] = "Don't forget this one 👀";
        missing.push(q.questionText);
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setMissingFieldLabels(missing);
      const firstKey = Object.keys(newErrors)[0];
      const wrapper = document.getElementById(`field-${firstKey}`);
      wrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = wrapper?.querySelector<HTMLElement>(
        'input, select, textarea, [role="radio"], [role="button"], button'
      );
      focusable?.focus();
      return;
    }

    setMissingFieldLabels([]);
    onComplete(answers);
  };

  const hasRequired = visibleQuestions.some(q => q.isRequired);

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>{title}</h2>
      {description && <p className={styles.stepDescription}>{description}</p>}
      {hasRequired && <p className={styles.requiredNote}>Fields marked with * are required.</p>}

      {missingFieldLabels.length > 0 && (
        <div role='alert' className={styles.errorSummary}>
          <p>
            {missingFieldLabels.length} required{' '}
            {missingFieldLabels.length === 1 ? 'field is' : 'fields are'} missing:
          </p>
          <ul>
            {missingFieldLabels.map(label => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </div>
      )}

      <form id={`step-${stepId}-form`} onSubmit={handleSubmit} noValidate>
        <div aria-live='polite' aria-relevant='additions'>
          <span className={styles.visuallyHidden}>{revealAnnouncement}</span>
          {visibleQuestions.map(question => {
            const isPrefilled =
              !touchedKeys.has(question.questionKey) &&
              (prefilledKeys?.has(question.questionKey) ?? false);
            return (
              <div id={`field-${question.questionKey}`} key={question.questionId}>
                <QuestionField
                  question={question}
                  value={answers[question.questionKey]}
                  onChange={value => handleFieldChange(question.questionKey, value)}
                  error={errors[question.questionKey]}
                  isPrefilled={isPrefilled}
                />
              </div>
            );
          })}
        </div>
      </form>
    </div>
  );
};
