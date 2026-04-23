import React from 'react';
import styled from 'styled-components';
import { Button } from '@adopt-dont-shop/lib.components';
import type { SaveStatus } from '@/hooks/use-auto-save';
import type { Pet } from '@/services';
import { QuestionCategoryStep } from './QuestionCategoryStep';
import type { Question } from './QuestionField';
import { formatHouseholdMembers, parseHouseholdMembers } from './HouseholdMembersField';
import { formatCurrentPets, parseCurrentPets } from './CurrentPetsField';
import { shouldShowQuestion } from './questionConditions';

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

const FormContainer = styled.div`
  min-height: 400px;
`;

const ReviewContainer = styled.div`
  max-width: 640px;
`;

const ReviewTitle = styled.h2`
  font-size: 1.5rem;
  color: ${props => props.theme.text.primary};
  margin: 0 0 0.5rem 0;
`;

const ReviewDescription = styled.p`
  color: ${props => props.theme.text.secondary};
  margin: 0 0 2rem 0;
`;

const ReviewCategory = styled.div`
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: ${props => props.theme.background.secondary};
  border-radius: 0.5rem;
`;

const ReviewCategoryTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.text.primary};
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.border.color.primary};
`;

const ReviewItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0;

  & + & {
    border-top: 1px solid ${props => props.theme.border.color.primary};
  }
`;

const ReviewLabel = styled.span`
  font-size: 0.8125rem;
  color: ${props => props.theme.text.secondary};
`;

const ReviewValue = styled.span`
  font-size: 0.9375rem;
  color: ${props => props.theme.text.primary};
`;

const NavigationButtons = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid ${props => props.theme.border.color.primary};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    width: 100%;
    button {
      flex: 1;
    }
  }
`;

const SaveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const SaveStatusText = styled.span<{ $status: SaveStatus }>`
  font-size: 0.8125rem;
  color: ${props => {
    switch (props.$status) {
      case 'saved':
        return props.theme.colors.semantic.success[600];
      case 'saving':
        return props.theme.colors.neutral[500];
      case 'error':
        return props.theme.colors.semantic.error[600];
      default:
        return props.theme.colors.neutral[400];
    }
  }};
`;

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
    return <SaveStatusText $status={status}>Saving draft…</SaveStatusText>;
  }
  if (status === 'saved' && lastSaved) {
    return (
      <SaveStatusText $status={status}>Draft saved {formatLastSaved(lastSaved)}</SaveStatusText>
    );
  }
  if (status === 'error') {
    return <SaveStatusText $status={status}>Failed to save draft</SaveStatusText>;
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
  <ReviewContainer>
    <ReviewTitle>One last look 👀</ReviewTitle>
    <ReviewDescription>
      Everything checked? You can pop back to any section to tweak an answer before we send it off.
    </ReviewDescription>
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
        <ReviewCategory key={category}>
          <ReviewCategoryTitle>{title}</ReviewCategoryTitle>
          {answeredQuestions.map(q => (
            <ReviewItem key={q.questionId}>
              <ReviewLabel>{q.questionText}</ReviewLabel>
              <ReviewValue>{formatAnswerValue(answers[q.questionKey])}</ReviewValue>
            </ReviewItem>
          ))}
        </ReviewCategory>
      );
    })}
  </ReviewContainer>
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
  const totalSteps = categories.length + 1; // categories + review
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
    <FormContainer>
      {renderStep()}

      <NavigationButtons>
        <div>
          {!isFirstStep && (
            <Button variant='secondary' onClick={onStepBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
        </div>

        <ButtonGroup>
          <SaveIndicator>
            <SaveStatusMessage status={saveStatus} lastSaved={lastSaved} />
            <Button
              variant='ghost'
              onClick={onSaveDraft}
              disabled={isSubmitting || saveStatus === 'saving'}
              aria-label='Save for later'
            >
              Save for later
            </Button>
          </SaveIndicator>

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
        </ButtonGroup>
      </NavigationButtons>
    </FormContainer>
  );
};
