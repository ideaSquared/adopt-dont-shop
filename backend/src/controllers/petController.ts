import { Response } from 'express'
import { AuditLogger } from '../services/auditLogService'
import * as PetService from '../services/petService'
import { AuthenticatedRequest } from '../types'

export const getAllPets = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    AuditLogger.logAction(
      'PetController',
      'Attempting to fetch all pets',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const pets = await PetService.getAllPets()

    AuditLogger.logAction(
      'PetController',
      `Successfully fetched ${pets.length} pets`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    res.status(200).json(pets)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to fetch pets: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Error fetching pets' })
  }
}

/**
 * Get pets for a specific rescue.
 * @param req - Express request object.
 * @param res - Express response object.
 */
export const getAllPetsByRescueId = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const rescueId = req.user?.rescue_id
  if (!rescueId) {
    AuditLogger.logAction(
      'PetController',
      'Attempt to fetch pets without rescue ID',
      'WARNING',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(400).json({ error: 'Rescue ID is required' })
    return
  }

  try {
    AuditLogger.logAction(
      'PetController',
      `Attempting to fetch pets for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const pets = await PetService.getAllPetsByRescueId(rescueId)

    AuditLogger.logAction(
      'PetController',
      `Successfully fetched ${pets.length} pets for rescue: ${rescueId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    res.status(200).json(pets)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to fetch pets for rescue ${rescueId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: errorMessage })
  }
}

export const getPetById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const petId = req.params.pet_id

  try {
    AuditLogger.logAction(
      'PetController',
      `Attempting to fetch pet: ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const pet = await PetService.getPetById(petId)

    if (pet) {
      AuditLogger.logAction(
        'PetController',
        `Successfully fetched pet: ${petId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(200).json(pet)
    } else {
      AuditLogger.logAction(
        'PetController',
        `Pet not found: ${petId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to fetch pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Error fetching pet' })
  }
}

export const createPet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    AuditLogger.logAction(
      'PetController',
      'Attempting to create new pet',
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const pet = await PetService.createPet(req.body)

    AuditLogger.logAction(
      'PetController',
      `Successfully created pet: ${pet.pet_id}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    res.status(201).json(pet)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to create pet: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Error creating pet' })
  }
}

export const updatePet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const petId = req.params.pet_id

  try {
    AuditLogger.logAction(
      'PetController',
      `Attempting to update pet: ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const updatedPet = await PetService.updatePet(petId, req.body)

    if (updatedPet) {
      AuditLogger.logAction(
        'PetController',
        `Successfully updated pet: ${petId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(200).json(updatedPet)
    } else {
      AuditLogger.logAction(
        'PetController',
        `Pet not found for update: ${petId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to update pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Error updating pet' })
  }
}

export const deletePet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const petId = req.params.pet_id

  try {
    AuditLogger.logAction(
      'PetController',
      `Attempting to delete pet: ${petId}`,
      'INFO',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )

    const deleted = await PetService.deletePet(petId)

    if (deleted) {
      AuditLogger.logAction(
        'PetController',
        `Successfully deleted pet: ${petId}`,
        'INFO',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(204).send()
    } else {
      AuditLogger.logAction(
        'PetController',
        `Pet not found for deletion: ${petId}`,
        'WARNING',
        req.user?.user_id || null,
        AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
      )
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    AuditLogger.logAction(
      'PetController',
      `Failed to delete pet ${petId}: ${errorMessage}`,
      'ERROR',
      req.user?.user_id || null,
      AuditLogger.getAuditOptions(req, 'PET_MANAGEMENT'),
    )
    res.status(500).json({ error: 'Error deleting pet' })
  }
}
