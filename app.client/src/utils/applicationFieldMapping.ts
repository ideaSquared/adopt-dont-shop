import type { User } from '@adopt-dont-shop/lib.auth';
import type { Question } from '@/components/application/QuestionField';
import type { ApplicationDefaults } from '@/types';
import {
  applyConditionalDefaults,
  shouldShowQuestion,
} from '@/components/application/questionConditions';
import type { PetKind } from '@/components/application/CurrentPetsField';

const PET_KINDS: readonly PetKind[] = [
  'dog',
  'cat',
  'rabbit',
  'bird',
  'small',
  'reptile',
  'fish',
  'other',
];

const coerceToPetKind = (raw: string): PetKind => {
  const normalised = raw.toLowerCase().trim();
  if ((PET_KINDS as readonly string[]).includes(normalised)) {
    return normalised as PetKind;
  }
  if (normalised.includes('dog') || normalised.includes('puppy')) {
    return 'dog';
  }
  if (normalised.includes('cat') || normalised.includes('kitten')) {
    return 'cat';
  }
  if (normalised.includes('rabbit') || normalised.includes('bunny')) {
    return 'rabbit';
  }
  if (normalised.includes('bird') || normalised.includes('parrot')) {
    return 'bird';
  }
  if (normalised.includes('fish')) {
    return 'fish';
  }
  if (
    normalised.includes('reptile') ||
    normalised.includes('lizard') ||
    normalised.includes('snake') ||
    normalised.includes('gecko')
  ) {
    return 'reptile';
  }
  if (
    normalised.includes('hamster') ||
    normalised.includes('guinea') ||
    normalised.includes('mouse') ||
    normalised.includes('rat')
  ) {
    return 'small';
  }
  return 'other';
};

/**
 * Keys that must always be answered fresh for each application — they describe
 * THIS adoption, not the applicant's reusable profile.
 */
export const ALWAYS_FRESH_QUESTION_KEYS: ReadonlySet<string> = new Set([
  'why_adopt',
  'pet_if_circumstances_change',
  'agree_home_visit',
  'agree_terms',
]);

export type CustomAnswers = Record<string, unknown>;

/**
 * Shape we consume. The backend's pre-population response, the user object,
 * and any rescue-specific answers stashed from a prior application.
 */
export type PrePopulationSources = {
  user: Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phoneNumber'
    | 'phone'
    | 'dateOfBirth'
    | 'addressLine1'
    | 'addressLine2'
    | 'city'
    | 'country'
    | 'postalCode'
  > | null;
  defaults: ApplicationDefaults | null;
  customAnswers: CustomAnswers | null;
};

type ResolvedValue = { value: unknown; source: 'user' | 'defaults' | 'custom' };

const firstNonEmpty = (...values: unknown[]): unknown => {
  for (const v of values) {
    if (v === undefined || v === null) {
      continue;
    }
    if (typeof v === 'string' && v.trim() === '') {
      continue;
    }
    if (Array.isArray(v) && v.length === 0) {
      continue;
    }
    return v;
  }
  return undefined;
};

const joinAddress = (user: PrePopulationSources['user']): string | undefined => {
  if (!user) {
    return undefined;
  }
  const parts = [user.addressLine1, user.addressLine2].filter(
    (s): s is string => typeof s === 'string' && s.trim() !== ''
  );
  return parts.length > 0 ? parts.join(', ') : undefined;
};

/**
 * Resolve the best pre-populated value for a single question key by looking
 * through the User profile → structured applicationDefaults → customAnswers,
 * in that order of priority. Returns undefined when nothing applicable exists.
 */
