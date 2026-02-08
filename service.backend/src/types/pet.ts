import {
  AgeGroup,
  EnergyLevel,
  Gender,
  PetAttributes,
  PetCreationAttributes,
  PetStatus,
  PetType,
  Size,
  SpayNeuterStatus,
  VaccinationStatus,
} from '../models/Pet';
import { PaginationOptions } from './api';
import { ContactInfo, JsonObject, JsonValue } from './common';

// Pet Search and Filtering Types
export interface PetSearchFilters {
  search?: string;
  type?: PetType;
  status?: PetStatus;
  gender?: Gender;
  size?: Size;
  ageGroup?: AgeGroup;
  energyLevel?: EnergyLevel;
  breed?: string;
  rescueId?: string;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithSmallAnimals?: boolean;
  houseTrained?: boolean;
  specialNeeds?: boolean;
  featured?: boolean;
  archived?: boolean;
  vaccinationStatus?: VaccinationStatus;
  spayNeuterStatus?: SpayNeuterStatus;
  adoptionFeeMin?: number;
  adoptionFeeMax?: number;
  weightMin?: number;
  weightMax?: number;
  ageMin?: number;
  ageMax?: number;
  availableSince?: Date;
  availableUntil?: Date;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  latitude?: number;
  longitude?: number;
  maxDistance?: number; // in miles
}

