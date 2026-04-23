/**
 * Behavioral tests for the adoption-application field mapping.
 *
 * Covers the expected business behaviors:
 * - Returning users see their previously-answered questions pre-filled
 * - Rescue-specific questions are pre-filled from customAnswers
 * - Questions that describe THIS adoption (why_adopt, acknowledgments) are
 *   never pre-filled and always start empty
 * - A user whose profile covers every required question can quick-apply
 * - A user missing any required answer cannot quick-apply
 * - Disabling a core question on a rescue's form removes it from pre-fill
 *   but doesn't discard the stored default
 * - Finalized answers split cleanly into structured defaults and
 *   customAnswers for persistence
 */

import { describe, expect, it } from 'vitest';
import type { Question } from '@/components/application/QuestionField';
import type { ApplicationDefaults } from '@/types';
import {
  ALWAYS_FRESH_QUESTION_KEYS,
  buildInitialAnswers,
  canQuickApply,
  splitAnswersForPersistence,
} from '@/utils/applicationFieldMapping';

const makeQuestion = (overrides: Partial<Question> & Pick<Question, 'questionKey'>): Question => ({
  questionId: `q-${overrides.questionKey}`,
  scope: 'core',
  category: 'personal_information',
  questionType: 'text',
  questionText: overrides.questionKey,
  helpText: null,
  placeholder: null,
  options: null,
  isRequired: false,
  isEnabled: true,
  displayOrder: 0,
  ...overrides,
});

const baseUser = {
  firstName: 'Maya',
  lastName: 'Patel',
  email: 'maya@example.com',
  phoneNumber: '+44 7700 900000',
  phone: undefined,
  dateOfBirth: '1990-02-14',
  addressLine1: '12 High St',
  addressLine2: 'Flat 3',
  city: 'Manchester',
  country: 'United Kingdom',
  postalCode: 'M1 2AB',
};

describe('Adoption application pre-population', () => {
  it('pre-fills household and pet-experience answers from stored defaults', () => {
    const defaults: ApplicationDefaults = {
      livingSituation: {
        housingType: 'house',
        isOwned: true,
        yardFenced: true,
        hasYard: true,
        yardSize: 'medium',
      },
      petExperience: {
        experienceLevel: 'experienced',
        hasPetsCurrently: true,
        hoursAloneDaily: 5,
        exercisePlans: 'Daily walks and weekend hikes',
      },
    };
    const questions = [
      makeQuestion({ questionKey: 'housing_type', questionType: 'select' }),
      makeQuestion({ questionKey: 'home_ownership', questionType: 'select' }),
      makeQuestion({ questionKey: 'yard_fenced', questionType: 'boolean' }),
      makeQuestion({ questionKey: 'yard_size', questionType: 'select' }),
      makeQuestion({ questionKey: 'experience_level', questionType: 'select' }),
      makeQuestion({ questionKey: 'hours_alone', questionType: 'select' }),
      makeQuestion({ questionKey: 'exercise_plan' }),
    ];

    const { answers, prefilledKeys } = buildInitialAnswers(questions, {
      user: baseUser,
      defaults,
      customAnswers: null,
    });

    expect(answers.housing_type).toBe('House');
    expect(answers.home_ownership).toBe('Own');
    expect(answers.yard_fenced).toBe(true);
    expect(answers.yard_size).toBe('Medium garden');
    expect(answers.experience_level).toBe('Experienced');
    expect(answers.hours_alone).toBe('4–6 hours');
    expect(answers.exercise_plan).toBe('Daily walks and weekend hikes');
    expect(prefilledKeys.size).toBe(7);
  });

  it('pre-fills rescue-specific questions from customAnswers', () => {
    const questions = [
      makeQuestion({
        questionKey: 'anxious_dog_experience',
        scope: 'rescue_specific',
        category: 'pet_ownership_experience',
      }),
    ];

    const { answers, prefilledKeys } = buildInitialAnswers(questions, {
      user: baseUser,
      defaults: null,
      customAnswers: { anxious_dog_experience: 'Yes — fostered two reactive dogs' },
    });

    expect(answers.anxious_dog_experience).toBe('Yes — fostered two reactive dogs');
    expect(prefilledKeys.has('anxious_dog_experience')).toBe(true);
  });

  it('leaves always-fresh questions empty even when an answer could be derived', () => {
    const questions = Array.from(ALWAYS_FRESH_QUESTION_KEYS).map(key =>
      makeQuestion({ questionKey: key })
    );

    const { answers, prefilledKeys } = buildInitialAnswers(questions, {
      user: baseUser,
      defaults: null,
      // Attempt to sneak stale answers through customAnswers.
      customAnswers: Object.fromEntries([...ALWAYS_FRESH_QUESTION_KEYS].map(k => [k, 'old'])),
    });

    for (const key of ALWAYS_FRESH_QUESTION_KEYS) {
      expect(answers[key]).toBeUndefined();
      expect(prefilledKeys.has(key)).toBe(false);
    }
  });

  it('leaves questions without known mappings alone when sources are empty', () => {
    const questions = [makeQuestion({ questionKey: 'some_new_rescue_question' })];

    const { answers, prefilledKeys } = buildInitialAnswers(questions, {
      user: baseUser,
      defaults: null,
      customAnswers: null,
    });

    expect(answers).toEqual({});
    expect(prefilledKeys.size).toBe(0);
  });
});

