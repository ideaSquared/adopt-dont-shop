import { Rescue } from '../rescues'
import { CreateRescuePayload, CreateUserPayload, User } from './User'

const API_URL = 'http://localhost:5000/api/auth'

const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  // Assuming the response JSON is structured as { users: User[] }
  const data = await response.json()

  return data.users
}

const getUserById = async (id: string): Promise<User | undefined> => {
  const response = await fetch(`${API_URL}/users/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

const login = async (
  email: string,
  password: string,
): Promise<{ token: string; user: User; rescue?: Rescue } | null> => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const { token, user, rescue } = await response.json()

    // Save token to localStorage or cookies
    localStorage.setItem('token', token)

    return { token, user, rescue }
  } catch (error) {
    console.error('Login failed:', error)
    return null
  }
}

const logout = async (): Promise<void> => {
  const token = localStorage.getItem('token')
  if (token) {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    localStorage.removeItem('token')

    localStorage.removeItem('user')
    localStorage.removeItem('rescue')
  }
}

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resetToken, newPassword }),
    })

    if (!response.ok) {
      return false
    }

    return true
  } catch (error) {
    console.error('Reset password failed:', error)
    return false
  }
}

export const forgotPassword = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      return false
    }

    return true
  } catch (error) {
    console.error('Forgot password failed:', error)
    return false
  }
}
const createAccount = async (newUser: CreateUserPayload): Promise<User> => {
  const response = await fetch(`${API_URL}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newUser),
  })

  if (!response.ok) {
    throw new Error('Failed to create account')
  }

  return response.json()
}

const createRescueAccount = async (
  newUser: CreateUserPayload,
  rescueDetails: Omit<CreateRescuePayload, keyof CreateUserPayload>,
): Promise<User> => {
  const response = await fetch(`${API_URL}/create-rescue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user: newUser, rescue: rescueDetails }),
  })

  if (!response.ok) {
    throw new Error('Failed to create rescue account')
  }

  return response.json()
}

const updateUser = async (user: User): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/users/${user.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(user),
    })

    if (!response.ok) {
      throw new Error('Failed to update user')
    }

    const updatedUser = await response.json()
    localStorage.setItem('user', JSON.stringify(updatedUser))
    return updatedUser
  } catch (error) {
    console.error('Update user failed:', error)
    return null
  }
}

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`, // Include token if necessary
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!response.ok) {
      throw new Error('Failed to change password')
    }

    return true
  } catch (error) {
    console.error('Change password failed:', error)
    return false
  }
}

const verifyEmail = async (token: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/verify-email?token=${token}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Verification failed')
  }

  return response.json()
}

export default {
  getUsers,
  getUserById,
  login,
  logout,
  changePassword,
  resetPassword,
  forgotPassword,
  createAccount,
  updateUser,
  createRescueAccount,
  verifyEmail,
}
