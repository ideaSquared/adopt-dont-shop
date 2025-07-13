// User and Authentication Types
export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  userType: 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification' | 'deactivated';
  profileImageUrl?: string;
  bio?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  location?: {
    type?: string;
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  privacySettings?: {
    profileVisibility?: string;
    showLocation?: boolean;
    allowMessages?: boolean;
    showAdoptionHistory?: boolean;
  };
  notificationPreferences?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
  timezone?: string;
  language?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  termsAcceptedAt?: string;
  privacyPolicyAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  phone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'both';
  preferences?: {
    petTypes?: string[];
    maxDistance?: number;
    newsletterOptIn?: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  userType?: 'adopter' | 'rescue_staff' | 'admin' | 'moderator';
  // Legacy field for frontend form compatibility
  confirmPassword?: string;
}

export interface AuthResponse {
  user: User;
  token: string; // Backend returns 'token', not 'accessToken'
  refreshToken: string;
  expiresIn: number;
  // Legacy field for frontend compatibility
  accessToken?: string;
}

// Pet Types - Updated to match backend API response
export interface Pet {
  pet_id: string;
  name: string;
  rescue_id: string;
  short_description: string;
  long_description: string;
  age_years: number;
  age_months: number;
  age_group: 'young' | 'adult' | 'senior';
  gender: 'male' | 'female';
  status: 'available' | 'pending' | 'adopted' | 'on_hold' | 'medical_care';
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed: string;
  secondary_breed?: string;
  weight_kg: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  color: string;
  markings?: string;
  microchip_id: string;
  archived: boolean;
  featured: boolean;
  priority_listing: boolean;
  adoption_fee: string;
  special_needs: boolean;
  special_needs_description?: string;
  house_trained: boolean;
  good_with_children?: boolean;
  good_with_dogs?: boolean;
  good_with_cats?: boolean;
  good_with_small_animals?: boolean;
  energy_level: 'low' | 'medium' | 'high' | 'very_high';
  exercise_needs: string;
  grooming_needs: string;
  training_notes?: string;
  temperament: string[];
  medical_notes?: string;
  behavioral_notes?: string;
  surrender_reason?: string;
  intake_date: string;
  vaccination_status: 'unknown' | 'partial' | 'up_to_date';
  vaccination_date?: string;
  spay_neuter_status: 'unknown' | 'intact' | 'spayed' | 'neutered';
  spay_neuter_date?: string;
  last_vet_checkup?: string;
  images: PetImage[];
  videos: PetVideo[];
  location: {
    type: string;
    coordinates: [number, number];
    crs?: {
      type: string;
      properties: {
        name: string;
      };
    };
  };
  available_since: string;
  adopted_date?: string;
  foster_start_date?: string;
  foster_end_date?: string;
  view_count: number;
  favorite_count: number;
  application_count: number;
  search_vector: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Rescue information (joined from rescue table)
  rescue?: {
    name: string;
    location?: string;
    phone?: string;
    email?: string;
  };
}

export interface PetImage {
  url: string;
  caption?: string;
  image_id: string;
  is_primary: boolean;
  order_index: number;
  uploaded_at: string;
  thumbnail_url?: string;
}

export interface PetVideo {
  url: string;
  caption?: string;
  video_id: string;
  order_index: number;
  uploaded_at: string;
  thumbnail_url?: string;
}

// Legacy interface for backward compatibility - maps new structure to old
export interface PetPhoto {
  photoId: string;
  url: string;
  isPrimary: boolean;
  caption?: string;
  order: number;
}

export interface PetSearchFilters {
  search?: string;
  type?: string;
  breed?: string;
  age?: {
    min?: number;
    max?: number;
  };
  ageGroup?: string;
  size?: string;
  gender?: string;
  status?: string;
  location?: string;
  maxDistance?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Response Types
export interface ApiResponse<T> {
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
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Application Types
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
    county: string; // Changed from state to county for UK
    postcode: string; // Changed from zipCode to postcode for UK
    country: string; // Added country field for international support
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

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_references'
  | 'home_visit_scheduled'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'on_hold';

export interface Application {
  id: string;
  petId: string;
  userId: string;
  rescueId: string;
  status: ApplicationStatus;
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

// Rescue Types
export interface Rescue {
  rescueId: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registrationNumber?: string;
  contactPerson: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: 'pending' | 'verified' | 'suspended' | 'inactive';
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
  // Computed properties for backwards compatibility
  verified: boolean;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  type: 'individual' | 'organization';
}

// Swipe Interface Types
export interface SwipeSession {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  totalSwipes: number;
  likes: number;
  passes: number;
  superLikes: number;
  filters: PetSearchFilters;
}

export interface SwipeAction {
  action: 'like' | 'pass' | 'super_like' | 'info';
  petId: string;
  timestamp: string;
  sessionId: string;
}

export interface PetDiscoveryQueue {
  pets: DiscoveryPet[];
  currentIndex: number;
  hasMore: boolean;
  nextBatchSize: number;
}

export interface SwipeStats {
  totalSessions: number;
  totalSwipes: number;
  totalLikes: number;
  totalPasses: number;
  totalSuperLikes: number;
  likeToSwipeRatio: number;
  averageSessionDuration: number;
  favoriteBreeds: string[];
  favoriteAgeGroups: string[];
}

// Discovery-specific types for optimized responses
export interface DiscoveryPet {
  petId: string;
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed?: string;
  ageGroup: 'baby' | 'young' | 'adult' | 'senior';
  ageYears?: number;
  ageMonths?: number;
  size: 'extra_small' | 'small' | 'medium' | 'large' | 'extra_large';
  gender: 'male' | 'female' | 'unknown';
  images: string[];
  shortDescription?: string;
  distance?: number;
  rescueName: string;
  isSponsored?: boolean;
  compatibilityScore?: number;
}

export interface DiscoveryQueue {
  pets: DiscoveryPet[];
  sessionId: string;
  hasMore: boolean;
  nextCursor?: string;
}
