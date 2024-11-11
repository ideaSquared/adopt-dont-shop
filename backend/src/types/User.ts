export interface User {
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  city?: string
  country?: string
  description?: string
  reset_token_force_flag?: boolean
  is_admin?: boolean
  email_verified?: boolean
  created_at?: Date
  updated_at?: Date
  Roles?: Role[]
}

export interface Role {
  role_name: string
}

export interface UserWithRoles extends Omit<User, 'password'> {
  roles: string[]
}
