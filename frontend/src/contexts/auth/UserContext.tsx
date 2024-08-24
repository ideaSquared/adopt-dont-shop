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

  useEffect(() => {
    const checkJwtExpiration = async (response: Response) => {
      if (response.status === 401) {
        console.log('401 detected, logging out') // Add logging here
        const errorData = await response.json()
        if (errorData.message.includes('JWT')) {
          logout() // Log the user out and trigger a re-render
          window.location.href = '/login' // Redirect to login page
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
      window.fetch = originalFetch // Clean up by resetting fetch to its original implementation
    }
  }, [])

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
