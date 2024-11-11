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

export const getPetById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const pet = await PetService.getPetById(req.params.id)
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
    const updatedPet = await PetService.updatePet(req.params.id, req.body)
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
    const deleted = await PetService.deletePet(req.params.id)
    if (deleted) {
      res.status(204).send()
    } else {
      res.status(404).json({ error: 'Pet not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting pet' })
  }
}
