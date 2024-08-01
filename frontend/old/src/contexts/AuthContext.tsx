import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService from '../services/AuthService';

interface AuthState {
  userId: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isRescue: boolean;
  userPermissions: string[];
}

interface AuthContextType {
  authState: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  sendForgotPasswordEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  createUser: (firstName: string, lastName: string, email: string, password: string, city: string, country: string) => Promise<{ success: boolean; message: string; data?: any }>;
  createRescue: (firstName: string, lastName: string, email: string, password: string, rescueType: string, rescueName: string, city: string, country: string, referenceNumber: string) => Promise<{ success: boolean; message: string }>;
  fetchUserDetails: () => Promise<any>;
  updateUserDetails: (formData: any) => Promise<{ success: boolean; message: string; type: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

const useProvideAuth = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    userId: '',
    isLoggedIn: false,
    isAdmin: false,
    isRescue: false,
    userPermissions: [],
  });

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await AuthService.checkLoginStatus();
        if (response.status === 200) {
          setAuthState({
            isLoggedIn: true,
            userId: response.data.userId,
            isAdmin: response.data.isAdmin,
            isRescue: false,
            userPermissions: [],
          });
          checkRescueRoute();
        }
      } catch (error) {
        console.error('Could not verify auth:', error);
        setAuthState({
          isLoggedIn: false,
          userId: '',
          isAdmin: false,
          isRescue: false,
          userPermissions: [],
        });
      }
    };

    verifyAuth();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await AuthService.fetchPermissions();
      setAuthState((prevState) => ({
        ...prevState,
        userPermissions: response.data.permissions || [],
      }));
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setAuthState((prevState) => ({
        ...prevState,
        userPermissions: [],
      }));
    }
  };

  const checkRescueRoute = async () => {
    try {
      const response = await AuthService.checkRescueRoute();
      setAuthState((prevState) => ({
        ...prevState,
        isRescue: response.status === 200,
      }));
      fetchPermissions();
    } catch (error) {
      console.error('Error checking rescue route:', error);
      setAuthState((prevState) => ({
        ...prevState,
        isRescue: false,
      }));
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await AuthService.login(email, password);
      if (response.status === 200) {
        setAuthState((prevState) => ({
          ...prevState,
          isLoggedIn: true,
          isAdmin: response.data.isAdmin,
          userId: response.data.userId,
        }));
        checkRescueRoute();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login attempt failed:', error);
      setAuthState((prevState) => ({
        ...prevState,
        isLoggedIn: false,
        isAdmin: false,
      }));
      throw new Error(
        (error as any).response?.data.message || 'An error occurred during login.'
      );
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setAuthState({
        userId: '',
        isLoggedIn: false,
        isAdmin: false,
        userPermissions: [],
        isRescue: false,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthState({
        userId: '',
        isLoggedIn: false,
        isAdmin: false,
        userPermissions: [],
        isRescue: false,
      });
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      await AuthService.verifyEmail(token);
      return { success: true, message: 'Email verified successfully.' };
    } catch (error) {
      return { success: false, message: 'Email verification failed.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await AuthService.resetPassword(token, newPassword);
      return {
        success: true,
        message: 'Password has been reset successfully.',
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        message: (error as any).message || 'Error resetting password.',
      };
    }
  };

  const sendForgotPasswordEmail = async (email: string) => {
    try {
      await AuthService.sendForgotPasswordEmail(email);
      return {
        success: true,
        message: 'Successfully sent password reset email.',
      };
    } catch (error) {
      console.error('Error sending forgot password email:', error);
      return {
        success: false,
        message: (error as any).message || 'Error sending password reset email.',
      };
    }
  };

  const createUser = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    city: string,
    country: string
  ) => {
    try {
      const response = await AuthService.createAccountUser(
        firstName,
        lastName,
        email,
        password,
        city,
        country
      );

      return {
        success: true,
        message: 'Registration successful!',
        data: response.data,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: (error as any).message || 'An unexpected error occurred',
      };
    }
  };

  const createRescue = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    rescueType: string,
    rescueName: string,
    city: string,
    country: string,
    referenceNumber: string
  ) => {
    try {
      const response = await AuthService.createAccountRescue(
        firstName,
        lastName,
        email,
        password,
        rescueType,
        rescueName,
        city,
        country,
        referenceNumber
      );
      return { success: true, message: 'Rescue created successfully.' };
    } catch (error) {
      console.error('Error creating rescue:', error);
      return {
        success: false,
        message: (error as any).message || 'Error creating rescue.',
      };
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response = await AuthService.getUserDetails();
      return response.data;
    } catch (error: any) {
      if (error.response.status === 401) {
        console.log('401');
        logout();
      }
      console.log('NOT 401', error.response.status);
      console.error('Could not fetch user details:', error);
      return { message: error.message, type: 'danger' };
    }
  };

  const updateUserDetails = async (formData: any) => {
    try {
      await AuthService.updateUserDetails(formData);
      return {
        success: true,
        message: 'Details updated successfully!',
        type: 'success',
      };
    } catch (error) {
      console.error('Failed to update user details:', error);
      return {
        success: false,
        message: (error as any).message,
        type: 'danger',
      };
    }
  };

  return {
    authState,
    login,
    logout,
    verifyEmail,
    resetPassword,
    sendForgotPasswordEmail,
    createUser,
    createRescue,
    fetchUserDetails,
    updateUserDetails,
  };
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
