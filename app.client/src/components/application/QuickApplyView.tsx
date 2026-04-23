import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import type { Pet } from '@/services';
import type { SaveStatus } from '@/hooks/use-auto-save';
import { PetHeroCard } from './PetHeroCard';
import { PreFilledSectionCard } from './PreFilledSectionCard';
import { QuestionField, type Question } from './QuestionField';

type SectionDef = {
  id: string;
  icon: string;
  title: string;
  categories: readonly string[];
};

const SECTIONS: readonly SectionDef[] = [
  { id: 'about_you', icon: '👤', title: 'About you', categories: ['personal_information'] },
  { id: 'your_home', icon: '🏠', title: 'Your home', categories: ['household_information'] },
  {
    id: 'your_experience',
    icon: '🐾',
    title: 'Your pet experience',
    categories: ['pet_ownership_experience', 'lifestyle_compatibility', 'pet_care_commitment'],
  },
  { id: 'references', icon: '📇', title: 'References', categories: ['references_verification'] },
];

const ACKNOWLEDGMENTS_CATEGORY = 'final_acknowledgments';

type Props = {
  pet: Pet;
  firstName?: string;
  questions: Question[];
  answers: Record<string, unknown>;
  prefilledKeys: ReadonlySet<string>;
  onChange: (answers: Record<string, unknown>) => void;
  onSubmit: () => void;
  onSwitchToGuided: () => void;
  isSubmitting: boolean;
  saveStatus: SaveStatus;
};

const Container = styled.div`
  max-width: 720px;
  margin: 0 auto;
`;

const FinalStep = styled.section`
  margin-top: 2rem;
  padding: 1.5rem;
  background: ${props => props.theme.background.primary};
  border: 1px solid ${props => props.theme.border.color.primary};
  border-radius: 0.75rem;
`;

const FinalTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  color: ${props => props.theme.text.primary};
`;

const FinalDescription = styled.p`
  margin: 0 0 1.25rem 0;
  font-size: 0.9375rem;
  color: ${props => props.theme.text.secondary};
`;

const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

const SwitchLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.primary[600]};
  cursor: pointer;
  text-decoration: underline;
  text-align: left;

  &:hover {
    color: ${props => props.theme.colors.primary[700]};
  }
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

const byDisplayOrder = (a: Question, b: Question) => a.displayOrder - b.displayOrder;

export const QuickApplyView: React.FC<Props> = ({
  pet,
  firstName,
  questions,
  answers,
  prefilledKeys,
  onChange,
  onSubmit,
  onSwitchToGuided,
  isSubmitting,
  saveStatus,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ackTouchedKeys, setAckTouchedKeys] = useState<Set<string>>(() => new Set());

  const { byCategory, acknowledgmentQuestions, extraQuestions } = useMemo(() => {
    const byCat = new Map<string, Question[]>();
    for (const q of questions) {
      const existing = byCat.get(q.category);
      if (existing) {
        existing.push(q);
      } else {
        byCat.set(q.category, [q]);
      }
    }
    for (const qs of byCat.values()) {
      qs.sort(byDisplayOrder);
    }

    const handledCategories = new Set<string>([
      ...SECTIONS.flatMap(s => s.categories),
      ACKNOWLEDGMENTS_CATEGORY,
    ]);
    const extras: Question[] = [];
    for (const [cat, qs] of byCat) {
      if (!handledCategories.has(cat)) {
        extras.push(...qs);
      }
    }

    return {
      byCategory: byCat,
      acknowledgmentQuestions: (byCat.get(ACKNOWLEDGMENTS_CATEGORY) ?? []).sort(byDisplayOrder),
      extraQuestions: extras,
    };
  }, [questions]);

  const greeting = firstName ? `Welcome back, ${firstName}! 👋` : 'Welcome back! 👋';

  const handleAckChange = (questionKey: string, value: unknown) => {
    setAckTouchedKeys(prev => {
      if (prev.has(questionKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(questionKey);
      return next;
    });
    onChange({ ...answers, [questionKey]: value });
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = () => {
    const missing = questions.filter(
      q => q.isEnabled && q.isRequired && !hasAnswer(answers[q.questionKey])
    );
    if (missing.length > 0) {
      setValidationError(
        `A few required answers are missing — have a look at ${missing
          .slice(0, 3)
          .map(q => q.questionText)
          .join(', ')}${missing.length > 3 ? ', and a couple more' : ''}.`
      );
      return;
    }
    onSubmit();
  };

  return (
    <Container>
      <PetHeroCard
        pet={pet}
        heading={`Apply to adopt ${pet.name} 🐾`}
        subheading={`${greeting} We've got most of your details from last time. Check them over and tell us why ${pet.name}'s the one.`}
      />

      {validationError && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert variant='warning' title='Almost there' onClose={() => setValidationError(null)}>
            {validationError}
          </Alert>
        </div>
      )}

      {SECTIONS.map(section => {
        const sectionQuestions = section.categories
          .flatMap(cat => byCategory.get(cat) ?? [])
          .sort(byDisplayOrder);
        if (sectionQuestions.length === 0) {
          return null;
        }
        return (
          <PreFilledSectionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            questions={sectionQuestions}
            answers={answers}
            prefilledKeys={prefilledKeys}
            onChange={onChange}
          />
        );
      })}

      {extraQuestions.length > 0 && (
        <PreFilledSectionCard
          icon='🧩'
          title={`Extras from ${pet.rescue?.name ?? 'this rescue'}`}
          questions={extraQuestions}
          answers={answers}
          prefilledKeys={prefilledKeys}
          onChange={onChange}
          initiallyExpanded
        />
      )}

      <FinalStep>
        <FinalTitle>About {pet.name} ❤️</FinalTitle>
        <FinalDescription>
          Last bit! Just a few questions about {pet.name} and we&apos;re done.
        </FinalDescription>
        {acknowledgmentQuestions.map(question => {
          const isPrefilled =
            !ackTouchedKeys.has(question.questionKey) && prefilledKeys.has(question.questionKey);
          return (
            <QuestionField
              key={question.questionId}
              question={question}
              value={answers[question.questionKey]}
              onChange={value => handleAckChange(question.questionKey, value)}
              isPrefilled={isPrefilled}
            />
          );
        })}
      </FinalStep>

      <Actions>
        <SwitchLink type='button' onClick={onSwitchToGuided}>
          Prefer to go step-by-step? Switch to the guided form →
        </SwitchLink>
        <Button
          variant='primary'
          onClick={handleSubmit}
          disabled={isSubmitting || saveStatus === 'saving'}
          isLoading={isSubmitting}
        >
          Send my application 💌
        </Button>
      </Actions>
    </Container>
  );
};
