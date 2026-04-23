import ApplicationQuestion, {
  QuestionCategory,
  QuestionScope,
  QuestionType,
} from '../models/ApplicationQuestion';
import { generateCryptoUuid as uuidv4 } from '../utils/uuid-helpers';

const coreQuestions: Array<{
  question_id: string;
  question_key: string;
  category: QuestionCategory;
  question_type: QuestionType;
  question_text: string;
  help_text: string | null;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
  is_required: boolean;
  is_enabled: boolean;
}> = [
  // Personal Information
  {
    question_id: uuidv4(),
    question_key: 'full_name',
    category: QuestionCategory.PERSONAL_INFORMATION,
    question_type: QuestionType.TEXT,
    question_text: 'What is your full name?',
    help_text: null,
    placeholder: 'First and last name',
    options: null,
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'contact_email',
    category: QuestionCategory.PERSONAL_INFORMATION,
    question_type: QuestionType.EMAIL,
    question_text: 'What is your email address?',
    help_text: 'We will use this to contact you about your application.',
    placeholder: 'you@example.com',
    options: null,
    display_order: 1,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'contact_phone',
    category: QuestionCategory.PERSONAL_INFORMATION,
    question_type: QuestionType.PHONE,
    question_text: 'What is your phone number?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 2,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'home_address',
    category: QuestionCategory.PERSONAL_INFORMATION,
    question_type: QuestionType.ADDRESS,
    question_text: 'What is your home address?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 3,
    is_required: true,
    is_enabled: true,
  },

  // Household Information
  {
    question_id: uuidv4(),
    question_key: 'home_type',
    category: QuestionCategory.HOUSEHOLD_INFORMATION,
    question_type: QuestionType.SELECT,
    question_text: 'What type of home do you live in?',
    help_text: null,
    placeholder: null,
    options: ['House with garden', 'Flat/Apartment', 'Terraced house', 'Bungalow', 'Other'],
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'home_ownership',
    category: QuestionCategory.HOUSEHOLD_INFORMATION,
    question_type: QuestionType.SELECT,
    question_text: 'Do you own or rent your home?',
    help_text: 'If renting, you may need landlord permission to keep a pet.',
    placeholder: null,
    options: ['Own', 'Rent', 'Live with family/parents', 'Other'],
    display_order: 1,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'household_adults',
    category: QuestionCategory.HOUSEHOLD_INFORMATION,
    question_type: QuestionType.NUMBER,
    question_text: 'How many adults (18+) live in your household?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 2,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'household_children',
    category: QuestionCategory.HOUSEHOLD_INFORMATION,
    question_type: QuestionType.NUMBER,
    question_text: 'How many children (under 18) live in your household?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 3,
    is_required: true,
    is_enabled: true,
  },

  // Pet Ownership Experience
  {
    question_id: uuidv4(),
    question_key: 'owned_pet_before',
    category: QuestionCategory.PET_OWNERSHIP_EXPERIENCE,
    question_type: QuestionType.BOOLEAN,
    question_text: 'Have you owned a pet before?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'current_pets',
    category: QuestionCategory.PET_OWNERSHIP_EXPERIENCE,
    question_type: QuestionType.TEXT,
    question_text: 'Do you currently have any other pets? If so, please describe them.',
    help_text: 'Include species, breed, age, and whether they are neutered/spayed.',
    placeholder: 'e.g. 3-year-old neutered male Labrador',
    options: null,
    display_order: 1,
    is_required: false,
    is_enabled: true,
  },

  // Lifestyle Compatibility
  {
    question_id: uuidv4(),
    question_key: 'hours_alone_per_day',
    category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
    question_type: QuestionType.SELECT,
    question_text: 'How many hours per day would the pet be left alone?',
    help_text: null,
    placeholder: null,
    options: ['Less than 2 hours', '2–4 hours', '4–6 hours', '6–8 hours', 'More than 8 hours'],
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'activity_level',
    category: QuestionCategory.LIFESTYLE_COMPATIBILITY,
    question_type: QuestionType.SELECT,
    question_text: 'How would you describe your activity level?',
    help_text: 'This helps us match you with a pet that suits your lifestyle.',
    placeholder: null,
    options: [
      'Low – mostly relaxed days at home',
      'Moderate – regular walks and some outings',
      'High – very active with lots of outdoor time',
    ],
    display_order: 1,
    is_required: true,
    is_enabled: true,
  },

  // Pet Care Commitment
  {
    question_id: uuidv4(),
    question_key: 'vet_registered',
    category: QuestionCategory.PET_CARE_COMMITMENT,
    question_type: QuestionType.BOOLEAN,
    question_text: 'Are you registered with a local vet?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'pet_if_circumstances_change',
    category: QuestionCategory.PET_CARE_COMMITMENT,
    question_text:
      'What would you do if your circumstances changed and you could no longer care for the pet?',
    question_type: QuestionType.TEXT,
    help_text: 'e.g. moving abroad, new baby, long-term illness.',
    placeholder: null,
    options: null,
    display_order: 1,
    is_required: true,
    is_enabled: true,
  },

  // References & Verification
  {
    question_id: uuidv4(),
    question_key: 'reference_name',
    category: QuestionCategory.REFERENCES_VERIFICATION,
    question_type: QuestionType.TEXT,
    question_text: 'Please provide the name of a personal reference (not a family member).',
    help_text: 'Someone who can vouch for your suitability as a pet owner.',
    placeholder: null,
    options: null,
    display_order: 0,
    is_required: false,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'reference_contact',
    category: QuestionCategory.REFERENCES_VERIFICATION,
    question_type: QuestionType.TEXT,
    question_text: 'Please provide a contact number or email for your reference.',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 1,
    is_required: false,
    is_enabled: true,
  },

  // Final Acknowledgments
  {
    question_id: uuidv4(),
    question_key: 'agree_home_visit',
    category: QuestionCategory.FINAL_ACKNOWLEDGMENTS,
    question_type: QuestionType.BOOLEAN,
    question_text: 'Do you agree to a home visit as part of the adoption process?',
    help_text: null,
    placeholder: null,
    options: null,
    display_order: 0,
    is_required: true,
    is_enabled: true,
  },
  {
    question_id: uuidv4(),
    question_key: 'agree_terms',
    category: QuestionCategory.FINAL_ACKNOWLEDGMENTS,
    question_type: QuestionType.BOOLEAN,
    question_text: 'Do you agree that the information you have provided is accurate and complete?',
    help_text: 'Providing false information may result in your application being rejected.',
    placeholder: null,
    options: null,
    display_order: 1,
    is_required: true,
    is_enabled: true,
  },
];

export async function seedApplicationQuestions(): Promise<void> {
  const existing = await ApplicationQuestion.count({
    where: { scope: QuestionScope.CORE },
  });

  if (existing > 0) {
    return;
  }

  await ApplicationQuestion.bulkCreate(
    coreQuestions.map(q => ({
      ...q,
      rescue_id: null,
      scope: QuestionScope.CORE,
      validation_rules: null,
      conditional_logic: null,
    }))
  );
}
