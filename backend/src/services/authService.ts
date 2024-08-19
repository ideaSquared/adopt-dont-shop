// src/services/authService.ts
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../Models/'
import { getRolesForUser } from './permissionService'

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ token: string; user: any }> => {
  const user = await User.scope('withPassword').findOne({
    where: { email },
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    throw new Error('Invalid email or password')
  }

  // Fetch user roles
  const roles = await getRolesForUser(user.user_id)

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.user_id },
    process.env.SECRET_KEY as string,
    { expiresIn: '1h' },
  )

  // Destructure user object to exclude password
  const { password: _, ...userWithoutPassword } = user.toJSON()

  // Include roles in the user object
  const userWithRoles = {
    ...userWithoutPassword,
    roles,
  }

  return { token, user: userWithRoles }
}
