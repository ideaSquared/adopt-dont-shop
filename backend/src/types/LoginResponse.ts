import { Rescue } from './Rescue'
import { User } from './User'

export interface LoginResponse {
  token: string
  user: User
  rescue?: Rescue
}
