// Rescue configuration types for settings management

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
  state: string;
  zipCode: string;
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

export interface AdoptionPolicy {
  requireHomeVisit: boolean;
  requireReferences: boolean;
  minimumReferenceCount: number;
  requireVeterinarianReference: boolean;
  adoptionFeeRange: {
    min: number;
    max: number;
  };
  requirements: string[]; // List of adoption requirements
  policies: string[]; // List of policies
  returnPolicy?: string;
  spayNeuterPolicy?: string;
  followUpPolicy?: string;
}

export interface RescuePreferences {
  notificationSettings: {
    emailNotifications: boolean;
    newApplicationAlerts: boolean;
    reminderAlerts: boolean;
    weeklyDigest: boolean;
  };
  autoResponseSettings: {
    enabled: boolean;
    applicationReceivedMessage?: string;
    applicationApprovedMessage?: string;
    applicationRejectedMessage?: string;
  };
  workflowSettings: {
    defaultApplicationWorkflow: 'standard' | 'expedited' | 'thorough';
    autoProgressEnabled: boolean;
    requireApprovalForProgress: boolean;
  };
}
