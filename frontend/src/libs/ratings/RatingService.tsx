// src/services/RatingService.ts
import { apiService } from '../api-service'
import { Rating, RatingType } from './Ratings'

export const getAllRatings = async (): Promise<Rating[]> => {
  return apiService.get<Rating[]>('/ratings')
}

export const getRatingsByPetId = async (pet_id: string): Promise<Rating[]> => {
  return apiService.get<Rating[]>(`/ratings/pet/${pet_id}`)
}

export const getRatingsByUserId = async (
  user_id: string,
): Promise<Rating[]> => {
  return apiService.get<Rating[]>(`/ratings/user/${user_id}`)
}

export const getRatingsByType = async (type: RatingType): Promise<Rating[]> => {
  return apiService.get<Rating[]>(`/ratings?type=${type}`)
}

export default {
  getAllRatings,
  getRatingsByPetId,
  getRatingsByUserId,
  getRatingsByType,
}
