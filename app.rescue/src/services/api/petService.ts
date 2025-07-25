import { apiService } from '../api';

/**
 * Pet-related types and interfaces
 */
export interface Pet {
  pet_id: string;
  rescue_id: string;
  name: string;
  species: 'DOG' | 'CAT' | 'OTHER';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  neutered_spayed: boolean;
  description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: number;
  status: 'AVAILABLE' | 'PENDING' | 'ADOPTED' | 'UNAVAILABLE' | 'MEDICAL_HOLD';
  location?: string;
  microchip_id?: string;
  intake_date: string;
  photos?: PetPhoto[];
  created_at: string;
  updated_at: string;
}

export interface PetPhoto {
  photo_id: string;
  pet_id: string;
  url: string;
  caption?: string;
  is_primary: boolean;
  created_at: string;
}

export interface CreatePetRequest {
  name: string;
  species: Pet['species'];
  breed?: string;
  age_years?: number;
  age_months?: number;
  size: Pet['size'];
  gender: Pet['gender'];
  neutered_spayed: boolean;
  description?: string;
  medical_notes?: string;
  behavioral_notes?: string;
  adoption_fee?: number;
  location?: string;
  microchip_id?: string;
  intake_date: string;
}

export interface UpdatePetRequest extends Partial<CreatePetRequest> {
  status?: Pet['status'];
}

export interface PetListParams {
  page?: number;
  limit?: number;
  status?: Pet['status'];
  species?: Pet['species'];
  size?: Pet['size'];
  search?: string;
  sort?: 'name' | 'intake_date' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface PetListResponse {
  pets: Pet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all pets for the current rescue
 */
export const getPets = async (params?: PetListParams): Promise<PetListResponse> => {
  // The backend returns pets in the data property as an array
  // We need to adapt this to match our expected PetListResponse interface
  const response = await apiService.get<Pet[]>('/api/v1/pets', params);

  // If response is an array (which it will be after BaseApiService extracts data),
  // we need to create a proper PetListResponse structure
  if (Array.isArray(response)) {
    return {
      pets: response,
      total: response.length,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: Math.ceil(response.length / (params?.limit || 20)),
    };
  }

  // If for some reason the response has the expected structure, return it as-is
  return response as PetListResponse;
};

/**
 * Get a single pet by ID
 */
export const getPetById = async (petId: string): Promise<Pet> => {
  return await apiService.get<Pet>(`/api/v1/pets/${petId}`);
};

/**
 * Create a new pet
 */
export const createPet = async (petData: CreatePetRequest): Promise<Pet> => {
  return await apiService.post<Pet>('/api/v1/pets', petData);
};

/**
 * Update an existing pet
 */
export const updatePet = async (petId: string, petData: UpdatePetRequest): Promise<Pet> => {
  return await apiService.patch<Pet>(`/api/v1/pets/${petId}`, petData);
};

/**
 * Delete a pet
 */
export const deletePet = async (petId: string): Promise<void> => {
  return await apiService.delete<void>(`/api/v1/pets/${petId}`);
};

/**
 * Upload a photo for a pet
 */
export const uploadPetPhoto = async (
  petId: string,
  photo: File,
  caption?: string,
  isPrimary?: boolean
): Promise<PetPhoto> => {
  return await apiService.uploadFile<PetPhoto>(`/api/v1/pets/${petId}/photos`, photo, {
    caption,
    is_primary: isPrimary,
  });
};

/**
 * Delete a pet photo
 */
export const deletePetPhoto = async (petId: string, photoId: string): Promise<void> => {
  return await apiService.delete<void>(`/api/v1/pets/${petId}/photos/${photoId}`);
};
