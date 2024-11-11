import { Conversation, Rating } from '../Models'
import Pet, { PetAttributes, PetCreationAttributes } from '../Models/Pet'

export const getAllPets = async (): Promise<Pet[]> => {
  return await Pet.findAll()
}

export const getPetById = async (petId: string): Promise<Pet | null> => {
  return await Pet.findByPk(petId)
}

export const createPet = async (
  petData: PetCreationAttributes,
): Promise<Pet> => {
  return await Pet.create(petData)
}

export const updatePet = async (
  petId: string,
  petData: Partial<PetAttributes>,
): Promise<Pet | null> => {
  const pet = await Pet.findByPk(petId)
  if (pet) {
    await pet.update(petData)
    return pet
  }
  return null
}

export const deletePet = async (petId: string): Promise<boolean> => {
  // First, delete associated ratings
  //   TODO: Maybe use cascading here on sequelize - this works for now
  await Rating.destroy({ where: { pet_id: petId } })
  await Conversation.destroy({ where: { pet_id: petId } })

  // Then, delete the pet
  const deletedCount = await Pet.destroy({ where: { pet_id: petId } })
  return deletedCount > 0
}
