import Rating from '../Models/Rating'

export const createRatingService = async (data: any) => {
  const rating = await Rating.create(data)

  return rating
}

export const getAllRatingsService = async () => {
  const ratings = await Rating.findAll()

  return ratings
}

export const getRatingByIdService = async (ratingId: string) => {
  const rating = await Rating.findByPk(ratingId)
  if (!rating) {
    return null
  }

  return rating
}

export const getRatingsByUserIdService = async (userId: string) => {
  const ratings = await Rating.findAll({ where: { user_id: userId } })

  return ratings
}

export const getRatingsByPetIdService = async (petId: string) => {
  const ratings = await Rating.findAll({ where: { pet_id: petId } })

  return ratings
}

export const updateRatingService = async (ratingId: string, data: any) => {
  const rating = await Rating.findByPk(ratingId)
  if (!rating) {
    return null
  }
  await rating.update(data)

  return rating
}

export const deleteRatingService = async (ratingId: string) => {
  const rating = await Rating.findByPk(ratingId)
  if (!rating) {
    return false
  }
  await rating.destroy()

  return true
}