describe('Quick-apply eligibility', () => {
  const completeDefaults: ApplicationDefaults = {
    personalInfo: { occupation: 'Employed full-time' },
    livingSituation: {
      housingType: 'house',
      isOwned: true,
      yardFenced: true,
      householdMembers: [{ name: 'Sam', age: 32, relationship: 'partner' }],
    },
    petExperience: {
      experienceLevel: 'experienced',
      hasPetsCurrently: false,
      hoursAloneDaily: 3,
      exercisePlans: 'Two walks a day',
    },
  };

  const requiredQuestions: Question[] = [
    makeQuestion({ questionKey: 'employment_status', questionType: 'select', isRequired: true }),
    makeQuestion({ questionKey: 'housing_type', questionType: 'select', isRequired: true }),
    makeQuestion({ questionKey: 'home_ownership', questionType: 'select', isRequired: true }),
    makeQuestion({ questionKey: 'yard_fenced', questionType: 'boolean', isRequired: true }),
    makeQuestion({ questionKey: 'household_members', isRequired: true }),
    makeQuestion({ questionKey: 'experience_level', questionType: 'select', isRequired: true }),
    makeQuestion({ questionKey: 'has_pets', questionType: 'boolean', isRequired: true }),
    makeQuestion({ questionKey: 'hours_alone', questionType: 'select', isRequired: true }),
    makeQuestion({ questionKey: 'exercise_plan', isRequired: true }),
    // Always-fresh questions don't block quick-apply.
    makeQuestion({ questionKey: 'why_adopt', isRequired: true }),
    makeQuestion({ questionKey: 'agree_terms', questionType: 'boolean', isRequired: true }),
  ];

  it('allows quick apply when every reusable required question has a stored answer', () => {
    expect(
      canQuickApply(requiredQuestions, {
        user: baseUser,
        defaults: completeDefaults,
        customAnswers: null,
      })
    ).toBe(true);
  });

  it('requires guided flow when any required question is missing a stored answer', () => {
    const partialDefaults: ApplicationDefaults = {
      ...completeDefaults,
      petExperience: { ...completeDefaults.petExperience, exercisePlans: undefined },
    };

    expect(
      canQuickApply(requiredQuestions, {
        user: baseUser,
        defaults: partialDefaults,
        customAnswers: null,
      })
    ).toBe(false);
  });

  it('requires guided flow when a rescue adds a required custom question the user has never answered', () => {
    const withCustom: Question[] = [
      ...requiredQuestions,
      makeQuestion({
        questionKey: 'ever_surrendered_pet',
        scope: 'rescue_specific',
        isRequired: true,
        questionType: 'boolean',
      }),
    ];

    expect(
      canQuickApply(withCustom, {
        user: baseUser,
        defaults: completeDefaults,
        customAnswers: null,
      })
    ).toBe(false);

    expect(
      canQuickApply(withCustom, {
        user: baseUser,
        defaults: completeDefaults,
        customAnswers: { ever_surrendered_pet: false },
      })
    ).toBe(true);
  });

  it('ignores disabled questions when deciding quick-apply eligibility', () => {
    const withDisabledRequirement: Question[] = [
      ...requiredQuestions,
      makeQuestion({
        questionKey: 'references_form_uploaded',
        isRequired: true,
        isEnabled: false,
      }),
    ];

    expect(
      canQuickApply(withDisabledRequirement, {
        user: baseUser,
        defaults: completeDefaults,
        customAnswers: null,
      })
    ).toBe(true);
  });
});