const resolveForKey = (
  questionKey: string,
  sources: PrePopulationSources
): ResolvedValue | undefined => {
  const { user, defaults, customAnswers } = sources;
  const personal = defaults?.personalInfo;
  const living = defaults?.livingSituation;
  const experience = defaults?.petExperience;
  const references = defaults?.references;

  // Rescue-specific questions: look in customAnswers first — they're keyed
  // directly by questionKey.
  if (customAnswers && Object.prototype.hasOwnProperty.call(customAnswers, questionKey)) {
    const val = customAnswers[questionKey];
    if (val !== undefined) {
      return { value: val, source: 'custom' };
    }
  }

  switch (questionKey) {
    case 'employment_status': {
      const v = firstNonEmpty(personal?.occupation);
      return v !== undefined ? { value: v, source: 'defaults' } : undefined;
    }
    case 'housing_type': {
      const map: Record<string, string> = {
        house: 'House',
        apartment: 'Flat/Apartment',
        condo: 'Flat/Apartment',
        other: 'Other',
      };
      const raw = living?.housingType;
      if (!raw) {
        return undefined;
      }
      return { value: map[raw] ?? 'Other', source: 'defaults' };
    }
    case 'home_ownership': {
      if (living?.isOwned === true) {
        return { value: 'Own', source: 'defaults' };
      }
      if (living?.isOwned === false) {
        return { value: 'Rent', source: 'defaults' };
      }
      return undefined;
    }
    case 'landlord_permission': {
      return living?.allowsPets !== undefined
        ? { value: living.allowsPets, source: 'defaults' }
        : undefined;
    }
    case 'yard_fenced': {
      return living?.yardFenced !== undefined
        ? { value: living.yardFenced, source: 'defaults' }
        : undefined;
    }
    case 'yard_size': {
      const map: Record<string, string> = {
        small: 'Small garden',
        medium: 'Medium garden',
        large: 'Large garden',
      };
      const raw = living?.yardSize;
      if (!raw) {
        return undefined;
      }
      if (living?.hasYard === false) {
        return { value: 'No outdoor space', source: 'defaults' };
      }
      return { value: map[raw] ?? 'Medium garden', source: 'defaults' };
    }
    case 'household_members': {
      if (living?.householdMembers && living.householdMembers.length > 0) {
        return { value: living.householdMembers, source: 'defaults' };
      }
      return undefined;
    }
    case 'experience_level': {
      const map: Record<string, string> = {
        beginner: 'First-time owner',
        some: 'Some experience',
        experienced: 'Experienced',
        expert: 'Very experienced',
      };
      const raw = experience?.experienceLevel;
      return raw ? { value: map[raw] ?? 'Some experience', source: 'defaults' } : undefined;
    }
    case 'has_pets': {
      return experience?.hasPetsCurrently !== undefined
        ? { value: experience.hasPetsCurrently, source: 'defaults' }
        : undefined;
    }
    case 'current_pets': {
      if (experience?.currentPets && experience.currentPets.length > 0) {
        const structured = experience.currentPets.map((p, i) => ({
          id: `prefill-${i}`,
          kind: coerceToPetKind(p.type),
          age: typeof p.age === 'number' ? p.age : undefined,
          neutered: p.spayedNeutered === true ? true : undefined,
        }));
        return { value: structured, source: 'defaults' };
      }
      return undefined;
    }
    case 'previous_pets': {
      if (experience?.previousPets && experience.previousPets.length > 0) {
        const formatted = experience.previousPets
          .map(p => {
            const breed = p.breed ? ` ${p.breed}` : '';
            return `${p.type}${breed} (${p.yearsOwned} years): ${p.whatHappened}`;
          })
          .join('; ');
        return { value: formatted, source: 'defaults' };
      }
      return undefined;
    }
    case 'hours_alone': {
      const n = experience?.hoursAloneDaily;
      if (n === undefined) {
        return undefined;
      }
      if (n < 2) {
        return { value: 'Less than 2 hours', source: 'defaults' };
      }
      if (n < 4) {
        return { value: '2–4 hours', source: 'defaults' };
      }
      if (n < 6) {
        return { value: '4–6 hours', source: 'defaults' };
      }
      if (n < 8) {
        return { value: '6–8 hours', source: 'defaults' };
      }
      return { value: 'More than 8 hours', source: 'defaults' };
    }
    case 'exercise_plan': {
      const v = firstNonEmpty(experience?.exercisePlans);
      return v !== undefined ? { value: v, source: 'defaults' } : undefined;
    }
    case 'vet_registered': {
      return references?.veterinarian ? { value: true, source: 'defaults' } : undefined;
    }
    case 'vet_practice': {
      const vet = references?.veterinarian;
      if (!vet) {
        return undefined;
      }
      const parts = [vet.clinicName, vet.name].filter(Boolean);
      return parts.length > 0 ? { value: parts.join(' — '), source: 'defaults' } : undefined;
    }
    case 'reference_name': {
      const first = references?.personal?.[0];
      return first?.name ? { value: first.name, source: 'defaults' } : undefined;
    }
    case 'reference_contact': {
      const first = references?.personal?.[0];
      const contact = firstNonEmpty(first?.phone, first?.email);
      return contact !== undefined ? { value: contact, source: 'defaults' } : undefined;
    }
    case 'reference_relationship': {
      const first = references?.personal?.[0];
      return first?.relationship ? { value: first.relationship, source: 'defaults' } : undefined;
    }
    // User-model-backed keys (shouldn't be core questions today but we support
    // rescues that add them):
    case 'first_name':
    case 'firstName':
      return user?.firstName ? { value: user.firstName, source: 'user' } : undefined;
    case 'last_name':
    case 'lastName':
      return user?.lastName ? { value: user.lastName, source: 'user' } : undefined;
    case 'email':
      return user?.email ? { value: user.email, source: 'user' } : undefined;
    case 'phone':
    case 'phone_number': {
      const v = firstNonEmpty(user?.phoneNumber, user?.phone);
      return v !== undefined ? { value: v, source: 'user' } : undefined;
    }
    case 'date_of_birth':
    case 'dateOfBirth':
      return user?.dateOfBirth ? { value: user.dateOfBirth, source: 'user' } : undefined;
    case 'address': {
      const v = joinAddress(user);
      return v ? { value: v, source: 'user' } : undefined;
    }
    case 'city':
      return user?.city ? { value: user.city, source: 'user' } : undefined;
    case 'postcode':
    case 'postal_code':
      return user?.postalCode ? { value: user.postalCode, source: 'user' } : undefined;
    case 'country':
      return user?.country ? { value: user.country, source: 'user' } : undefined;
    default:
      return undefined;
  }
};

