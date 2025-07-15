/**
 * Enhanced Profile Types for Application System
 * Defines interfaces for application defaults, pre-population, and profile completion
 */

export interface ApplicationDefaults {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    county?: string;
    postcode?: string;
    country?: string;
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
    experienceLevel?: 'beginner' | 'some' | 'experienced' | 'expert';
    willingToTrain?: boolean;
    hoursAloneDaily?: number;
    exercisePlans?: string;
    veterinarianInfo?: {
      name: string;
      clinic: string;
      phone: string;
    };
  };
  references?: {
    personal?: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    }>;
    veterinary?: {
      clinicName: string;
      doctorName: string;
      phone: string;
      email?: string;
    };
  };
  additionalInfo?: {
    motivationForAdoption?: string;
    preferredContactMethod?: 'phone' | 'email' | 'either';
    availableForContact?: {
      weekdays?: boolean;
      weekends?: boolean;
      preferredTime?: 'morning' | 'afternoon' | 'evening';
    };
  };
}

export interface ProfileCompletionStatus {
  personalInfoComplete: boolean;
  livingSituationComplete: boolean;
  petExperienceComplete: boolean;
  referencesComplete: boolean;
  overallCompleteness: number; // 0-1 representing percentage
  basic_info?: boolean;
  living_situation?: boolean;
  pet_experience?: boolean;
  references?: boolean;
  overall_percentage?: number;
  last_updated?: Date;
  completed_sections?: string[];
  recommended_next_steps?: string[];
}

export interface QuickApplicationCapability {
  canProceed: boolean;
  missingFields?: string[];
  recommendations?: string[];
  canQuickApply: boolean;
}

export interface ApplicationPrePopulationData {
  defaults: ApplicationDefaults;
  completionStatus: ProfileCompletionStatus;
  quickApplicationCapability: QuickApplicationCapability;
}

export interface ApplicationPrePopulationDataFlat {
  personalInfo?: ApplicationDefaults['personalInfo'];
  livingSituation?: ApplicationDefaults['livingSituation'];
  petExperience?: ApplicationDefaults['petExperience'];
  references?: ApplicationDefaults['references'];
  source: 'profile_defaults' | 'previous_application' | 'manual_entry';
  lastUpdated: Date;
}

export interface ApplicationPreferences {
  petTypes?: string[];
  agePreferences?: {
    min?: number;
    max?: number;
  };
  sizePreferences?: string[];
  activityLevel?: 'low' | 'medium' | 'high';
  specialNeeds?: boolean;
  locationRadius?: number;
  notifications?: {
    newMatches?: boolean;
    applicationUpdates?: boolean;
    generalNews?: boolean;
  };
}

export interface QuickApplicationRequest {
  petId: string;
  useDefaultData: boolean;
  customizations?: {
    additionalInfo?: ApplicationDefaults['additionalInfo'];
    petSpecificNotes?: string;
  };
}

export interface UpdateApplicationDefaultsRequest {
  applicationDefaults: Partial<ApplicationDefaults>;
}

export interface UpdateApplicationPreferencesRequest {
  applicationPreferences: Partial<ApplicationPreferences>;
}

export interface ProfileCompletionResponse {
  completionStatus: ProfileCompletionStatus;
  quickApplicationCapability: QuickApplicationCapability;
  prePopulationData: ApplicationDefaults;
  missingFields: string[];
  recommendations: string[];
  canQuickApply: boolean;
}
