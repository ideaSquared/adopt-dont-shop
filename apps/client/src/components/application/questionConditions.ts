import type { Question } from './QuestionField';

/**
 * Question keys whose visibility depends on another answer. When the trigger
 * answer doesn't match `showWhen`, the dependent question is hidden and its
 * value collapses to `defaultWhenHidden` (or `undefined` if not specified).
 *
 * These conditions cover the core "If you X…" questions on the platform form.
 * Rescue-specific questions should use the backend's `conditional_logic`
 * field on ApplicationQuestion when we wire that up — for now this hardcoded
 * map is the source of truth for the seeded core questions.
 */
type Condition = {
  dependsOn: string;
  showWhen: unknown;
  /**
   * Value the dependent question should take when it's hidden. For boolean
   * dependents this is usually `false` (the "default to No" semantic).
   * For text fields we leave it undefined so nothing ends up in the answer.
   */
  defaultWhenHidden?: unknown;
};

export const CONDITIONAL_QUESTIONS: Readonly<Record<string, Condition>> = {
  // "If you rent, do you have your landlord's permission?" — only shown when
  // the applicant rents. For owners / living-with-family, default to No.
  landlord_permission: {
    dependsOn: 'home_ownership',
    showWhen: 'Rent',
    defaultWhenHidden: false,
  },
  // "If yes, please describe your current pets." — only shown when the
  // applicant said they have pets. No sensible default when hidden.
  current_pets: {
    dependsOn: 'has_pets',
    showWhen: true,
  },
  // "What is the name and location of your vet practice?" — only relevant if
  // they told us they're registered with one.
  vet_practice: {
    dependsOn: 'vet_registered',
    showWhen: true,
  },
};

export const isConditionalQuestion = (questionKey: string): boolean =>
  Object.prototype.hasOwnProperty.call(CONDITIONAL_QUESTIONS, questionKey);

export const shouldShowQuestion = (
  question: Pick<Question, 'questionKey'>,
  answers: Record<string, unknown>
): boolean => {
  const condition = CONDITIONAL_QUESTIONS[question.questionKey];
  if (!condition) {
    return true;
  }
  return answers[condition.dependsOn] === condition.showWhen;
};

/**
 * Given the current answers, reset any conditional questions whose trigger
 * isn't met to their `defaultWhenHidden` value (or clear them). Idempotent
 * and pure — same inputs → same outputs. Run after any answer change so
 * hidden questions don't carry stale values into submission.
 */
export const applyConditionalDefaults = (
  answers: Record<string, unknown>
): Record<string, unknown> => {
  let changed = false;
  const next = { ...answers };
  for (const [key, condition] of Object.entries(CONDITIONAL_QUESTIONS)) {
    if (answers[condition.dependsOn] === condition.showWhen) {
      continue;
    }
    const desired = condition.defaultWhenHidden;
    if (next[key] === desired) {
      continue;
    }
    if (desired === undefined) {
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
        changed = true;
      }
    } else {
      next[key] = desired;
      changed = true;
    }
  }
  return changed ? next : answers;
};
