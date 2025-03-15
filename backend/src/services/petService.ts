import { Rating } from '../Models'
import Pet, { PetAttributes, PetCreationAttributes } from '../Models/Pet'

export const getAllPets = async (): Promise<Pet[]> => {
  const pets = await Pet.findAll()

  return pets
}

/**
 * Fetch pets by rescue ID.
 * @param rescueId - The rescue ID to filter pets.
 * @returns Promise resolving to an array of pets for the specified rescue.
 */
export const getAllPetsByRescueId = async (
  rescueId: string,
): Promise<Pet[]> => {
  const pets = await Pet.findAll({ where: { owner_id: rescueId } })

  return pets
}

export const getPetById = async (petId: string): Promise<Pet | null> => {
  const pet = await Pet.findByPk(petId)
  if (!pet) {
    return null
  }

  return pet
}

export const createPet = async (
  petData: PetCreationAttributes,
): Promise<Pet> => {
  const pet = await Pet.create(petData)

  return pet
}

export const updatePet = async (
  petId: string,
  petData: Partial<PetAttributes>,
): Promise<Pet | null> => {
  const pet = await Pet.findByPk(petId)
  if (!pet) {
    return null
  }
  await pet.update(petData)

  return pet
}

export const deletePet = async (petId: string): Promise<boolean> => {
  await Rating.destroy({ where: { pet_id: petId } })
  // await Conversation.destroy({ where: { pet_id: petId } })

  const deletedCount = await Pet.destroy({ where: { pet_id: petId } })
  if (deletedCount > 0) {
    return true
  } else {
    return false
  }
}

export const verifyPetOwnership = async (
  userRescueId: string | null,
  petId: string,
): Promise<boolean> => {
  const pet = await Pet.findByPk(petId)
  if (!pet) {
    return false // Pet not found
  }
  return pet.owner_id === userRescueId // Check ownership
}
