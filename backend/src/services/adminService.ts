import { User } from '../Models'
import { getRolesForUser } from './permissionService'

interface UserWithRoles {
  user_id: string
  first_name: string
  last_name: string
  email: string
  roles: string[]
}

interface UserResponse {
  users: UserWithRoles[]
}

export const getAllUsersService = async (): Promise<UserResponse> => {
  const users: User[] = await User.findAll()

  const usersWithRoles: UserWithRoles[] = await Promise.all(
    users.map(async (user: User): Promise<UserWithRoles> => {
      const roles = await getRolesForUser(user.user_id)
      return {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles,
      }
    }),
  )

  return {
    users: usersWithRoles,
  }
}
