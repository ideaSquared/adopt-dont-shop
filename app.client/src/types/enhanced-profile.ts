/**
 * Phase 1 - Enhanced Profile Types (Client Side)
 * Types for application defaults and pre-population functionality
 */

// Enhanced User Profile with Application Defaults
export interface ApplicationDefaults {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    county?: string; // Changed from state to county for UK
    postcode?: string; // Changed from zipCode to postcode for UK
    country?: string; // Added country field for international support
    dateOfBirth?: string;
    occupation?: string;
  };
  livingSituation?: {
    housingType?: 'house' | 'apartment' | 'condo' | 'other';
    isOwned?: boolean;
    hasYard?: boolean;
    yardSize?: 'small' | 'medium' | 'large';
    yardFenced?: boolean;
    allowsPets?: boolean;
    landlordContact?: string;
    householdSize?: number;
    householdMembers?: Array<{
      name: string;
      age: number;
      relationship: string;
    }>;
    hasAllergies?: boolean;
    allergyDetails?: string;
  };
  petExperience?: {
    hasPetsCurrently?: boolean;
    currentPets?: Array<{
      type: string;
      breed?: string;
      age: number;
      spayedNeutered: boolean;
      vaccinated: boolean;
    }>;
    previousPets?: Array<{
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

// Profile Completion Response
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
  lastSavedStep?: number;
}

// Quick Application Types
export interface QuickApplicationCapability {
  canProceed: boolean;
  prePopulationData?: ApplicationPrePopulationData;
  missingFields?: string[];
  completionPercentage?: number;
}

// Profile Setup Progress
export interface ProfileSetupProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  nextRecommendedStep: string;
  estimatedTimeToComplete: number; // in minutes
}
