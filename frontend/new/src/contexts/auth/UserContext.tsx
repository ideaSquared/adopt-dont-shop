import { User } from '@adoptdontshop/libs/users'
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { deleteCookie, getCookie, setCookie } from './CookieUtils' // Adjust the path based on your folder structure

interface UserContextProps {
  user: User | null
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
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
  const [user, setUser] = useState<User | null>(null)

  const fetchUserData = useCallback(async (token: string) => {
    try {
      // Replace with a fetch call to your backend API
      /*
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data.user);
      */

      // For demonstration, returning a mocked user object
      const mockedUser: User = {
        user_id: '123',
        email: 'mockuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
      }
      setUser(mockedUser)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch user data:', error)
      }
      logout()
    }
  }, [])

  useEffect(() => {
    const token = getCookie('authToken')
    if (token) {
      fetchUserData(token)
    }
  }, [fetchUserData])

  const login = async (email: string, password: string) => {
    try {
      // Replace with a fetch call to your backend API
      /*
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const token = data.token;
      setCookie('authToken', token, { httpOnly: true, secure: true });
      fetchUserData(token);
      */

      // For demonstration, returning a mocked token and calling fetchUserData
      const mockedToken = 'mocked-token'
      setCookie('authToken', mockedToken, { httpOnly: true, secure: true })
      fetchUserData(mockedToken)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Login failed:', error)
      }
      throw error
    }
  }

  const logout = () => {
    deleteCookie('authToken')
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}
