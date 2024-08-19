import { Model } from 'sequelize'

export interface User extends Model {
  user_id: string
  email: string
  first_name: string
  last_name: string
  city?: string
  country?: string
  description?: string
  reset_token_force_flag?: boolean
  is_admin?: boolean
  Roles: Role[]
}

export interface Role {
  role_name: string
}
