import React, { useMemo, useState } from 'react';
import { Alert, Button } from '@adopt-dont-shop/lib.components';
import * as styles from './QuickApplyView.css';
import type { Pet } from '@/services';
import type { SaveStatus } from '@/hooks/use-auto-save';
import { PetHeroCard } from './PetHeroCard';
import { PreFilledSectionCard } from './PreFilledSectionCard';
import { QuestionField, type Question } from './QuestionField';
import { shouldShowQuestion } from './questionConditions';

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
      q =>
        q.isEnabled &&
        q.isRequired &&
        shouldShowQuestion(q, answers) &&
        !hasAnswer(answers[q.questionKey])
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
    <div className={styles.container}>
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

      <section className={styles.finalStep}>
        <h3 className={styles.finalTitle}>About {pet.name} ❤️</h3>
        <p className={styles.finalDescription}>
          Last bit! Just a few questions about {pet.name} and we&apos;re done.
        </p>
        {acknowledgmentQuestions
          .filter(q => shouldShowQuestion(q, answers))
          .map(question => {
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
      </section>

      <div className={styles.actions}>
        <button className={styles.switchLink} type='button' onClick={onSwitchToGuided}>
          Prefer to go step-by-step? Switch to the guided form →
        </button>
        <Button
          variant='primary'
          onClick={handleSubmit}
          disabled={isSubmitting || saveStatus === 'saving'}
          isLoading={isSubmitting}
        >
          Send my application 💌
        </Button>
      </div>
    </div>
  );
};
