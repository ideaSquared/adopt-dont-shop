import { PetRescue } from './Pets'

// Base URL for the backend API
const BASE_URL = 'http://localhost:5000/api' // adjust the URL as needed

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
}

// Fetch all pets
export const getPets = async (): Promise<PetRescue[]> => {
  const response = await fetch(`${BASE_URL}/pets`, {
    method: 'GET',
    headers,
  })
  if (!response.ok) {
    throw new Error('Failed to fetch pets')
  }
  return await response.json()
}

// Fetch a pet by ID
export const getPetById = async (
  pet_id: string,
): Promise<PetRescue | undefined> => {
  const response = await fetch(`${BASE_URL}/pets/${pet_id}`, {
    method: 'GET',
    headers,
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch pet with id ${pet_id}`)
  }
  return await response.json()
}

// Fetch pets by type
export const getPetsByType = async (type: string): Promise<PetRescue[]> => {
  const response = await fetch(
    `${BASE_URL}/pets?type=${encodeURIComponent(type)}`,
    {
      method: 'GET',
      headers,
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch pets of type ${type}`)
  }
  return await response.json()
}

// Update a pet by ID
export const updatePet = async (
  pet_id: string,
  updatedData: Partial<PetRescue>,
): Promise<PetRescue> => {
  const response = await fetch(`${BASE_URL}/pets/${pet_id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updatedData),
  })
  if (!response.ok) {
    throw new Error(`Failed to update pet with id ${pet_id}`)
  }
  return await response.json()
}

// Delete a pet by ID
export const deletePet = async (pet_id: string): Promise<void> => {
  const response = await fetch(`${BASE_URL}/pets/${pet_id}`, {
    method: 'DELETE',
    headers,
  })
  if (!response.ok) {
    throw new Error(`Failed to delete pet with id ${pet_id}`)
  }
}

export default {
  getPets,
  getPetById,
  getPetsByType,
  updatePet,
  deletePet,
}
