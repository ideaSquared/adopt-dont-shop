// Re-export shared types from canonical library packages
export type { User, LoginRequest, RegisterRequest, AuthResponse } from '@adopt-dont-shop/lib.auth';
export type { Pet, PetImage, PetVideo, PetSearchFilters } from '@adopt-dont-shop/lib.pets';
export type {
  Application,
  ApplicationData,
  ApplicationStatus,
} from '@adopt-dont-shop/lib.applications';
export type {
  SwipeSession,
  SwipeAction,
  PetDiscoveryQueue,
  SwipeStats,
  DiscoveryPet,
  DiscoveryQueue,
} from '@adopt-dont-shop/lib.discovery';
export type { BaseResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';

// Legacy interface for backward compatibility - maps new structure to old
export type PetPhoto = {
  photoId: string;
  url: string;
  isPrimary: boolean;
  caption?: string;
  order: number;
};

// API Response type (simplified, app-specific wrapper)
export type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
  error?: string;
};

// Rescue Types (client-facing view)
export type Rescue = {
  rescueId: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  companiesHouseNumber?: string;
  charityRegistrationNumber?: string;
  contactPerson: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  settings?: {
    autoApproveApplications?: boolean;
    requireHomeVisit?: boolean;
    allowPublicContact?: boolean;
    adoptionFeeRange?: { min: number; max: number };
    [key: string]: unknown;
  };
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  verified: boolean;
  location: {
    address: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
  type: 'individual' | 'organization';
};

// Enhanced Profile Types for Application Defaults and Pre-population
export type ApplicationDefaults = {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
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
    petName?: string;
    emergencyPlan?: string;
    agreement?: boolean;
  };
  customAnswers?: Record<string, unknown>;
};

export type ApplicationPreferences = {
  auto_populate: boolean;
  quick_apply_enabled: boolean;
  completion_reminders: boolean;
  default_pet_types?: string[];
  preferred_contact_method?: 'email' | 'phone' | 'both';
  notification_frequency?: 'immediate' | 'daily' | 'weekly';
};

export type ProfileCompletionStatus = {
  basic_info: boolean;
  living_situation: boolean;
  pet_experience: boolean;
  references: boolean;
  overall_percentage: number;
  last_updated: Date | null;
  completed_sections: string[];
  recommended_next_steps: string[];
};

export type QuickApplicationCapability = {
  canProceed: boolean;
  completionPercentage: number;
  missingRequirements: string[];
  estimatedTimeMinutes: number;
  missingFields?: string[];
  prePopulationData?: ApplicationDefaults;
};

export type ApplicationPrePopulationData = {
  defaults: ApplicationDefaults;
  completionStatus: ProfileCompletionStatus;
  quickApplicationCapability: QuickApplicationCapability;
};

export type ProfileCompletionResponse = {
  completionStatus: ProfileCompletionStatus;
  quickApplicationCapability: QuickApplicationCapability;
  prePopulationData: ApplicationDefaults;
  missingFields: string[];
  recommendations: string[];
  canQuickApply: boolean;
};
