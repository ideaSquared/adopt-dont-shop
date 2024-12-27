import { Pet } from '../Models'

// Add pet images (append to the images array in the Pet model)
export const addPetImages = async (
  petId: string,
  images: { image_url: string }[],
) => {
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      throw new Error('Pet not found')
    }

    // Ensure pet.images is an array
    const existingImages = Array.isArray(pet.images) ? pet.images : []

    // Create the updated images array
    const updatedImages = [
      ...existingImages,
      ...images.map((image) => image.image_url),
    ]

    // Update the images field
    pet.images = updatedImages
    await pet.save()

    return pet.images
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error to add pet images: ${error.message}`)
    }
    throw new Error('An unknown error occurred while adding pet images')
  }
}

// Fetch pet images (return the images array)
export const fetchPetImages = async (petId: string) => {
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      throw new Error('Pet not found')
    }

    return pet.images || []
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error to fetch pet images: ${error.message}`)
    }
    throw new Error('An unknown error occurred while fetching pet images')
  }
}

// Remove a pet image (filter out the image from the images array)
export const removePetImage = async (
  petId: string,
  imageUrl: string,
): Promise<boolean> => {
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      // Return false if the pet is not found
      return false
    }

    const updatedImages = pet.images.filter(
      (image: string) => image !== imageUrl,
    )

    if (updatedImages.length === pet.images.length) {
      // Return false if the image was not found in the pet's images
      return false
    }

    pet.images = updatedImages
    await pet.save()

    return true
  } catch (error) {
    throw new Error(
      `An unknown error occurred while removing pet images: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}
