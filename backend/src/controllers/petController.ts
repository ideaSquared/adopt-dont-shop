import { Response } from 'express'
import * as PetService from '../services/petService'
import { AuthenticatedRequest } from '../types'

export const getAllPets = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const pets = await PetService.getAllPets()
    res.status(200).json(pets)
  } catch (error) {
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
    res.status(400).json({ error: 'Rescue ID is required' })
    return
  }

  try {
    const pets = await PetService.getAllPetsByRescueId(rescueId)
    res.status(200).json(pets)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
}

export const getPetById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const pet = await PetService.getPetById(req.params.pet_id)
    if (pet) {
      res.status(200).json(pet)
    } else {
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching pet' })
  }
}

export const createPet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const pet = await PetService.createPet(req.body)
    res.status(201).json(pet)
  } catch (error) {
    res.status(500).json({ error: 'Error creating pet' })
  }
}

export const updatePet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const updatedPet = await PetService.updatePet(req.params.pet_id, req.body)
    if (updatedPet) {
      res.status(200).json(updatedPet)
    } else {
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating pet' })
  }
}

export const deletePet = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const deleted = await PetService.deletePet(req.params.pet_id)
    if (deleted) {
      res.status(204).send()
    } else {
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting pet' })
  }
}
