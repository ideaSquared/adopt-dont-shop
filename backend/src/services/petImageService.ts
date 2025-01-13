import { Pet } from '../Models'
import { AuditLogger } from './auditLogService'

// Add pet images (append to the images array in the Pet model)
export const addPetImages = async (
  petId: string,
  images: { image_url: string }[],
) => {
  await AuditLogger.logAction(
    'PetService',
    `Adding images to pet with ID: ${petId}`,
    'INFO',
  )
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found while adding images`,
        'WARNING',
      )
      throw new Error('Pet not found')
    }

    const existingImages = Array.isArray(pet.images) ? pet.images : []
    const updatedImages = [
      ...existingImages,
      ...images.map((image) => image.image_url),
    ]

    pet.images = updatedImages
    await pet.save()

    await AuditLogger.logAction(
      'PetService',
      `Successfully added images to pet with ID: ${petId}`,
      'INFO',
    )
    return pet.images
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error adding images to pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Error to add pet images: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while adding images to pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while adding pet images')
  }
}

// Fetch pet images (return the images array)
export const fetchPetImages = async (petId: string) => {
  await AuditLogger.logAction(
    'PetService',
    `Fetching images for pet with ID: ${petId}`,
    'INFO',
  )
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found while fetching images`,
        'WARNING',
      )
      throw new Error('Pet not found')
    }

    await AuditLogger.logAction(
      'PetService',
      `Successfully fetched images for pet with ID: ${petId}`,
      'INFO',
    )
    return pet.images || []
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error fetching images for pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Error to fetch pet images: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while fetching images for pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching pet images')
  }
}

// Remove a pet image (filter out the image from the images array)
export const removePetImage = async (
  petId: string,
  imageUrl: string,
): Promise<boolean> => {
  await AuditLogger.logAction(
    'PetService',
    `Removing image '${imageUrl}' from pet with ID: ${petId}`,
    'INFO',
  )
  try {
    const pet = await Pet.findByPk(petId)

    if (!pet) {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found while removing image '${imageUrl}'`,
        'WARNING',
      )
      return false
    }

    const updatedImages = pet.images.filter(
      (image: string) => image !== imageUrl,
    )

    if (updatedImages.length === pet.images.length) {
      await AuditLogger.logAction(
        'PetService',
        `Image '${imageUrl}' not found in pet with ID: ${petId}`,
        'WARNING',
      )
      return false
    }

    pet.images = updatedImages
    await pet.save()

    await AuditLogger.logAction(
      'PetService',
      `Successfully removed image '${imageUrl}' from pet with ID: ${petId}`,
      'INFO',
    )
    return true
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error removing image '${imageUrl}' from pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Error removing pet image: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while removing image '${imageUrl}' from pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while removing pet image')
  }
}
