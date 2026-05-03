import React, { useState } from 'react';
import { QuestionField, type Question } from './QuestionField';
import * as styles from './PreFilledSectionCard.css';
import { formatHouseholdMembers, parseHouseholdMembers } from './HouseholdMembersField';
import { formatCurrentPets, parseCurrentPets } from './CurrentPetsField';
import { shouldShowQuestion } from './questionConditions';

type Props = {
  icon: string;
  title: string;
  questions: Question[];
  answers: Record<string, unknown>;
  prefilledKeys: ReadonlySet<string>;
  onChange: (answers: Record<string, unknown>) => void;
  initiallyExpanded?: boolean;
  emptyHint?: string;
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

const formatAnswerPreview = (value: unknown): string => {
  if (!hasAnswer(value)) {
    return '—';
  }
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  if (Array.isArray(value)) {
    const members = parseHouseholdMembers(value);
    if (members.length > 0) {
      return formatHouseholdMembers(members);
    }
    const pets = parseCurrentPets(value);
    if (pets.length > 0) {
      return formatCurrentPets(pets);
    }
    return value.join(', ');
  }
  return String(value);
};

const buildSummary = (questions: Question[], answers: Record<string, unknown>): string => {
  const parts: string[] = [];
  for (const q of questions) {
    const value = answers[q.questionKey];
    if (!hasAnswer(value)) {
      continue;
    }
    parts.push(formatAnswerPreview(value));
    if (parts.length >= 3) {
      break;
    }
  }
  return parts.length > 0 ? parts.join(' · ') : 'No answers yet';
};

export const PreFilledSectionCard: React.FC<Props> = ({
  icon,
  title,
  questions,
  answers,
  prefilledKeys,
  onChange,
  initiallyExpanded = false,
  emptyHint,
}) => {
  const visibleQuestions = questions.filter(q => shouldShowQuestion(q, answers));
  const missingRequired = visibleQuestions.some(
    q => q.isRequired && !hasAnswer(answers[q.questionKey])
  );
  const [expanded, setExpanded] = useState(initiallyExpanded || missingRequired);
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(() => new Set());

  const handleFieldChange = (questionKey: string, value: unknown) => {
    setTouchedKeys(prev => {
      if (prev.has(questionKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(questionKey);
      return next;
    });
    onChange({ ...answers, [questionKey]: value });
  };

  const summary =
    visibleQuestions.length === 0 ? emptyHint ?? '' : buildSummary(visibleQuestions, answers);

  return (
    <section className={styles.card}>
      <button
        className={styles.header}
        type='button'
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.iconWrap} aria-hidden='true'>
          {icon}
        </span>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>
            {title}
            {missingRequired && <span className={styles.attentionBadge}>⚠️ Needs a look</span>}
          </h3>
          {!expanded && <p className={styles.summary}>{summary}</p>}
        </div>
        <span className={styles.chevron({ expanded })} aria-hidden='true'>
          ▼
        </span>
      </button>
      {expanded && (
        <div className={styles.body}>
          {visibleQuestions.map(question => {
            const isPrefilled =
              !touchedKeys.has(question.questionKey) && prefilledKeys.has(question.questionKey);
            return (
              <QuestionField
                key={question.questionId}
                question={question}
                value={answers[question.questionKey]}
                onChange={value => handleFieldChange(question.questionKey, value)}
                isPrefilled={isPrefilled}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
