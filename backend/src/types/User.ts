export interface User {
  user_id: string
  email: string
  password?: string
  confirm_password?: string
  first_name: string
  last_name: string
  city?: string
  country?: string
  description?: string
  reset_token_force_flag?: boolean
  is_admin?: boolean
  Roles: { role_name: string }[] // Sequelize result includes this
}

export interface Role {
  role_name: string
}
