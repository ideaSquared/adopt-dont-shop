import type { MigrationBuilder } from 'node-pg-migrate';

// Seed the core application questionnaire.
//
// Core questions (scope = 'core', rescue_id NULL) are the platform-mandated
// baseline every rescue's application form starts from; rescues add their own
// rescue_specific questions on top. The monolith seeded these as reference
// data (service.backend/src/seeders/reference/application-questions.ts), but
// that seeder was deleted with the monolith (#995) and never ported, so
// rescue.application_questions shipped empty: every adopter opening /apply saw
// "No questions available" and could only send a blank application.
//
// The rows below are that seeder's 28 questions, verbatim. Reference data
// that the product needs in every environment belongs in a migration, not in
// the dev-only db:seed. ON CONFLICT against the core partial-unique index
// keeps this a no-op for any core question that already exists (e.g. a
// database migrated from the monolith).

type CoreQuestion = {
  key: string;
  category: string;
  type: string;
  text: string;
  helpText: string | null;
  placeholder: string | null;
  options: readonly string[] | null;
  displayOrder: number;
  isRequired: boolean;
};

export const CORE_APPLICATION_QUESTIONS: readonly CoreQuestion[] = [
  {
    key: 'employment_status',
    category: 'personal_information',
    type: 'select',
    text: 'What is your current employment status?',
    helpText: 'This helps us understand how much time you have available for a pet.',
    placeholder: null,
    options: [
      'Employed full-time',
      'Employed part-time',
      'Self-employed',
      'Student',
      'Retired',
      'Homemaker',
      'Currently unemployed',
      'Other',
    ],
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'hours_from_home',
    category: 'personal_information',
    type: 'select',
    text: 'On a typical weekday, how many hours are you away from home?',
    helpText: null,
    placeholder: null,
    options: [
      'I work from home',
      'Less than 4 hours',
      '4–6 hours',
      '6–8 hours',
      '8–10 hours',
      'More than 10 hours',
    ],
    displayOrder: 1,
    isRequired: true,
  },
  {
    key: 'willing_to_provide_id',
    category: 'personal_information',
    type: 'boolean',
    text: 'Are you willing to provide proof of identity if requested?',
    helpText: null,
    placeholder: null,
    options: null,
    displayOrder: 2,
    isRequired: true,
  },
  {
    key: 'housing_type',
    category: 'household_information',
    type: 'select',
    text: 'What type of home do you live in?',
    helpText: null,
    placeholder: null,
    options: ['House', 'Flat/Apartment', 'Bungalow', 'Terraced house', 'Farmhouse/Rural', 'Other'],
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'home_ownership',
    category: 'household_information',
    type: 'select',
    text: 'Do you own or rent your home?',
    helpText: null,
    placeholder: null,
    options: ['Own', 'Rent', 'Live with family/parents', 'Other'],
    displayOrder: 1,
    isRequired: true,
  },
  {
    key: 'landlord_permission',
    category: 'household_information',
    type: 'boolean',
    text: "If you rent, do you have your landlord's permission to keep a pet?",
    helpText: 'We may ask to see written confirmation before completing an adoption.',
    placeholder: null,
    options: null,
    displayOrder: 2,
    isRequired: false,
  },
  {
    key: 'yard_fenced',
    category: 'household_information',
    type: 'boolean',
    text: 'Do you have a fenced outdoor space?',
    helpText: 'A fully enclosed garden or yard is required for some breeds.',
    placeholder: null,
    options: null,
    displayOrder: 3,
    isRequired: true,
  },
  {
    key: 'yard_size',
    category: 'household_information',
    type: 'select',
    text: 'If you have an outdoor space, how large is it?',
    helpText: null,
    placeholder: null,
    options: [
      'No outdoor space',
      'Small (balcony/patio)',
      'Small garden',
      'Medium garden',
      'Large garden',
      'Very large/rural land',
    ],
    displayOrder: 4,
    isRequired: false,
  },
  {
    key: 'household_members',
    category: 'household_information',
    type: 'text',
    text: 'Please describe everyone who lives in your household.',
    helpText: 'Include the ages of any children.',
    placeholder: 'e.g. Two adults, one child aged 7',
    options: null,
    displayOrder: 5,
    isRequired: true,
  },
  {
    key: 'household_all_agree',
    category: 'household_information',
    type: 'boolean',
    text: 'Does everyone in your household agree to adopting this pet?',
    helpText: 'It is important that all household members are on board.',
    placeholder: null,
    options: null,
    displayOrder: 6,
    isRequired: true,
  },
  {
    key: 'experience_level',
    category: 'pet_ownership_experience',
    type: 'select',
    text: 'How would you describe your experience level with pets?',
    helpText: null,
    placeholder: null,
    options: ['First-time owner', 'Some experience', 'Experienced', 'Very experienced'],
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'has_pets',
    category: 'pet_ownership_experience',
    type: 'boolean',
    text: 'Do you currently have any other pets?',
    helpText: null,
    placeholder: null,
    options: null,
    displayOrder: 1,
    isRequired: true,
  },
  {
    key: 'current_pets',
    category: 'pet_ownership_experience',
    type: 'text',
    text: 'If yes, please describe your current pets.',
    helpText: 'Include species, breed, age, and whether they are neutered/spayed.',
    placeholder: 'e.g. 3-year-old neutered male Labrador',
    options: null,
    displayOrder: 2,
    isRequired: false,
  },
  {
    key: 'previous_pets',
    category: 'pet_ownership_experience',
    type: 'text',
    text: 'Have you owned pets in the past? If so, what happened to them?',
    helpText: null,
    placeholder: 'e.g. Owned a dog for 12 years — passed away from old age in 2020',
    options: null,
    displayOrder: 3,
    isRequired: false,
  },
  {
    key: 'training_experience',
    category: 'pet_ownership_experience',
    type: 'text',
    text: 'Do you have any experience training animals?',
    helpText: null,
    placeholder: 'e.g. Completed basic obedience classes with previous dog',
    options: null,
    displayOrder: 4,
    isRequired: false,
  },
  {
    key: 'hours_alone',
    category: 'lifestyle_compatibility',
    type: 'select',
    text: 'How many hours per day would the pet typically be left alone?',
    helpText: null,
    placeholder: null,
    options: ['Less than 2 hours', '2–4 hours', '4–6 hours', '6–8 hours', 'More than 8 hours'],
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'exercise_plan',
    category: 'lifestyle_compatibility',
    type: 'text',
    text: 'How would you provide exercise and enrichment for the pet?',
    helpText: null,
    placeholder: 'e.g. Daily 30-minute walks, weekend hikes, playing fetch in the garden',
    options: null,
    displayOrder: 1,
    isRequired: true,
  },
  {
    key: 'pet_sleeping_location',
    category: 'lifestyle_compatibility',
    type: 'select',
    text: 'Where would the pet sleep?',
    helpText: null,
    placeholder: null,
    options: [
      'Indoors — own bed or crate',
      'Indoors — bedroom with us',
      'Outdoors — shelter provided',
      'Will vary / not decided yet',
    ],
    displayOrder: 2,
    isRequired: true,
  },
  {
    key: 'vet_registered',
    category: 'pet_care_commitment',
    type: 'boolean',
    text: 'Are you registered with a local vet?',
    helpText: null,
    placeholder: null,
    options: null,
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'vet_practice',
    category: 'pet_care_commitment',
    type: 'text',
    text: 'What is the name and location of your vet practice?',
    helpText: null,
    placeholder: 'e.g. Greenfield Veterinary Practice, Manchester',
    options: null,
    displayOrder: 1,
    isRequired: false,
  },
  {
    key: 'pet_costs_prepared',
    category: 'pet_care_commitment',
    type: 'select',
    text: 'Are you prepared for the ongoing financial costs of pet ownership?',
    helpText: 'Food, veterinary care, insurance, grooming, and supplies can add up significantly.',
    placeholder: null,
    options: [
      'Yes — I have budgeted for all ongoing costs',
      'Yes — I understand the costs involved',
      'Mostly — I may need to research some costs further',
    ],
    displayOrder: 2,
    isRequired: true,
  },
  {
    key: 'pet_if_circumstances_change',
    category: 'pet_care_commitment',
    type: 'text',
    text: 'What would you do if your circumstances changed and you could no longer care for the pet?',
    helpText: 'e.g. moving abroad, serious illness, changes in housing.',
    placeholder: null,
    options: null,
    displayOrder: 3,
    isRequired: true,
  },
  {
    key: 'reference_name',
    category: 'references_verification',
    type: 'text',
    text: 'Please provide the full name of a personal reference.',
    helpText: 'This should be someone who knows you well but is not a family member.',
    placeholder: null,
    options: null,
    displayOrder: 0,
    isRequired: false,
  },
  {
    key: 'reference_contact',
    category: 'references_verification',
    type: 'text',
    text: 'What is the best way to contact your reference?',
    helpText: 'Phone number or email address.',
    placeholder: null,
    options: null,
    displayOrder: 1,
    isRequired: false,
  },
  {
    key: 'reference_relationship',
    category: 'references_verification',
    type: 'text',
    text: 'What is your relationship to this reference?',
    helpText: null,
    placeholder: 'e.g. Friend, colleague, neighbour',
    options: null,
    displayOrder: 2,
    isRequired: false,
  },
  {
    key: 'why_adopt',
    category: 'final_acknowledgments',
    type: 'text',
    text: 'Why do you want to adopt this pet?',
    helpText: 'Tell us a bit about why you feel this is the right pet for you and your household.',
    placeholder: null,
    options: null,
    displayOrder: 0,
    isRequired: true,
  },
  {
    key: 'agree_home_visit',
    category: 'final_acknowledgments',
    type: 'boolean',
    text: 'Do you agree to a home visit as part of the adoption process?',
    helpText: null,
    placeholder: null,
    options: null,
    displayOrder: 1,
    isRequired: true,
  },
  {
    key: 'agree_terms',
    category: 'final_acknowledgments',
    type: 'boolean',
    text: 'Do you confirm that all information you have provided is truthful and accurate?',
    helpText:
      'Providing false information may result in your application being declined and future applications being refused.',
    placeholder: null,
    options: null,
    displayOrder: 2,
    isRequired: true,
  },
];

