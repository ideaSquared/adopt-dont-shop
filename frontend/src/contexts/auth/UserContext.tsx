import { User, UserService } from '@adoptdontshop/libs/users'
import React, { ReactNode, createContext, useContext, useState } from 'react'

interface UserContextProps {
  user: User | null
  setUser: (user: User | null) => void
  loginUser: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

interface UserProviderProps {
  children: ReactNode
}

const UserContext = createContext<UserContextProps | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('user')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const loginUser = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const result = await UserService.login(email, password)
      if (result) {
        const { user } = result
        setUser(user)
        localStorage.setItem('user', JSON.stringify(user))
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Error during login:', error)
      return false
    }
  }

  const logout = () => {
    UserService.logout()
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <UserContext.Provider value={{ user, setUser, loginUser, logout }}>
      {children}
    </UserContext.Provider>
  )
}