export type MappingResult = {
  answers: Record<string, unknown>;
  prefilledKeys: Set<string>;
};

/**
 * Given the rescue's enabled questions and the user's available data, produce
 * (a) an initial `answers` object to seed the form with, and (b) the set of
 * question keys that were pre-filled (drives the ✨ badge). Purely functional:
 * no side effects, same inputs → same outputs.
 */
export const buildInitialAnswers = (
  questions: readonly Question[],
  sources: PrePopulationSources
): MappingResult => {
  const answers: Record<string, unknown> = {};
  const prefilledKeys = new Set<string>();

  for (const q of questions) {
    if (ALWAYS_FRESH_QUESTION_KEYS.has(q.questionKey)) {
      continue;
    }
    const resolved = resolveForKey(q.questionKey, sources);
    if (resolved === undefined) {
      continue;
    }
    answers[q.questionKey] = resolved.value;
    prefilledKeys.add(q.questionKey);
  }

  return { answers, prefilledKeys };
};

const hasValue = (v: unknown): boolean => {
  if (v === undefined || v === null) {
    return false;
  }
  if (typeof v === 'string') {
    return v.trim() !== '';
  }
  if (Array.isArray(v)) {
    return v.length > 0;
  }
  return true;
};

/**
 * True when every required question on the rescue's form has a pre-filled
 * answer we can trust — the user could submit without touching the form.
 * Conditional questions (e.g. "If you rent…") are only required when their
 * trigger is met; otherwise they contribute no requirement.
 */
