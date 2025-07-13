import { JsonObject } from './common';

/**
 * Phase 1 - Enhanced User Profile Types
 * These types support the core application data reuse functionality.
 * Enables users to save default application data to reduce repetitive form filling.
 */

/**
 * User's saved application defaults for form pre-population
 * Contains reusable data that can be applied to multiple adoption applications
 */
export interface ApplicationDefaults {
  /** Personal contact information */
  personalInfo?: {
    /** User's first name */
    firstName?: string;
    /** User's last name */
    lastName?: string;
    /** Email address */
    email?: string;
    /** Phone number (UK format preferred) */
    phone?: string;
    /** Street address */
    address?: string;
    /** City name */
    city?: string;
    /** County (UK format) - changed from state for UK compliance */
    county?: string;
    /** Postal code (UK format) - changed from zipCode for UK compliance */
    postcode?: string;
    /** Country - added for international support */
    country?: string;
    /** Date of birth in ISO format */
    dateOfBirth?: string;
    /** Occupation/job title */
    occupation?: string;
  };
  /** Living situation and housing details */
  livingSituation?: {
    /** Type of housing */
    housingType?: 'house' | 'apartment' | 'condo' | 'other';
    /** Whether the residence is owned or rented */
    isOwned?: boolean;
    /** Whether there is a yard or garden */
    hasYard?: boolean;
    /** Size of the yard if applicable */
    yardSize?: 'small' | 'medium' | 'large';
    /** Whether the yard is fenced */
    yardFenced?: boolean;
    /** Whether pets are allowed in the residence */
    allowsPets?: boolean;
    /** Landlord contact information if renting */
    landlordContact?: string;
    /** Number of people in the household */
    householdSize?: number;
    /** Details about other household members */
    householdMembers?: Array<{
      /** Name of household member */
      name: string;
      /** Age of household member */
      age: number;
      /** Relationship to applicant */
      relationship: string;
    }>;
    /** Whether anyone in household has pet allergies */
    hasAllergies?: boolean;
    /** Details about allergies if applicable */
    allergyDetails?: string;
  };
  /** Pet ownership experience and preferences */
  petExperience?: {
    /** Whether currently owns pets */
    hasPetsCurrently?: boolean;
    /** Information about current pets */
    currentPets?: Array<{
      /** Type of pet (dog, cat, etc.) */
      type: string;
      /** Breed if known */
      breed?: string;
      /** Age in years */
      age: number;
      /** Whether pet is spayed/neutered */
      spayedNeutered: boolean;
      /** Whether pet is vaccinated */
      vaccinated: boolean;
    }>;
    /** Information about previous pets */
    previousPets?: Array<{
      /** Type of pet (dog, cat, etc.) */
      type: string;
      breed?: string;
      yearsOwned: number;
      whatHappened: string;
    }>;
    experienceLevel?: 'beginner' | 'some' | 'experienced' | 'expert';
    willingToTrain?: boolean;
    hoursAloneDaily?: number;
    exercisePlans?: string;
  };
  references?: {
    veterinarian?: {
      name: string;
      clinicName: string;
      phone: string;
      email?: string;
      yearsUsed: number;
    };
    personal?: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      yearsKnown: number;
    }>;
  };
  additionalInfo?: {
    whyAdopt?: string;
    expectations?: string;
    emergencyPlan?: string;
  };
}

// Application Preferences
export interface ApplicationPreferences {
  auto_populate: boolean;
  save_drafts: boolean;
  quick_apply_enabled: boolean;
  completion_reminders: boolean;
  default_pet_types?: string[];
  preferred_contact_method?: 'email' | 'phone' | 'both';
  notification_frequency?: 'immediate' | 'daily' | 'weekly';
}

// Profile Completion Tracking
export interface ProfileCompletionStatus {
  basic_info: boolean;
  living_situation: boolean;
  pet_experience: boolean;
  references: boolean;
  overall_percentage: number;
  last_updated: Date | null;
  completed_sections: string[];
  recommended_next_steps: string[];
}

// Enhanced User Profile combining existing and new fields
export interface EnhancedUserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  location?: { type: string; coordinates: [number, number] };

  // New application-related fields
  applicationDefaults?: ApplicationDefaults;
  applicationPreferences?: ApplicationPreferences;
  profileCompletionStatus?: ProfileCompletionStatus;
  applicationTemplateVersion?: number;

  // Existing fields
  privacySettings?: JsonObject;
  notificationPreferences?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response types for API endpoints
export interface UpdateApplicationDefaultsRequest {
  applicationDefaults: Partial<ApplicationDefaults>;
}

export interface UpdateApplicationPreferencesRequest {
  applicationPreferences: Partial<ApplicationPreferences>;
}

export interface ProfileCompletionResponse {
  completionStatus: ProfileCompletionStatus;
  missingFields: string[];
  recommendations: string[];
  canQuickApply: boolean;
}

// Application Pre-population Data
export interface ApplicationPrePopulationData {
  personalInfo?: ApplicationDefaults['personalInfo'];
  livingSituation?: ApplicationDefaults['livingSituation'];
  petExperience?: ApplicationDefaults['petExperience'];
  references?: ApplicationDefaults['references'];
  source: 'profile_defaults' | 'previous_application' | 'manual_entry';
  lastUpdated: Date;
}

// Quick Application Request
export interface QuickApplicationRequest {
  petId: string;
  useDefaultData: boolean;
  customizations?: {
    additionalInfo?: ApplicationDefaults['additionalInfo'];
    petSpecificNotes?: string;
  };
}

// Application Template Metadata
export interface ApplicationTemplateMetadata {
  version: number;
  requiredFields: string[];
  optionalFields: string[];
  petTypeSpecific: boolean;
  rescueCustomizations: boolean;
  lastModified: Date;
}
