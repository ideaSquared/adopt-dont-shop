// Application types for lib.applications

export interface ApplicationData {
  petId: string;
  userId: string;
  rescueId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    county?: string;
    postcode?: string;
    country?: string;
    dateOfBirth?: string;
    occupation?: string;
  };
  livingsituation: {
    housingType: 'house' | 'apartment' | 'condo' | 'other';
    isOwned: boolean;
    hasYard: boolean;
    yardSize?: 'small' | 'medium' | 'large';
    yardFenced?: boolean;
    allowsPets: boolean;
    landlordContact?: string;
    householdSize: number;
    householdMembers?: Array<{
      name: string;
      age: number;
      relationship: string;
    }>;
    hasAllergies: boolean;
    allergyDetails?: string;
  };
  petExperience: {
    hasPetsCurrently: boolean;
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
    experienceLevel: 'beginner' | 'some' | 'experienced' | 'expert';
    willingToTrain: boolean;
    hoursAloneDaily: number;
    exercisePlans: string;
  };
  references: {
    veterinarian?: {
      name: string;
      clinicName: string;
      phone: string;
      email?: string;
      yearsUsed: number;
    };
    personal: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      yearsKnown: number;
    }>;
  };
  additionalInfo?: {
    whyAdopt: string;
    expectations: string;
    petName?: string;
    emergencyPlan: string;
    agreement: boolean;
  };
}

export type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

export type ApplicationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Application {
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  status: ApplicationStatus;
  priority?: ApplicationPriority;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  data: ApplicationData;
  documents?: Array<{
    id: string;
    type: string;
    filename: string;
    url: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithPetInfo extends Application {
  petName?: string;
  petType?: string;
  petBreed?: string;
}

export interface DocumentUpload {
  id: string;
  url: string;
  filename: string;
  type: string;
  uploadedAt: string;
}

export interface Document {
  id: string;
  applicationId: string;
  type: string;
  filename: string;
  url: string;
  uploadedAt: string;
  size?: number;
  mimeType?: string;
}

/**
 * Configuration options for ApplicationsService
 */
export interface ApplicationsServiceConfig {
  /**
   * API base URL
   */
  apiUrl?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Custom headers to include with requests
   */
  headers?: Record<string, string>;
}

/**
 * Options for ApplicationsService operations
 */
export interface ApplicationsServiceOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to use caching
   */
  useCache?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

// ADS-262: response envelopes are owned by @adopt-dont-shop/lib.types.
export type { BaseResponse, ErrorResponse, PaginatedResponse } from '@adopt-dont-shop/lib.types';
