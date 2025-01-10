// src/services/PetService.ts

import { apiService } from '../api-service'
import { PetRescue } from './Pets'

const API_BASE_URL = '/pets'

/**
 * Fetch all pets that a user can access based on rescue
 * @returns Promise resolving to an array of PetRescue objects.
 */
export const getPetsByRescueId = async (): Promise<PetRescue[]> => {
  return apiService.get<PetRescue[]>(API_BASE_URL)
}

/**
 * Fetch all pets.
 * @returns Promise resolving to an array of PetRescue objects.
 */
export const getAllPets = async (): Promise<PetRescue[]> => {
  return apiService.get<PetRescue[]>('/admin/pets')
}

/**
 * Fetch a pet by its ID.
 * @param pet_id - The ID of the pet to fetch.
 * @returns Promise resolving to a PetRescue object.
 */
export const getPetById = async (
  pet_id: string,
): Promise<PetRescue | undefined> => {
  return apiService.get<PetRescue>(`${API_BASE_URL}/${pet_id}`)
}

/**
 * Fetch pets by type.
 * @param type - The type of pets to fetch.
 * @returns Promise resolving to an array of PetRescue objects.
 */
export const getPetsByType = async (type: string): Promise<PetRescue[]> => {
  return apiService.get<PetRescue[]>(
    `${API_BASE_URL}?type=${encodeURIComponent(type)}`,
  )
}

/**
 * Update a pet by its ID.
 * @param pet_id - The ID of the pet to update.
 * @param updatedData - Partial data to update the pet.
 * @returns Promise resolving to the updated PetRescue object.
 */
export const updatePet = async (
  pet_id: string,
  updatedData: Partial<PetRescue>,
): Promise<PetRescue> => {
  return apiService.put<Partial<PetRescue>, PetRescue>(
    `${API_BASE_URL}/${pet_id}`,
    updatedData,
  )
}

/**
 * Delete a pet by its ID.
 * @param pet_id - The ID of the pet to delete.
 */
export const deletePet = async (pet_id: string): Promise<void> => {
  await apiService.delete<void>(`${API_BASE_URL}/${pet_id}`)
}

/**
 * Add images for a pet.
 * @param petId - The ID of the pet.
 * @param files - An array of image files to upload.
 * @returns Promise resolving to an array of saved image URLs.
 */
export const addPetImages = async (
  petId: string,
  files: File[],
): Promise<string[]> => {
  if (files.length === 0) {
    throw new Error('No images to upload')
  }

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await apiService.post<FormData, { savedImages: string[] }>(
    `/pets/${petId}/images`,
    formData,
    true, // Requires authentication
  )

  if (
    !response ||
    !response.savedImages ||
    !Array.isArray(response.savedImages)
  ) {
    throw new Error('Invalid response format: Missing or invalid "savedImages"')
  }

  return response.savedImages
}

/**
 * Fetch all images for a pet.
 * @param petId - The ID of the pet.
 * @returns Promise resolving to an array of image URLs.
 */
export const fetchPetImages = async (petId: string): Promise<string[]> => {
  return apiService.get<string[]>(`${API_BASE_URL}/${petId}/images`)
}

/**
 * Remove an image for a pet.
 * @param petId - The ID of the pet.
 * @param imageId - The ID of the image to remove.
 */
export const removePetImage = async (
  petId: string,
  imageId: string,
): Promise<void> => {
  await apiService.delete<void>(`${API_BASE_URL}/${petId}/images/${imageId}`)
}

export default {
  getPetsByRescueId,
  getAllPets,
  getPetById,
  getPetsByType,
  updatePet,
  deletePet,
  addPetImages,
  fetchPetImages,
  removePetImage,
}