export interface PetSearchOptions extends PaginationOptions {
  includeArchived?: boolean;
  includeAdopted?: boolean;
  includeFeatured?: boolean;
  nearLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

// Pet Update Types
export interface PetUpdateData {
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  ageYears?: number;
  ageMonths?: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  status?: PetStatus;
  breed?: string;
  secondaryBreed?: string;
  weightKg?: number;
  size?: Size;
  color?: string;
  markings?: string;
  microchipId?: string;
  featured?: boolean;
  priorityListing?: boolean;
  adoptionFee?: number;
  specialNeeds?: boolean;
  specialNeedsDescription?: string;
  houseTrained?: boolean;
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithSmallAnimals?: boolean;
  energyLevel?: EnergyLevel;
  exerciseNeeds?: string;
  groomingNeeds?: string;
  trainingNotes?: string;
  temperament?: string[];
  medicalNotes?: string;
  behavioralNotes?: string;
  surrenderReason?: string;
  intakeDate?: Date;
  vaccinationStatus?: VaccinationStatus;
  vaccinationDate?: Date;
  spayNeuterStatus?: SpayNeuterStatus;
  spayNeuterDate?: Date;
  lastVetCheckup?: Date;
  tags?: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Pet Creation Types
export interface PetCreateData extends PetCreationAttributes {
  // Additional fields for creation
  initialImages?: PetImageData[];
  initialVideos?: PetVideoData[];
}

// Pet Image Types
export interface PetImageData {
  imageId?: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  isPrimary?: boolean;
  orderIndex?: number;
}

export interface PetImageUpdate extends PetImageData {
  imageId?: string;
}

// Pet Video Types
export interface PetVideoData {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  durationSeconds?: number;
}

export interface PetVideoUpdate extends PetVideoData {
  videoId?: string;
}

// Pet Status Update Types
export interface PetStatusUpdate {
  status: PetStatus;
  reason?: string;
  effectiveDate?: Date;
  notes?: string;
}

// Pet Statistics Types
export interface PetStatistics {
  totalPets: number;
  availablePets: number;
  adoptedPets: number;
  fosterPets: number;
  featuredPets: number;
  specialNeedsPets: number;
  petsByType: Record<PetType, number>;
  petsByStatus: Record<PetStatus, number>;
  petsBySize: Record<Size, number>;
  petsByAgeGroup: Record<AgeGroup, number>;
  averageAdoptionTime: number; // in days
  monthlyAdoptions: MonthlyAdoptionStats[];
  popularBreeds: BreedStats[];
}

export interface MonthlyAdoptionStats {
  month: string;
  year: number;
  adoptions: number;
  newIntakes: number;
}

export interface BreedStats {
  breed: string;
  count: number;
  percentage: number;
}

// Pet Activity Types
export interface PetActivity {
  petId: string;
  viewCount: number;
  favoriteCount: number;
  applicationCount: number;
  recentViews: ActivityItem[];
  recentApplications: ActivityItem[];
  daysSincePosted: number;
  averageViewsPerDay: number;
}

export interface ActivityItem {
  type: 'view' | 'favorite' | 'application' | 'inquiry';
  userId?: string;
  timestamp: Date;
  metadata?: JsonObject;
}

// Pet Matching Types
export interface PetMatchCriteria {
  petType: PetType;
  preferredSize?: Size[];
  preferredAgeGroup?: AgeGroup[];
  goodWithChildren?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithSmallAnimals?: boolean;
  energyLevel?: EnergyLevel[];
  specialNeedsOk?: boolean;
  maxAdoptionFee?: number;
  preferredBreeds?: string[];
  location?: {
    latitude: number;
    longitude: number;
    maxDistance: number;
  };
}

export interface PetMatchResult {
  pet: PetAttributes;
  matchScore: number;
  matchReasons: string[];
  distance?: number;
}

// Pet Favorites Types
export interface PetFavorite {
  userId: string;
  petId: string;
  createdAt: Date;
  notes?: string;
}

// Pet Inquiry Types
export interface PetInquiry {
  inquiryId: string;
  petId: string;
  userId: string;
  message: string;
  contactMethod: 'email' | 'phone' | 'app';
  preferredContactTime?: string;
  status: 'pending' | 'responded' | 'closed';
  createdAt: Date;
  respondedAt?: Date;
}

// Pet Report Types
export interface PetReport {
  reportId: string;
  petId: string;
  reportedBy: string;
  reason: 'inappropriate_content' | 'incorrect_info' | 'spam' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolution?: string;
}

// Pet Alert Types
export interface PetAlert {
  alertId: string;
  userId: string;
  searchCriteria: PetSearchFilters;
  frequency: 'immediate' | 'daily' | 'weekly';
  active: boolean;
  lastSent?: Date;
  createdAt: Date;
}

// Bulk Operations Types
export interface BulkPetOperation {
  petIds: string[];
  operation: 'update_status' | 'archive' | 'feature' | 'update_rescue' | 'delete';
  data?: JsonObject;
  reason?: string;
}

export interface BulkPetOperationResult {
  successCount: number;
  failedCount: number;
  errors: Array<{
    petId: string;
    error: string;
  }>;
}

// Pet Import/Export Types
export interface PetImportData {
  name: string;
  type: PetType;
  breed?: string;
  age?: string;
  gender: Gender;
  size: Size;
  description?: string;
  imageUrls?: string[];
  // ... other fields for bulk import
}

export interface PetExportData extends PetAttributes {
  rescueName: string;
  applicationCount: number;
  daysSincePosted: number;
}

// Pet Validation Types
export interface PetValidationError {
  field: string;
  message: string;
  value?: JsonValue;
}

export interface PetValidationResult {
  isValid: boolean;
  errors: PetValidationError[];
  warnings: PetValidationError[];
}

// Location Types
export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface LocationDistance {
  petId: string;
  distance: number; // in kilometers
  coordinates: [number, number];
}

// Pet API Response Types
export interface PetSearchResponse {
  pets: PetAttributes[];
  total: number;
  page: number;
  totalPages: number;
  filters: PetSearchFilters;
  facets?: {
    types: Record<PetType, number>;
    sizes: Record<Size, number>;
    ageGroups: Record<AgeGroup, number>;
    breeds: BreedStats[];
  };
}

export interface PetDetailsResponse extends PetAttributes {
  rescue: {
    rescueId: string;
    name: string;
    contactInfo: PetContactInfo;
  };
  relatedPets: PetAttributes[];
  isInUserFavorites?: boolean;
  userHasApplied?: boolean;
}

export interface PetData {
  // ... existing properties ...
  metadata?: JsonObject;
}

export interface UpdatePetRequest {
  // ... existing properties ...
  data?: JsonObject;
}

export interface PetSearchCriteria {
  // ... existing properties ...
  value?: JsonValue;
}

export interface AdoptionInquiry {
  // ... existing properties ...
  contactInfo: ContactInfo;
}

export interface PetCustomFieldValue {
  data?: JsonObject;
}

export interface ConfigurationValue {
  value?: JsonValue;
}

export interface PetContactInfo {
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}
