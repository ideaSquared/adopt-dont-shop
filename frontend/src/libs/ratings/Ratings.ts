export type RatingType = 'like' | 'love' | 'dislike'

export interface Rating {
  rating_id: string
  pet_id: string
  user_id: string
  rating_type: RatingType
  created_at: Date
  updated_at: Date
}
