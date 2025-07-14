/**
 * Comprehensive Validation Schema and Real-time Validation
 */

import { ApplicationData } from '@/types';
import { z } from 'zod';

// Phone number validation regex
const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/;

// Email validation (more strict than default)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// UK postcode validation
const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;

// Validation schemas for each step
export const personalInfoSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'First name can only contain letters, spaces, hyphens, and apostrophes'
    ),

  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(
      /^[a-zA-Z\s'-]+$/,
      'Last name can only contain letters, spaces, hyphens, and apostrophes'
    ),

  email: z
    .string()
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Please enter a valid email address'),

  phone: z.string().regex(phoneRegex, 'Please enter a valid phone number (7-15 digits)'),

  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must not exceed 200 characters'),

  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(50, 'City must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'City can only contain letters, spaces, hyphens, and apostrophes'),

  county: z
    .string()
    .min(2, 'County must be at least 2 characters')
    .max(50, 'County must not exceed 50 characters')
    .optional(),

  postcode: z.string().regex(ukPostcodeRegex, 'Please enter a valid UK postcode'),

  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(50, 'Country must not exceed 50 characters'),

  dateOfBirth: z
    .string()
    .optional()
    .refine(date => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 18 && age <= 120;
    }, 'You must be at least 18 years old'),

  occupation: z.string().max(100, 'Occupation must not exceed 100 characters').optional(),
});

export const livingSituationSchema = z
  .object({
    housingType: z.enum(['house', 'apartment', 'flat', 'farm', 'other'], {
      errorMap: () => ({ message: 'Please select a housing type' }),
    }),

    isOwned: z.boolean(),

    hasYard: z.boolean(),

    yardSize: z
      .string()
      .optional()
      .refine(size => {
        if (!size) return true;
        return ['small', 'medium', 'large'].includes(size);
      }, 'Please select a valid yard size'),

    yardFenced: z.boolean().optional(),

    allowsPets: z.boolean({
      errorMap: () => ({ message: 'Please confirm if pets are allowed' }),
    }),

    landlordContact: z
      .string()
      .max(200, 'Landlord contact must not exceed 200 characters')
      .optional(),

    householdSize: z
      .number()
      .int('Household size must be a whole number')
      .min(1, 'Household size must be at least 1')
      .max(20, 'Household size seems unusually large')
      .optional(),

    hasAllergies: z.boolean(),

    allergyDetails: z
      .string()
      .max(500, 'Allergy details must not exceed 500 characters')
      .optional(),
  })
  .refine(
    data => {
      // If rented and pets allowed, landlord contact should be provided
      if (!data.isOwned && data.allowsPets && !data.landlordContact) {
        return false;
      }
      return true;
    },
    {
      message: 'Landlord contact is required for rental properties',
      path: ['landlordContact'],
    }
  );

export const petExperienceSchema = z.object({
  hasPetsCurrently: z.boolean(),

  experienceLevel: z.enum(['beginner', 'some_experience', 'experienced', 'expert'], {
    errorMap: () => ({ message: 'Please select your experience level' }),
  }),

  willingToTrain: z.boolean(),

  hoursAloneDaily: z
    .number()
    .int('Hours must be a whole number')
    .min(0, 'Hours cannot be negative')
    .max(24, 'Hours cannot exceed 24'),

  exercisePlans: z
    .string()
    .min(10, 'Please provide at least 10 characters describing your exercise plans')
    .max(1000, 'Exercise plans must not exceed 1000 characters'),

  currentPets: z
    .array(
      z.object({
        type: z.string().min(1, 'Pet type is required'),
        breed: z.string().min(1, 'Pet breed is required'),
        age: z.number().min(0, 'Age cannot be negative').max(50, 'Age seems unusually high'),
        spayedNeutered: z.boolean(),
      })
    )
    .optional(),

  previousPets: z
    .array(
      z.object({
        type: z.string().min(1, 'Pet type is required'),
        breed: z.string().min(1, 'Pet breed is required'),
        yearsOwned: z
          .number()
          .min(0, 'Years owned cannot be negative')
          .max(50, 'Years owned seems unusually high'),
        whatHappened: z.string().min(5, 'Please describe what happened to this pet'),
      })
    )
    .optional(),
});

export const referencesSchema = z.object({
  veterinarian: z
    .object({
      name: z.string().min(2, 'Veterinarian name must be at least 2 characters'),
      clinicName: z.string().min(2, 'Clinic name must be at least 2 characters'),
      phone: z.string().regex(phoneRegex, 'Please enter a valid phone number'),
      email: z.string().email('Please enter a valid email address').optional(),
      yearsUsed: z
        .number()
        .min(0, 'Years used cannot be negative')
        .max(50, 'Years used seems unusually high'),
    })
    .optional(),

  personal: z
    .array(
      z.object({
        name: z.string().min(2, 'Reference name must be at least 2 characters'),
        relationship: z.string().min(2, 'Relationship must be at least 2 characters'),
        phone: z.string().regex(phoneRegex, 'Please enter a valid phone number'),
        email: z.string().email('Please enter a valid email address').optional(),
        yearsKnown: z
          .number()
          .min(0, 'Years known cannot be negative')
          .max(100, 'Years known seems unusually high'),
      })
    )
    .max(3, 'Maximum 3 personal references allowed')
    .optional(),
});