const literal = (value: string | null): string =>
  value === null ? 'NULL' : `'${value.replaceAll("'", "''")}'`;

const arrayLiteral = (values: readonly string[] | null): string =>
  values === null ? 'NULL' : `ARRAY[${values.map(literal).join(', ')}]::text[]`;

// A key-derived id marks the rows this migration inserted, so `down` removes
// those and never a core question that predates it (skipped by ON CONFLICT).
const seededId = (q: CoreQuestion): string =>
  `md5('013_core_application_question:' || ${literal(q.key)})::uuid`;

const toValuesRow = (q: CoreQuestion): string =>
  `(${seededId(q)}, 'core', NULL, ${literal(q.key)}, ` +
  `${literal(q.category)}::rescue.application_question_category, ` +
  `${literal(q.type)}::rescue.application_question_type, ${literal(q.text)}, ` +
  `${literal(q.helpText)}, ${literal(q.placeholder)}, ${arrayLiteral(q.options)}, ` +
  `${q.displayOrder}, true, ${q.isRequired})`;

export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `INSERT INTO rescue.application_questions
       (question_id, scope, rescue_id, question_key, category, question_type, question_text,
        help_text, placeholder, options, display_order, is_enabled, is_required)
     VALUES
       ${CORE_APPLICATION_QUESTIONS.map(toValuesRow).join(',\n       ')}
     ON CONFLICT (question_key) WHERE scope = 'core' AND deleted_at IS NULL DO NOTHING`
  );
};

export const down = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.sql(
    `DELETE FROM rescue.application_questions WHERE question_id IN (${CORE_APPLICATION_QUESTIONS.map(
      seededId
    ).join(', ')})`
  );
};
