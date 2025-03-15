// src/types/AuthenticatedRequest.ts
import { Request } from 'express'
import { User } from '../Models'

export interface AuthenticatedRequest extends Request {
  user?: User
}
