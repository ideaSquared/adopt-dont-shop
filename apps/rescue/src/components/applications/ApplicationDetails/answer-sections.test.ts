import { describe, expect, it } from 'vitest';

import { buildAnswerSections, type QuestionSummary } from './answer-sections';

const question = (
  overrides: Partial<QuestionSummary> & { questionKey: string }
): QuestionSummary => ({
  category: 'household_information',
  questionText: overrides.questionKey,
  displayOrder: 0,
  ...overrides,
});

describe('buildAnswerSections', () => {
  it("shows each answer under its question's text, grouped by section in form order", () => {
    const sections = buildAnswerSections({ why_adopt: 'We love dogs', housing_type: 'House' }, [
      question({
        questionKey: 'why_adopt',
        category: 'final_acknowledgments',
        questionText: 'Why do you want to adopt?',
      }),
      question({
        questionKey: 'housing_type',
        category: 'household_information',
        questionText: 'What type of home do you live in?',
      }),
    ]);

    expect(sections).toEqual([
      {
        title: 'Household Information',
        items: [
          { key: 'housing_type', label: 'What type of home do you live in?', value: 'House' },
        ],
      },
      {
        title: 'Final Acknowledgments',
        items: [{ key: 'why_adopt', label: 'Why do you want to adopt?', value: 'We love dogs' }],
      },
    ]);
  });

  it('orders questions within a section by their display order', () => {
    const [section] = buildAnswerSections({ b: 'second', a: 'first' }, [
      question({ questionKey: 'b', displayOrder: 2 }),
      question({ questionKey: 'a', displayOrder: 1 }),
    ]);

    expect(section.items.map(item => item.value)).toEqual(['first', 'second']);
  });

  it('reads yes/no answers as Yes and No', () => {
    const [section] = buildAnswerSections({ yard_fenced: true, has_pets: false }, [
      question({ questionKey: 'yard_fenced', displayOrder: 1 }),
      question({ questionKey: 'has_pets', displayOrder: 2 }),
    ]);

    expect(section.items.map(item => item.value)).toEqual(['Yes', 'No']);
  });

  it('spells out list answers, including lists of details', () => {
    const [section] = buildAnswerSections(
      {
        current_pets: ['Cat', 'Rabbit'],
        previous_pets: [{ type: 'Dog', years_owned: '12' }],
      },
      [
        question({ questionKey: 'current_pets', displayOrder: 1 }),
        question({ questionKey: 'previous_pets', displayOrder: 2 }),
      ]
    );

    expect(section.items.map(item => item.value)).toEqual([
      'Cat, Rabbit',
      'Type: Dog, Years owned: 12',
    ]);
  });

  it('skips questions the applicant was not asked or left blank', () => {
    const sections = buildAnswerSections({ blank: '  ' }, [
      question({ questionKey: 'blank' }),
      question({ questionKey: 'unanswered' }),
    ]);

    expect(sections).toEqual([]);
  });

  it('still shows answers whose question no longer exists, under a readable label', () => {
    const sections = buildAnswerSections({ garden_size_m2: 40 }, []);

    expect(sections).toEqual([
      {
        title: 'Other answers',
        items: [{ key: 'garden_size_m2', label: 'Garden size m2', value: '40' }],
      },
    ]);
  });
});