describe('Persistence split', () => {
  const answers: Record<string, unknown> = {
    employment_status: 'Employed full-time',
    housing_type: 'Flat/Apartment',
    home_ownership: 'Rent',
    yard_fenced: false,
    experience_level: 'Some experience',
    has_pets: true,
    hours_alone: '4–6 hours',
    exercise_plan: 'Daily walks',
    reference_name: 'Sam Lee',
    reference_contact: 'sam@example.com',
    reference_relationship: 'Colleague',
    // Always-fresh — must not be persisted.
    why_adopt: 'Because Luna is perfect',
    agree_terms: true,
    // Custom rescue question — must go to customAnswers.
    anxious_dog_experience: 'Yes',
  };

  const questions: Question[] = [
    makeQuestion({ questionKey: 'employment_status', questionType: 'select' }),
    makeQuestion({ questionKey: 'housing_type', questionType: 'select' }),
    makeQuestion({ questionKey: 'home_ownership', questionType: 'select' }),
    makeQuestion({ questionKey: 'yard_fenced', questionType: 'boolean' }),
    makeQuestion({ questionKey: 'experience_level', questionType: 'select' }),
    makeQuestion({ questionKey: 'has_pets', questionType: 'boolean' }),
    makeQuestion({ questionKey: 'hours_alone', questionType: 'select' }),
    makeQuestion({ questionKey: 'exercise_plan' }),
    makeQuestion({ questionKey: 'reference_name' }),
    makeQuestion({ questionKey: 'reference_contact' }),
    makeQuestion({ questionKey: 'reference_relationship' }),
    makeQuestion({ questionKey: 'why_adopt' }),
    makeQuestion({ questionKey: 'agree_terms', questionType: 'boolean' }),
    makeQuestion({ questionKey: 'anxious_dog_experience', scope: 'rescue_specific' }),
  ];

  it('maps core answers into structured ApplicationDefaults slots', () => {
    const { defaultsUpdate } = splitAnswersForPersistence(answers, questions);

    expect(defaultsUpdate.personalInfo?.occupation).toBe('Employed full-time');
    expect(defaultsUpdate.livingSituation?.housingType).toBe('apartment');
    expect(defaultsUpdate.livingSituation?.isOwned).toBe(false);
    expect(defaultsUpdate.petExperience?.experienceLevel).toBe('some');
    expect(defaultsUpdate.petExperience?.hasPetsCurrently).toBe(true);
    expect(defaultsUpdate.petExperience?.exercisePlans).toBe('Daily walks');
    expect(defaultsUpdate.references?.personal?.[0]).toMatchObject({
      name: 'Sam Lee',
      email: 'sam@example.com',
      relationship: 'Colleague',
    });
  });

  it('routes rescue-specific and unmapped answers into customAnswers', () => {
    const { customAnswers } = splitAnswersForPersistence(answers, questions);

    expect(customAnswers).toEqual({ anxious_dog_experience: 'Yes' });
  });

  it('never persists always-fresh acknowledgments or why-adopt text', () => {
    const { defaultsUpdate, customAnswers } = splitAnswersForPersistence(answers, questions);

    expect(customAnswers).not.toHaveProperty('why_adopt');
    expect(customAnswers).not.toHaveProperty('agree_terms');
    expect(JSON.stringify(defaultsUpdate)).not.toContain('Because Luna');
  });
});
