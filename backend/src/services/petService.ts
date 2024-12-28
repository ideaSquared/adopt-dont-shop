import { Conversation, Rating } from '../Models'
import Pet, { PetAttributes, PetCreationAttributes } from '../Models/Pet'
import { AuditLogger } from './auditLogService'

export const getAllPets = async (): Promise<Pet[]> => {
  await AuditLogger.logAction('PetService', 'Fetching all pets', 'INFO')
  try {
    const pets = await Pet.findAll()
    await AuditLogger.logAction(
      'PetService',
      'Successfully fetched all pets',
      'INFO',
    )
    return pets
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error fetching all pets - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch pets: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      'Unknown error while fetching all pets',
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching pets')
  }
}

export const getPetById = async (petId: string): Promise<Pet | null> => {
  await AuditLogger.logAction(
    'PetService',
    `Fetching pet by ID: ${petId}`,
    'INFO',
  )
  try {
    const pet = await Pet.findByPk(petId)
    if (!pet) {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found`,
        'WARNING',
      )
      return null
    }
    await AuditLogger.logAction(
      'PetService',
      `Successfully fetched pet with ID: ${petId}`,
      'INFO',
    )
    return pet
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error fetching pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch pet: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while fetching pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching the pet')
  }
}

export const createPet = async (
  petData: PetCreationAttributes,
): Promise<Pet> => {
  await AuditLogger.logAction(
    'PetService',
    `Creating a new pet with data: ${JSON.stringify(petData)}`,
    'INFO',
  )
  try {
    const pet = await Pet.create(petData)
    await AuditLogger.logAction(
      'PetService',
      `Successfully created a new pet with ID: ${pet.pet_id}`,
      'INFO',
    )
    return pet
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error creating a new pet - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to create pet: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      'Unknown error while creating a new pet',
      'ERROR',
    )
    throw new Error('An unknown error occurred while creating the pet')
  }
}

export const updatePet = async (
  petId: string,
  petData: Partial<PetAttributes>,
): Promise<Pet | null> => {
  await AuditLogger.logAction(
    'PetService',
    `Updating pet with ID: ${petId}`,
    'INFO',
  )
  try {
    const pet = await Pet.findByPk(petId)
    if (!pet) {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found for update`,
        'WARNING',
      )
      return null
    }
    await pet.update(petData)
    await AuditLogger.logAction(
      'PetService',
      `Successfully updated pet with ID: ${petId}`,
      'INFO',
    )
    return pet
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error updating pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to update pet: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while updating pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while updating the pet')
  }
}

export const deletePet = async (petId: string): Promise<boolean> => {
  await AuditLogger.logAction(
    'PetService',
    `Deleting pet with ID: ${petId}`,
    'INFO',
  )
  try {
    await Rating.destroy({ where: { pet_id: petId } })
    await Conversation.destroy({ where: { pet_id: petId } })

    const deletedCount = await Pet.destroy({ where: { pet_id: petId } })
    if (deletedCount > 0) {
      await AuditLogger.logAction(
        'PetService',
        `Successfully deleted pet with ID: ${petId}`,
        'INFO',
      )
      return true
    } else {
      await AuditLogger.logAction(
        'PetService',
        `Pet with ID: ${petId} not found for deletion`,
        'WARNING',
      )
      return false
    }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'PetService',
        `Error deleting pet with ID: ${petId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to delete pet: ${error.message}`)
    }
    await AuditLogger.logAction(
      'PetService',
      `Unknown error while deleting pet with ID: ${petId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while deleting the pet')
  }
}
