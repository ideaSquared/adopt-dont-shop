import { Request, Response } from 'express'
import * as participantService from '../services/participantService'

export const getAllParticipantsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const participants = await participantService.getAllParticipants()
    res.status(200).json(participants)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getParticipantByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const participant = await participantService.getParticipantById(
      req.params.id,
    )
    if (participant) {
      res.status(200).json(participant)
    } else {
      res.status(404).json({ message: 'Participant not found' })
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const createParticipantController = async (
  req: Request,
  res: Response,
) => {
  try {
    const participant = await participantService.createParticipant(req.body)
    res.status(201).json(participant)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
