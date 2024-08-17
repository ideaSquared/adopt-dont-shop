import { Role } from '@adoptdontshop/permissions'
import { User } from './User'

const users: User[] = [
  {
    user_id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    roles: [Role.ADMIN, Role.STAFF_MANAGER, Role.VERIFIED_USER],
  },
  {
    user_id: '2',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    roles: [Role.RESCUE_MANAGER, Role.VERIFIED_USER],
  },
  {
    user_id: '3',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    roles: [Role.PET_MANAGER, Role.VERIFIED_USER],
  },
  {
    user_id: '4',
    first_name: 'Bob',
    last_name: 'Brown',
    email: 'bob@example.com',
    roles: [Role.STAFF, Role.USER],
  },
  {
    user_id: '5',
    first_name: 'Charlie',
    last_name: 'Johnson',
    email: 'charlie@example.com',
    roles: [Role.STAFF, Role.USER],
  },
  {
    user_id: '6',
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily@example.com',
    roles: [Role.STAFF, Role.VERIFIED_USER],
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
