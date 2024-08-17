import { User } from './User'

const users: User[] = [
  {
    user_id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
  },
  {
    user_id: '2',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
  },
]

const getUsers = (): User[] => users

const getUserById = (id: string): User | undefined =>
  users.find((user) => user.user_id === id)

const login = (email: string, password: string): boolean => {
  if (password !== '123') return false

  return users.some((user) => user.email === email)
}

const resetPassword = (email: string): boolean => {
  return users.some((user) => user.email === email)
}

const forgotPassword = (email: string): boolean => {
  return users.some((user) => user.email === email)
}

const createAccount = (newUser: Omit<User, 'user_id'>): User => {
  const user_id = (users.length + 1).toString()
  const user = { user_id, ...newUser }
  users.push(user)
  return user
}

const updateUser = (updatedUser: User): User | undefined => {
  const index = users.findIndex((user) => user.user_id === updatedUser.user_id)
  if (index !== -1) {
    users[index] = updatedUser
    return updatedUser
  }
  return undefined
}

export default {
  getUsers,
  getUserById,
  login,
  resetPassword,
  forgotPassword,
  createAccount,
  updateUser,
}
