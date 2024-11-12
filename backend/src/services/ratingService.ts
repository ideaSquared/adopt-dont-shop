import Rating from '../Models/Rating'

export const createRatingService = async (data: any) => {
  return Rating.create(data)
}

export const getAllRatingsService = async () => {
  return Rating.findAll()
}

export const getRatingByIdService = async (ratingId: string) => {
  return Rating.findByPk(ratingId)
}

export const getRatingsByUserIdService = async (userId: string) => {
  return Rating.findAll({ where: { user_id: userId } })
}

export const getRatingsByPetIdService = async (petId: string) => {
  return Rating.findAll({ where: { pet_id: petId } })
}

export const updateRatingService = async (ratingId: string, data: any) => {
  const rating = await Rating.findByPk(ratingId)
  if (rating) {
    return rating.update(data)
  }
  return null
}

export const deleteRatingService = async (ratingId: string) => {
  const rating = await Rating.findByPk(ratingId)
  if (rating) {
    await rating.destroy()
    return true
  }
  return false
}
