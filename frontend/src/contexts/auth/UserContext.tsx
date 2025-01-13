import { Rescue } from '@adoptdontshop/libs/rescues'
import { User, UserService } from '@adoptdontshop/libs/users'
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

interface UserContextProps {
  user: User | null
  rescue: Rescue | null
  setUser: (user: User | null) => void
  setRescue: (rescue: Rescue | null) => void
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

  const [rescue, setRescue] = useState<Rescue | null>(() => {
    const storedRescue = localStorage.getItem('rescue')
    return storedRescue ? JSON.parse(storedRescue) : null
  })

  useEffect(() => {
    const checkJwtExpiration = async (response: Response) => {
      if (response.status === 401) {
        console.log('401 detected, logging out')
        const errorData = await response.json()
        if (errorData.message.includes('JWT')) {
          logout()
          window.location.href = '/login'
        }
      }
      return response
    }

    const originalFetch = window.fetch
    window.fetch = async (url, options) => {
      const response = await originalFetch(url, options)
      return checkJwtExpiration(response)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const loginUser = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const result = await UserService.login(email, password)
      if (result) {
        const { user, rescue } = result
        setUser(user)
        setRescue(rescue || null)
        localStorage.setItem('user', JSON.stringify(user))
        localStorage.setItem('rescue', JSON.stringify(rescue || null))
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
    setRescue(null)
    localStorage.removeItem('user')
    localStorage.removeItem('rescue')
  }

  return (
    <UserContext.Provider
      value={{ user, rescue, setUser, setRescue, loginUser, logout }}
    >
      {children}
    </UserContext.Provider>
  )
}
