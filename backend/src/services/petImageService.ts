import { Pet } from '../Models'

// Add pet images (append to the images array in the Pet model)
export const addPetImages = async (
  petId: string,
  images: { image_url: string }[],
) => {
  const pet = await Pet.findByPk(petId)

  if (!pet) {
    throw new Error('Pet not found')
  }

  const existingImages = Array.isArray(pet.images) ? pet.images : []
  const updatedImages = [
    ...existingImages,
    ...images.map((image) => image.image_url),
  ]

  pet.images = updatedImages
  await pet.save()

  return pet.images
}

// Fetch pet images (return the images array)
export const fetchPetImages = async (petId: string) => {
  const pet = await Pet.findByPk(petId)

  if (!pet) {
    throw new Error('Pet not found')
  }

  return pet.images || []
}

// Remove a pet image (filter out the image from the images array)
export const removePetImage = async (
  petId: string,
  imageUrl: string,
): Promise<boolean> => {
  const pet = await Pet.findByPk(petId)

  if (!pet) {
    return false
  }

  const updatedImages = pet.images.filter((image: string) => image !== imageUrl)

  if (updatedImages.length === pet.images.length) {
    return false
  }

  pet.images = updatedImages
  await pet.save()

  return true
}
