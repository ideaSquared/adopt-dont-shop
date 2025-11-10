/**
 * Rescue-related type definitions
 */

export interface AdoptionPolicy {
  requireHomeVisit: boolean;
  requireReferences: boolean;
  minimumReferenceCount: number;
  requireVeterinarianReference: boolean;
  adoptionFeeRange: {
    min: number;
    max: number;
  };
  requirements: string[];
  policies: string[];
  returnPolicy?: string;
  spayNeuterPolicy?: string;
  followUpPolicy?: string;
}

export interface RescueSettings {
  adoptionPolicies?: AdoptionPolicy;
  autoApprovalEnabled?: boolean;
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}
