import { Request, Response } from 'express'
import * as conversationService from '../services/conversationService'

export const getAllConversationsController = async (req: Request, res: Response) => {
  try {
    const conversations = await conversationService.getAllConversations()
    res.status(200).json(conversations)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    } else {
      res.status(500).json({ message: 'An unknown error occurred' })
    }
  }
}