export const canQuickApply = (
  questions: readonly Question[],
  sources: PrePopulationSources
): boolean => {
  const { answers } = buildInitialAnswers(questions, sources);
  const resolved = applyConditionalDefaults(answers);
  for (const q of questions) {
    if (!q.isEnabled || !q.isRequired) {
      continue;
    }
    if (ALWAYS_FRESH_QUESTION_KEYS.has(q.questionKey)) {
      continue;
    }
    if (!shouldShowQuestion(q, resolved)) {
      continue;
    }
    if (!hasValue(resolved[q.questionKey])) {
      return false;
    }
  }
  return true;
};

type SplitAnswers = {
  defaultsUpdate: Partial<ApplicationDefaults>;
  customAnswers: CustomAnswers;
};

/**
 * Inverse of `buildInitialAnswers`: given the user's final `answers` and the
 * question list, split into (a) structured `ApplicationDefaults` updates for
 * core questions we know how to map, and (b) `customAnswers` for the rest
 * (rescue-specific questions + core questions without a structured slot).
 * Always-fresh keys are intentionally excluded from both — they're per-
 * application and never get written back.
 */
export const splitAnswersForPersistence = (
  answers: Record<string, unknown>,
  questions: readonly Question[]
): SplitAnswers => {
  const personalInfo: NonNullable<ApplicationDefaults['personalInfo']> = {};
  const livingSituation: NonNullable<ApplicationDefaults['livingSituation']> = {};
  const petExperience: NonNullable<ApplicationDefaults['petExperience']> = {};
  const references: NonNullable<ApplicationDefaults['references']> = {};
  const customAnswers: CustomAnswers = {};

  const get = (key: string): unknown => answers[key];
  const present = (key: string): boolean => hasValue(answers[key]);

  if (present('employment_status')) {
    personalInfo.occupation = String(get('employment_status'));
  }

  if (present('housing_type')) {
    const raw = String(get('housing_type'));
    const lower = raw.toLowerCase();
    if (lower.includes('house') || lower.includes('bungalow') || lower.includes('farmhouse')) {
      livingSituation.housingType = 'house';
    } else if (lower.includes('flat') || lower.includes('apartment')) {
      livingSituation.housingType = 'apartment';
    } else {
      livingSituation.housingType = 'other';
    }
  }
  if (present('home_ownership')) {
    const raw = String(get('home_ownership')).toLowerCase();
    livingSituation.isOwned = raw.startsWith('own');
  }
  if (typeof get('landlord_permission') === 'boolean') {
    livingSituation.allowsPets = get('landlord_permission') as boolean;
  }
  if (typeof get('yard_fenced') === 'boolean') {
    const fenced = get('yard_fenced') as boolean;
    livingSituation.yardFenced = fenced;
    livingSituation.hasYard = fenced;
  }
  if (present('yard_size')) {
    const raw = String(get('yard_size')).toLowerCase();
    if (raw.includes('no outdoor')) {
      livingSituation.hasYard = false;
    } else if (raw.includes('small') && !raw.includes('balcony')) {
      livingSituation.yardSize = 'small';
    } else if (raw.includes('medium')) {
      livingSituation.yardSize = 'medium';
    } else if (raw.includes('large') || raw.includes('rural')) {
      livingSituation.yardSize = 'large';
    }
  }
  if (present('household_members')) {
    const raw = get('household_members');
    if (Array.isArray(raw)) {
      // Structured HouseholdMember[] (from HouseholdMembersField). Convert
      // loosely into the defaults' { name, age, relationship } shape so we
      // can rehydrate next time.
      livingSituation.householdMembers = raw.map((m, i) => {
        const entry = m as { type?: string; age?: number };
        return {
          name: `Member ${i + 1}`,
          age: entry.age ?? 0,
          relationship: entry.type ?? 'other',
        };
      });
      livingSituation.householdSize = raw.length;
    }
  }

  if (present('experience_level')) {
    const raw = String(get('experience_level')).toLowerCase();
    if (raw.includes('first-time')) {
      petExperience.experienceLevel = 'beginner';
    } else if (raw.startsWith('some')) {
      petExperience.experienceLevel = 'some';
    } else if (raw.startsWith('very')) {
      petExperience.experienceLevel = 'expert';
    } else {
      petExperience.experienceLevel = 'experienced';
    }
  }
  if (typeof get('has_pets') === 'boolean') {
    petExperience.hasPetsCurrently = get('has_pets') as boolean;
  }
  if (Array.isArray(get('current_pets'))) {
    const raw = get('current_pets') as Array<{
      kind?: unknown;
      age?: unknown;
      neutered?: unknown;
    }>;
    const mapped = raw
      .filter(p => typeof p === 'object' && p !== null && typeof p.kind === 'string')
      .map(p => ({
        type: String(p.kind),
        age: typeof p.age === 'number' ? p.age : 0,
        spayedNeutered: p.neutered === true,
        vaccinated: false,
      }));
    if (mapped.length > 0) {
      petExperience.currentPets = mapped;
    }
  }
  if (present('hours_alone')) {
    const raw = String(get('hours_alone'));
    const approximation: Record<string, number> = {
      'Less than 2 hours': 1,
      '2–4 hours': 3,
      '4–6 hours': 5,
      '6–8 hours': 7,
      'More than 8 hours': 9,
    };
    if (approximation[raw] !== undefined) {
      petExperience.hoursAloneDaily = approximation[raw];
    }
  }
  if (present('exercise_plan')) {
    petExperience.exercisePlans = String(get('exercise_plan'));
  }

  if (present('reference_name') || present('reference_contact')) {
    const contact = present('reference_contact') ? String(get('reference_contact')) : '';
    const isEmail = contact.includes('@');
    references.personal = [
      {
        name: present('reference_name') ? String(get('reference_name')) : '',
        relationship: present('reference_relationship')
          ? String(get('reference_relationship'))
          : '',
        phone: isEmail ? '' : contact,
        email: isEmail ? contact : undefined,
        yearsKnown: 0,
      },
    ];
  }
  if (present('vet_practice')) {
    const raw = String(get('vet_practice'));
    const [clinicName, name] = raw.includes(' — ') ? raw.split(' — ') : [raw, ''];
    references.veterinarian = {
      name: name?.trim() ?? '',
      clinicName: clinicName?.trim() ?? '',
      phone: '',
      yearsUsed: 0,
    };
  }

  // Everything else (rescue-specific questions + core keys we don't have a
  // structured slot for) is stashed under customAnswers keyed by questionKey.
  const knownCoreKeys = new Set([
    'employment_status',
    'housing_type',
    'home_ownership',
    'landlord_permission',
    'yard_fenced',
    'yard_size',
    'household_members',
    'experience_level',
    'has_pets',
    'current_pets',
    'hours_alone',
    'exercise_plan',
    'reference_name',
    'reference_contact',
    'reference_relationship',
    'vet_registered',
    'vet_practice',
  ]);

  for (const q of questions) {
    const key = q.questionKey;
    if (ALWAYS_FRESH_QUESTION_KEYS.has(key)) {
      continue;
    }
    if (knownCoreKeys.has(key)) {
      continue;
    }
    if (!present(key)) {
      continue;
    }
    customAnswers[key] = answers[key];
  }

  const defaultsUpdate: Partial<ApplicationDefaults> = {};
  if (Object.keys(personalInfo).length > 0) {
    defaultsUpdate.personalInfo = personalInfo;
  }
  if (Object.keys(livingSituation).length > 0) {
    defaultsUpdate.livingSituation = livingSituation;
  }
  if (Object.keys(petExperience).length > 0) {
    defaultsUpdate.petExperience = petExperience;
  }
  if (Object.keys(references).length > 0) {
    defaultsUpdate.references = references;
  }

  return { defaultsUpdate, customAnswers };
};
