import { Op } from 'sequelize'
import { Application, Pet, User } from '../Models/'

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
  // Step 1: Find all pets belonging to the specified rescue
  const pets = await Pet.findAll({
    where: { owner_id: rescueId },
    attributes: ['pet_id'],
  })

  const petIds = pets.map((pet) => pet.pet_id)

  if (petIds.length === 0) {
    return []
  }

  // Step 2: Find applications for these pets
  const applications = await Application.findAll({
    where: { pet_id: { [Op.in]: petIds } },
  })

  if (applications.length === 0) {
    return []
  }

  // Step 3: Extract unique IDs
  const applicationPetIds = Array.from(
    new Set(applications.map((app) => app.pet_id)),
  )
  const userIds = Array.from(new Set(applications.map((app) => app.user_id)))
  const actionedByIds = Array.from(
    new Set(
      applications.map((app) => app.actioned_by).filter((id) => id != null),
    ),
  )

  // Step 4: Fetch pet names
  const petsData = await Pet.findAll({
    where: { pet_id: { [Op.in]: applicationPetIds } },
    attributes: ['pet_id', 'name'],
  })

  const petsMap: { [key: string]: string } = {}
  petsData.forEach((pet) => {
    petsMap[pet.pet_id] = pet.name
  })

  // Step 5: Fetch applicant user info
  const usersData = await User.findAll({
    where: { user_id: { [Op.in]: userIds } },
    attributes: ['user_id', 'first_name'],
  })

  const usersMap: { [key: string]: string } = {}
  usersData.forEach((user) => {
    usersMap[user.user_id] = user.first_name
  })

  // Step 6: Fetch actioned_by user info
  let actionedByMap: { [key: string]: string } = {}
  if (actionedByIds.length > 0) {
    const actionedByData = await User.findAll({
      where: { user_id: { [Op.in]: actionedByIds } },
      attributes: ['user_id', 'first_name'],
    })
    actionedByData.forEach((user) => {
      actionedByMap[user.user_id] = user.first_name
    })
  }

  // Step 7: Enrich applications with additional data
  const enrichedApplications = applications.map((app) => ({
    ...app.toJSON(),
    pet_name: petsMap[app.pet_id] || null,
    applicant_first_name: usersMap[app.user_id] || null,
    actioned_by_first_name: app.actioned_by
      ? actionedByMap[app.actioned_by] || null
      : null,
  }))

  return enrichedApplications
}

export const updateApplication = async (
  applicationId: string,
  data: any,
  userId: string,
) => {
  const application = await Application.findByPk(applicationId)
  if (application) {
    const updatedApplication = application.update({
      ...data,
      actioned_by: userId,
    })

    return updatedApplication
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
