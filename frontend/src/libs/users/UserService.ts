import { User } from './User'

const API_URL = 'http://localhost:5000/api/auth'

const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`http://localhost:5000/api/admin/users`)
  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }
  return response.json()
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
): Promise<string | null> => {
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

    const { token } = await response.json()
    // Save token to localStorage or cookies
    localStorage.setItem('token', token)
    return token
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
  }
}

const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      throw new Error('Reset password failed')
    }

    return true
  } catch (error) {
    console.error('Reset password failed:', error)
    return false
  }
}

const forgotPassword = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      throw new Error('Forgot password failed')
    }

    return true
  } catch (error) {
    console.error('Forgot password failed:', error)
    return false
  }
}

const createAccount = async (newUser: Omit<User, 'user_id'>): Promise<User> => {
  const response = await fetch(`${API_URL}/register`, {
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

const updateUser = async (updatedUser: User): Promise<User | undefined> => {
  try {
    const response = await fetch(`${API_URL}/users/${updatedUser.user_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedUser),
    })

    if (!response.ok) {
      throw new Error('Failed to update user')
    }

    return response.json()
  } catch (error) {
    console.error('Update user failed:', error)
    return undefined
  }
}

export default {
  getUsers,
  getUserById,
  login,
  logout,
  resetPassword,
  forgotPassword,
  createAccount,
  updateUser,
}
