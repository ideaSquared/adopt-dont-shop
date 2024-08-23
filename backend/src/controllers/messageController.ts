import { Request, Response } from 'express'
import * as messageService from '../services/messageService'

export const getAllMessages = async (req: Request, res: Response) => {
  try {
    const messages = await messageService.getAllMessages()
    res.status(200).json(messages)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getMessageById = async (req: Request, res: Response) => {
  try {
    const message = await messageService.getMessageById(req.params.id)
    if (message) {
      res.status(200).json(message)
    } else {
      res.status(404).json({ message: 'Message not found' })
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const getMessagesByConversationId = async (
  req: Request,
  res: Response,
) => {
  try {
    const message = await messageService.getMessagesByConversationId(
      req.params.conversationId,
    )
    if (message) {
      res.status(200).json(message)
    } else {
      res.status(404).json({ message: 'Message not found' })
    }
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}

export const createMessage = async (req: Request, res: Response) => {
  try {
    const message = await messageService.createMessage(req.body)
    res.status(201).json(message)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
