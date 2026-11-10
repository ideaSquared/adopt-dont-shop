// Rescue configuration types for settings management
import type { AdoptionPolicy } from '@adopt-dont-shop/lib.rescue';

// The adoption policy shape is owned by lib.rescue; re-exported so existing imports keep working.
export type { AdoptionPolicy };

export interface RescueProfile {
  rescueId: string;
  name: string;
  rescue_type: string;
  email: string;
  phone: string;
  address: RescueAddress;
  description?: string;
  website?: string;
  logo_url?: string;
  operatingHours?: OperatingHours[];
  applicationQuestions?: CustomQuestion[];
  adoptionPolicies?: AdoptionPolicy;
  verified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RescueAddress {
  street: string;
  city: string;
  county?: string; // UK: County (optional), was: state
  postcode: string; // UK: Postcode, was: zipCode
  country: string;
}

export interface OperatingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  isClosed: boolean;
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'yesno' | 'number' | 'date';
  required: boolean;
  options?: string[]; // For select/multiselect
  placeholder?: string;
  helpText?: string;
  order: number;
  section: 'personal' | 'living_situation' | 'pet_experience' | 'additional';
  validation?: QuestionValidation;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  min?: number; // For number type
  max?: number; // For number type
  pattern?: string; // Regex pattern
  errorMessage?: string;
}
