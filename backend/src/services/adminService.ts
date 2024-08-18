import { Role, User } from '../Models'

interface GetAllUsersParams {}

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

export const getAllUsersService =
  async ({}: GetAllUsersParams): Promise<UserResponse> => {
    const users = await User.findAll({
      include: [
        {
          model: Role,
          as: 'Roles', // Use the exact alias as defined in the association
          through: { attributes: [] }, // Exclude UserRole join table attributes
          attributes: ['role_name'], // Only select the role_name from the Role model
        },
      ],
    })

    const usersWithRoles: UserWithRoles[] = users.map((user) => {
      const userJSON = user.toJSON() as any // Convert the Sequelize instance to a plain object
      const roles = userJSON.Roles.map(
        (role: { role_name: string }) => role.role_name,
      ) // Extract the role names

      return {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        roles: roles,
      }
    })

    return {
      users: usersWithRoles,
    }
  }
