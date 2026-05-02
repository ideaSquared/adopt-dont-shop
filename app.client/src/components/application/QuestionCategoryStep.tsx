import React, { useState } from 'react';
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
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(() => new Set());

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
    for (const q of questions) {
      if (!shouldShowQuestion(q, answers)) {
        continue;
      }
      if (q.isRequired && !hasAnswer(answers[q.questionKey])) {
        newErrors[q.questionKey] = "Don't forget this one 👀";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      document
        .getElementById(`field-${firstKey}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    onComplete(answers);
  };

  const visibleQuestions = questions.filter(q => shouldShowQuestion(q, answers));
  const hasRequired = visibleQuestions.some(q => q.isRequired);

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>{title}</h2>
      {description && <p className={styles.stepDescription}>{description}</p>}
      {hasRequired && <p className={styles.requiredNote}>Fields marked with * are required.</p>}

      <form id={`step-${stepId}-form`} onSubmit={handleSubmit} noValidate>
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
      </form>
    </div>
  );
};
