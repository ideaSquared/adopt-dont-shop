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
  [key: string]: any;
}
