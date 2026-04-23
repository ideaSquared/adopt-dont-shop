import React, { useState } from 'react';
import styled from 'styled-components';
import { Question, QuestionField } from './QuestionField';

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

const StepContainer = styled.div`
  max-width: 640px;
`;

const StepTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin: 0 0 0.5rem 0;
`;

const StepDescription = styled.p`
  color: ${props => props.theme.text.secondary};
  margin: 0 0 2rem 0;
`;

const RequiredNote = styled.p`
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
  margin: 0 0 1.5rem 0;
`;

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
      if (q.isRequired && !hasAnswer(answers[q.questionKey])) {
        newErrors[q.questionKey] = 'This field is required';
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

  const hasRequired = questions.some(q => q.isRequired);

  return (
    <StepContainer>
      <StepTitle>{title}</StepTitle>
      {description && <StepDescription>{description}</StepDescription>}
      {hasRequired && <RequiredNote>Fields marked with * are required.</RequiredNote>}

      <form id={`step-${stepId}-form`} onSubmit={handleSubmit} noValidate>
        {questions.map(question => {
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
    </StepContainer>
  );
};
