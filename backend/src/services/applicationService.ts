import { Op } from 'sequelize'
import { Application, Pet, User } from '../Models/'
import { AuditLogger } from './auditLogService'

export const createApplication = async (data: any) => {
  await AuditLogger.logAction(
    'ApplicationService',
    `Creating application with data: ${JSON.stringify(data)}`,
    'INFO',
  )
  return Application.create(data)
}

export const getAllApplications = async () => {
  await AuditLogger.logAction(
    'ApplicationService',
    'Fetching all applications',
    'INFO',
  )
  return Application.findAll()
}

export const getApplicationById = async (applicationId: string) => {
  await AuditLogger.logAction(
    'ApplicationService',
    `Fetching application by ID: ${applicationId}`,
    'INFO',
  )
  return Application.findByPk(applicationId)
}

export const getApplicationsByRescueId = async (rescueId: string) => {
  await AuditLogger.logAction(
    'ApplicationService',
    `Fetching applications for rescue ID: ${rescueId}`,
    'INFO',
  )
  try {
    // Step 1: Find all pets belonging to the specified rescue
    const pets = await Pet.findAll({
      where: { owner_id: rescueId },
      attributes: ['pet_id'],
    })

    const petIds = pets.map((pet) => pet.pet_id)

    if (petIds.length === 0) {
      await AuditLogger.logAction(
        'ApplicationService',
        `No pets found for rescue ID: ${rescueId}`,
        'WARNING',
      )
      return []
    }

    // Step 2: Find applications for these pets
    const applications = await Application.findAll({
      where: { pet_id: { [Op.in]: petIds } },
    })

    if (applications.length === 0) {
      await AuditLogger.logAction(
        'ApplicationService',
        `No applications found for pets belonging to rescue ID: ${rescueId}`,
        'WARNING',
      )
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
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'ApplicationService',
        `Error fetching applications for rescue ID: ${rescueId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(
        `Error fetching applications for rescue: ${error.message}`,
      )
    }
    await AuditLogger.logAction(
      'ApplicationService',
      `Error fetching applications for rescue ID: ${rescueId} - Unknown error`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching applications')
  }
}

export const updateApplication = async (
  applicationId: string,
  data: any,
  userId: string,
) => {
  await AuditLogger.logAction(
    'ApplicationService',
    `Updating application with ID: ${applicationId} by user ID: ${userId}`,
    'INFO',
  )
  const application = await Application.findByPk(applicationId)
  if (application) {
    const updatedApplication = application.update({
      ...data,
      actioned_by: userId,
    })
    await AuditLogger.logAction(
      'ApplicationService',
      `Application with ID: ${applicationId} successfully updated`,
      'INFO',
    )
    return updatedApplication
  }
  await AuditLogger.logAction(
    'ApplicationService',
    `Application with ID: ${applicationId} not found for update`,
    'WARNING',
  )
  return null
}

export const deleteApplication = async (applicationId: string) => {
  await AuditLogger.logAction(
    'ApplicationService',
    `Attempting to delete application with ID: ${applicationId}`,
    'INFO',
  )
  const application = await Application.findByPk(applicationId)
  if (application) {
    await application.destroy()
    await AuditLogger.logAction(
      'ApplicationService',
      `Application with ID: ${applicationId} successfully deleted`,
      'INFO',
    )
    return true
  }
  await AuditLogger.logAction(
    'ApplicationService',
    `Application with ID: ${applicationId} not found for deletion`,
    'WARNING',
  )
  return false
}
