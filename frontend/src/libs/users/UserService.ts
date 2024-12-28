// src/services/AuthService.ts

import { apiService } from '../api-service'
import { Rescue } from '../rescues'
import { CreateRescuePayload, CreateUserPayload, User } from './User'

const API_BASE_URL = '/auth'

/**
 * Fetch all users.
 * @returns Promise resolving to an array of User objects.
 */
export const getUsers = async (): Promise<User[]> => {
  const { users } = await apiService.get<{ users: User[] }>(
    `${API_BASE_URL}/users`,
  )
  return users
}

/**
 * Fetch a user by ID.
 * @param id - The ID of the user to fetch.
 * @returns Promise resolving to a User object.
 */
export const getUserById = async (id: string): Promise<User | undefined> => {
  return apiService.get<User>(`${API_BASE_URL}/users/${id}`)
}

/**
 * Log in a user.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns Promise resolving to an object containing the token, user, and optional rescue.
 */
export const login = async (
  email: string,
  password: string,
): Promise<{ token: string; user: User; rescue?: Rescue } | null> => {
  try {
    const { token, user, rescue } = await apiService.post<
      { email: string; password: string },
      { token: string; user: User; rescue?: Rescue }
    >(`${API_BASE_URL}/login`, { email, password })

    localStorage.setItem('token', token)
    return { token, user, rescue }
  } catch (error) {
    console.error('Login failed:', error)
    return null
  }
}

/**
 * Log out the current user.
 */
export const logout = async (): Promise<void> => {
  const token = localStorage.getItem('token')
  if (token) {
    await apiService.post<void, void>(`${API_BASE_URL}/logout`, undefined)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('rescue')
  }
}

/**
 * Reset a user's password.
 * @param resetToken - The reset token.
 * @param newPassword - The new password.
 * @returns Promise resolving to a boolean indicating success.
 */
export const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    await apiService.post<{ resetToken: string; newPassword: string }, void>(
      `${API_BASE_URL}/reset-password`,
      { resetToken, newPassword },
    )
    return true
  } catch (error) {
    console.error('Reset password failed:', error)
    return false
  }
}

/**
 * Request a password reset email.
 * @param email - The user's email.
 * @returns Promise resolving to a boolean indicating success.
 */
export const forgotPassword = async (email: string): Promise<boolean> => {
  try {
    await apiService.post<{ email: string }, void>(
      `${API_BASE_URL}/forgot-password`,
      { email },
    )
    return true
  } catch (error) {
    console.error('Forgot password failed:', error)
    return false
  }
}

/**
 * Create a new user account.
 * @param newUser - The user payload.
 * @returns Promise resolving to the created User object.
 */
export const createAccount = async (
  newUser: CreateUserPayload,
): Promise<User> => {
  return apiService.post<CreateUserPayload, User>(
    `${API_BASE_URL}/create-user`,
    newUser,
  )
}

/**
 * Create a new rescue account.
 * @param newUser - The user payload.
 * @param rescueDetails - The rescue details payload.
 * @returns Promise resolving to the created User object.
 */
export const createRescueAccount = async (
  newUser: CreateUserPayload,
  rescueDetails: Omit<CreateRescuePayload, keyof CreateUserPayload>,
): Promise<User> => {
  return apiService.post<
    {
      user: CreateUserPayload
      rescue: Omit<CreateRescuePayload, keyof CreateUserPayload>
    },
    User
  >(`${API_BASE_URL}/create-rescue`, { user: newUser, rescue: rescueDetails })
}

/**
 * Update a user.
 * @param user - The user payload.
 * @returns Promise resolving to the updated User object.
 */
export const updateUser = async (user: User): Promise<User | null> => {
  try {
    const updatedUser = await apiService.put<User, User>(
      `${API_BASE_URL}/users/${user.user_id}`,
      user,
    )
    localStorage.setItem('user', JSON.stringify(updatedUser))
    return updatedUser
  } catch (error) {
    console.error('Update user failed:', error)
    return null
  }
}

/**
 * Change a user's password.
 * @param userId - The user ID.
 * @param currentPassword - The current password.
 * @param newPassword - The new password.
 * @returns Promise resolving to a boolean indicating success.
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    await apiService.put<
      { currentPassword: string; newPassword: string },
      void
    >(`${API_BASE_URL}/users/${userId}/change-password`, {
      currentPassword,
      newPassword,
    })
    return true
  } catch (error) {
    console.error('Change password failed:', error)
    return false
  }
}

/**
 * Verify a user's email.
 * @param token - The verification token.
 * @returns Promise resolving to an object with a message.
 */
export const verifyEmail = async (
  token: string,
): Promise<{ message: string }> => {
  return apiService.get<{ message: string }>(
    `${API_BASE_URL}/verify-email?token=${token}`,
  )
}

/**
 * Complete account setup.
 * @param token - The setup token.
 * @param password - The new password.
 * @returns Promise resolving to an object with a message and optional user.
 */
export const completeAccountSetup = async (
  token: string,
  password: string,
): Promise<{ message: string; user?: User }> => {
  return apiService.post<
    { token: string; password: string },
    { message: string; user?: User }
  >(`${API_BASE_URL}/complete-account-setup`, { token, password })
}

export default {
  getUsers,
  getUserById,
  login,
  logout,
  resetPassword,
  forgotPassword,
  createAccount,
  createRescueAccount,
  updateUser,
  changePassword,
  verifyEmail,
  completeAccountSetup,
}
