import { Role } from '@adoptdontshop/permissions'

export interface User {
  user_id: string
  email: string
  first_name: string
  last_name: string
  email_verified: boolean
  verification_token?: string | null
  reset_token?: string | null
  reset_token_expiration?: string | null
  reset_token_force_flag?: boolean | null
  created_at?: string
  updated_at?: string
  country?: string | null
  city?: string | null
  location?: string | null
  roles: Role[]
  password?: string // Optional fields for user creation
  confirm_password?: string // Optional fields for user creation
}

export type LoginUser = Pick<User, 'email' | 'password'>
export type ResetPasswordUser = Pick<User, 'email'>

export interface CreateUserPayload {
  first_name: string
  last_name: string
  email: string
  password: string
}

export interface CreateRescuePayload extends CreateUserPayload {
  rescue_type: string
  rescue_name: string
  city: string
  country: string
  reference_number: string
}
