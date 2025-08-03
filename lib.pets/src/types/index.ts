// Pet and related types for lib.pets

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

export interface PetStats {
  totalPets: number;
  availablePets: number;
  adoptedPets: number;
  fosterPets: number;
  featuredPets: number;
  specialNeedsPets: number;
  petsByType: Record<string, number>;
  petsByStatus: Record<string, number>;
  petsBySize: Record<string, number>;
  petsByAgeGroup: Record<string, number>;
  averageAdoptionTime: number;
  monthlyAdoptions: Array<{
    month: string;
    year: number;
    adoptions: number;
    newIntakes: number;
  }>;
  popularBreeds: Array<{
    breed: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Pet status enum
 */
export type PetStatus =
  | 'available'
  | 'pending'
  | 'adopted'
  | 'on_hold'
  | 'medical_care'
  | 'foster'
  | 'not_available';

/**
 * Pet creation data interface for rescue staff
 */
export interface PetCreateData {
  name: string;
  type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed: string;
  secondaryBreed?: string;
  ageYears?: number;
  ageMonths?: number;
  ageGroup?: 'young' | 'adult' | 'senior';
  gender: 'male' | 'female';
  size: 'small' | 'medium' | 'large' | 'extra_large';
  color: string;
  markings?: string;
  weightKg?: string;
  microchipId?: string;
  shortDescription?: string;
  longDescription?: string;
  adoptionFee?: string;
  energyLevel?: 'low' | 'medium' | 'high' | 'very_high';
  exerciseNeeds?: string;
  groomingNeeds?: string;
  temperament?: string[];
  trainingNotes?: string;
  medicalNotes?: string;
  behavioralNotes?: string;
  surrenderReason?: string;
  specialNeeds?: boolean;
  specialNeedsDescription?: string;
  houseTrained?: boolean;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithSmallAnimals?: boolean;
  vaccinationStatus?: 'unknown' | 'partial' | 'up_to_date';
  vaccinationDate?: string;
  spayNeuterStatus?: 'unknown' | 'intact' | 'spayed' | 'neutered';
  spayNeuterDate?: string;
  lastVetCheckup?: string;
  intakeDate?: string;
  availableSince?: string;
  fosterStartDate?: string;
  fosterEndDate?: string;
  featured?: boolean;
  priorityListing?: boolean;
  tags?: string[];
  images?: string[];
  videos?: string[];
  rescueId: string;
}

/**
 * Pet update data interface for rescue staff
 */
export interface PetUpdateData {
  name?: string;
  type?: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed?: string;
  secondaryBreed?: string;
  ageYears?: number;
  ageMonths?: number;
  ageGroup?: 'young' | 'adult' | 'senior';
  gender?: 'male' | 'female';
  size?: 'small' | 'medium' | 'large' | 'extra_large';
  color?: string;
  markings?: string;
  weightKg?: string;
  microchipId?: string;
  shortDescription?: string;
  longDescription?: string;
  adoptionFee?: string;
  energyLevel?: 'low' | 'medium' | 'high' | 'very_high';
  exerciseNeeds?: string;
  groomingNeeds?: string;
  temperament?: string[];
  trainingNotes?: string;
  medicalNotes?: string;
  behavioralNotes?: string;
  surrenderReason?: string;
  specialNeeds?: boolean;
  specialNeedsDescription?: string;
  houseTrained?: boolean;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithSmallAnimals?: boolean;
  vaccinationStatus?: 'unknown' | 'partial' | 'up_to_date';
  vaccinationDate?: string;
  spayNeuterStatus?: 'unknown' | 'intact' | 'spayed' | 'neutered';
  spayNeuterDate?: string;
  lastVetCheckup?: string;
  intakeDate?: string;
  availableSince?: string;
  fosterStartDate?: string;
  fosterEndDate?: string;
  featured?: boolean;
  priorityListing?: boolean;
  tags?: string[];
  status?: PetStatus;
}

/**
 * Configuration options for PetsService
 */
export interface PetsServiceConfig {
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

