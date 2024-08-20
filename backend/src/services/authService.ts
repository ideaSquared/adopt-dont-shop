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

  // Ensure SECRET_KEY is defined
  const secretKey = process.env.SECRET_KEY
  if (!secretKey) {
    throw new Error('Internal server error')
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.user_id, roles }, secretKey, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  })

  // Destructure user object to exclude password
  const { password: _, ...userWithoutPassword } = user.toJSON()

  // Include roles in the user object
  const userWithRoles = {
    ...userWithoutPassword,
    roles,
  }

  return { token, user: userWithRoles }
}

export const updateUserDetails = async (
  userId: string,
  updatedData: Partial<User>,
): Promise<User | null> => {
  const user = await User.findByPk(userId)

  if (!user) {
    throw new Error('User not found')
  }

  // Update the user with the new details
  await user.update(updatedData)

  // Fetch the updated user to return
  return user
}

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  const user = await User.scope('withPassword').findByPk(userId)

  if (!user) {
    throw new Error('User not found')
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect')
  }

  // Validate new password (e.g., length, complexity)
  // if (newPassword.length < 8) {
  //   throw new Error('New password must be at least 8 characters long')
  // }

  // Hash the new password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10)

  // Update the user's password
  user.password = hashedNewPassword
  await user.save()

  return true
}
