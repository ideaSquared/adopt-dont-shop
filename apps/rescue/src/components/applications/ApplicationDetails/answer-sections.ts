// Turns an application's answers (keyed by question_key) into labelled
// sections for the rescue's review screen, using the rescue's questionnaire
// (core + its own questions) for the wording and grouping.

import { formatDate } from '@adopt-dont-shop/lib.utils';

import { CATEGORY_LABELS } from '../../rescue/QuestionsBuilder';

export type QuestionSummary = {
  questionKey: string;
  category: string;
  questionText: string;
  questionType: string;
  displayOrder: number;
};

export type AnswerItem = { key: string; label: string; value: string };
export type AnswerSection = { title: string; items: AnswerItem[] };

const OTHER_ANSWERS = 'Other answers';

const humaniseKey = (key: string): string => {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// The application form gives each household member / current pet entry an
// id for its own bookkeeping; it means nothing to the rescue.
const FORM_INTERNAL_KEYS = new Set(['id']);

const formatAnswer = (value: unknown, questionType = ''): string => {
  if (questionType === 'date' && typeof value === 'string' && value.trim() !== '') {
    return formatDate(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map(item => formatAnswer(item))
      .filter(Boolean)
      .join(value.some(isRecord) ? '; ' : ', ');
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => !FORM_INTERNAL_KEYS.has(key))
      .map(([key, inner]) => `${humaniseKey(key)}: ${formatAnswer(inner)}`)
      .join(', ');
  }
  return '';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isKnownCategory = (category: string): category is keyof typeof CATEGORY_LABELS =>
  Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category);

const categoryTitle = (category: string): string =>
  isKnownCategory(category) ? CATEGORY_LABELS[category] : humaniseKey(category);

const FORM_ORDER = Object.keys(CATEGORY_LABELS);
const categoryRank = (category: string): number => {
  const rank = FORM_ORDER.indexOf(category);
  return rank === -1 ? FORM_ORDER.length : rank;
};

export const buildAnswerSections = (
  answers: Record<string, unknown>,
  questions: ReadonlyArray<QuestionSummary>
): AnswerSection[] => {
  const answered = (key: string, questionType?: string): string =>
    formatAnswer(answers[key], questionType);

  const asked = [...questions]
    .sort(
      (a, b) =>
        categoryRank(a.category) - categoryRank(b.category) || a.displayOrder - b.displayOrder
    )
    .filter(q => answered(q.questionKey, q.questionType) !== '');

  const sections = asked.reduce<AnswerSection[]>((acc, q) => {
    const title = categoryTitle(q.category);
    const item = {
      key: q.questionKey,
      label: q.questionText,
      value: answered(q.questionKey, q.questionType),
    };
    const last = acc[acc.length - 1];
    return last?.title === title
      ? [...acc.slice(0, -1), { title, items: [...last.items, item] }]
      : [...acc, { title, items: [item] }];
  }, []);

  const knownKeys = new Set(questions.map(q => q.questionKey));
  const others = Object.keys(answers)
    .filter(key => !knownKeys.has(key) && answered(key) !== '')
    .map(key => ({ key, label: humaniseKey(key), value: answered(key) }));

  return others.length > 0 ? [...sections, { title: OTHER_ANSWERS, items: others }] : sections;
};
