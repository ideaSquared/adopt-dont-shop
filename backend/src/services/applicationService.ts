import { Op } from 'sequelize'
import { Application, Pet } from '../Models/'

export const createApplication = async (data: any) => {
  return Application.create(data)
}

export const getAllApplications = async () => {
  return Application.findAll()
}

export const getApplicationById = async (applicationId: string) => {
  return Application.findByPk(applicationId)
}

export const getApplicationsByRescueId = async (rescueId: string) => {
  try {
    // Step 1: Find all pets belonging to the specified rescue
    const pets = await Pet.findAll({
      where: { owner_id: rescueId },
      attributes: ['pet_id'], // Only retrieve the pet_id field to keep it light
    })

    // Extract pet IDs from the result
    const petIds = pets.map((pet) => pet.pet_id)

    // Skip Application.findAll if there are no pets
    if (petIds.length === 0) {
      return []
    }

    // Step 2: Find applications for these pets
    const applications = await Application.findAll({
      where: { pet_id: { [Op.in]: petIds } },
    })

    return applications
  } catch (error) {
    // Type assertion for error handling
    if (error instanceof Error) {
      throw new Error(
        `Error fetching applications for rescue: ${error.message}`,
      )
    }
    // If error is not an instance of Error, throw a generic message
    throw new Error('An unknown error occurred while fetching applications')
  }
}
export const updateApplication = async (applicationId: string, data: any) => {
  const application = await Application.findByPk(applicationId)
  if (application) {
    return application.update(data)
  }
  return null
}

export const deleteApplication = async (applicationId: string) => {
  const application = await Application.findByPk(applicationId)
  if (application) {
    await application.destroy()
    return true
  }
  return false
}
