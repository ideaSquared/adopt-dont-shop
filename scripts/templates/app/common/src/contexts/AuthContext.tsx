import { AuthService, User, LoginRequest } from '@adopt-dont-shop/lib.auth';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setDevUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authService = new AuthService();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      // Post-ADS-919 the token pair rides home as HttpOnly cookies; the
      // access token is only present in the body for legacy/dev flows.
      if (response.tokens?.accessToken) {
        localStorage.setItem('authToken', response.tokens.accessToken);
      }
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const setDevUser = (devUser: User) => {
    setUser(devUser);
    // Create a mock token for dev mode
    localStorage.setItem('authToken', `dev-token-${devUser.email}`);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      setDevUser,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};