export const additionalInfoSchema = z.object({
  whyAdopt: z
    .string()
    .min(20, 'Please provide at least 20 characters explaining why you want to adopt')
    .max(2000, 'Response must not exceed 2000 characters'),

  expectations: z
    .string()
    .min(20, 'Please provide at least 20 characters describing your expectations')
    .max(2000, 'Response must not exceed 2000 characters'),

  emergencyPlan: z
    .string()
    .min(20, 'Please provide at least 20 characters describing your emergency plan')
    .max(2000, 'Response must not exceed 2000 characters'),

  agreement: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
});

// Full application schema
export const applicationSchema = z.object({
  personalInfo: personalInfoSchema,
  livingsituation: livingSituationSchema,
  petExperience: petExperienceSchema,
  references: referencesSchema,
  additionalInfo: additionalInfoSchema,
});

// Validation functions
export function validateStep(
  stepNumber: number,
  data: unknown
): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  let schema: z.ZodSchema;

  switch (stepNumber) {
    case 1:
      schema = personalInfoSchema;
      break;
    case 2:
      schema = livingSituationSchema;
      break;
    case 3:
      schema = petExperienceSchema;
      break;
    case 4:
      schema = referencesSchema;
      break;
    case 5:
      schema = additionalInfoSchema;
      break;
    default:
      return { isValid: true, errors: {} };
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, errors: {} };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach(error => {
    const path = error.path.join('.');
    errors[path] = error.message;
  });

  return { isValid: false, errors };
}

export function validateField(
  stepNumber: number,
  fieldName: string,
  value: unknown
): {
  isValid: boolean;
  error?: string;
} {
  try {
    let schema: z.ZodSchema;

    switch (stepNumber) {
      case 1:
        schema = personalInfoSchema;
        break;
      case 2:
        schema = livingSituationSchema;
        break;
      case 3:
        schema = petExperienceSchema;
        break;
      case 4:
        schema = referencesSchema;
        break;
      case 5:
        schema = additionalInfoSchema;
        break;
      default:
        return { isValid: true };
    }

    // For field validation, we need to handle it differently based on the schema type
    // Create a partial validation by checking if the field would pass validation
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const fieldSchema = shape[fieldName];

      if (fieldSchema) {
        const result = fieldSchema.safeParse(value);
        if (result.success) {
          return { isValid: true };
        }

        const error = result.error.errors[0];
        return { isValid: false, error: error?.message || 'Invalid value' };
      }
    }

    return { isValid: true }; // Field not found in schema, assume valid
  } catch {
    return { isValid: true }; // If we can't validate, assume it's valid
  }
}

// Data sanitization
export function sanitizeApplicationData(data: Partial<ApplicationData>): Partial<ApplicationData> {
  const sanitized = { ...data };

  // Sanitize personal info
  if (sanitized.personalInfo) {
    sanitized.personalInfo = {
      ...sanitized.personalInfo,
      firstName: sanitized.personalInfo.firstName?.trim(),
      lastName: sanitized.personalInfo.lastName?.trim(),
      email: sanitized.personalInfo.email?.toLowerCase().trim(),
      phone: sanitized.personalInfo.phone?.replace(/\s+/g, ''),
      address: sanitized.personalInfo.address?.trim(),
      city: sanitized.personalInfo.city?.trim(),
      county: sanitized.personalInfo.county?.trim(),
      postcode: sanitized.personalInfo.postcode?.toUpperCase().replace(/\s+/g, ' ').trim(),
      country: sanitized.personalInfo.country?.trim(),
      occupation: sanitized.personalInfo.occupation?.trim(),
    };
  }

  // Sanitize text fields
  if (sanitized.livingsituation?.allergyDetails) {
    sanitized.livingsituation.allergyDetails = sanitized.livingsituation.allergyDetails.trim();
  }

  if (sanitized.petExperience?.exercisePlans) {
    sanitized.petExperience.exercisePlans = sanitized.petExperience.exercisePlans.trim();
  }

  if (sanitized.additionalInfo) {
    sanitized.additionalInfo = {
      ...sanitized.additionalInfo,
      whyAdopt: sanitized.additionalInfo.whyAdopt?.trim(),
      expectations: sanitized.additionalInfo.expectations?.trim(),
      emergencyPlan: sanitized.additionalInfo.emergencyPlan?.trim(),
    };
  }

  return sanitized;
}
