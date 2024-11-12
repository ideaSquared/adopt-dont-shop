// src/services/RatingService.ts
import { Rating, RatingType } from './Ratings'

const API_BASE_URL = 'http://localhost:5000/api'

export const getAllRatings = async (): Promise<Rating[]> => {
  const response = await fetch(`${API_BASE_URL}/ratings`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch ratings')
  }
  return response.json()
}

export const getRatingsByPetId = async (pet_id: string): Promise<Rating[]> => {
  const response = await fetch(`${API_BASE_URL}/ratings/pet/${pet_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch ratings by pet ID')
  }
  return response.json()
}

export const getRatingsByUserId = async (
  user_id: string,
): Promise<Rating[]> => {
  const response = await fetch(`${API_BASE_URL}/ratings/user/${user_id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch ratings by user ID')
  }
  return response.json()
}

export const getRatingsByType = async (type: RatingType): Promise<Rating[]> => {
  const response = await fetch(`${API_BASE_URL}/ratings?type=${type}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch ratings by type')
  }
  return response.json()
}

export default {
  getAllRatings,
  getRatingsByPetId,
  getRatingsByUserId,
  getRatingsByType,
}
