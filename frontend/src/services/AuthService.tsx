import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AuthService = {
  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      return response;
    } catch (error: any) {
      console.error(
        'Error logging in user',
        error.response ? error.response.data : error
      );
      throw new Error(
        error.response?.data.message || 'An error occurred during login.'
      );
    }
  },

  logout: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      return response;
    } catch (error: any) {
      console.error(
        'Error logging user out',
        error.response ? error.response.data : error.message
      );
      return error;
    }
  },

  checkLoginStatus: async () => {
    return axios.get(`${API_BASE_URL}/auth/status`, { withCredentials: true });
  },

  fetchPermissions: async () => {
    return axios.get(`${API_BASE_URL}/auth/permissions`, {
      withCredentials: true,
    });
  },

  checkRescueRoute: async () => {
    return axios.get(`${API_BASE_URL}/auth/my-rescue`, {
      withCredentials: true,
    });
  },

  verifyEmail: async (token: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/verify-email?token=${token}`
      );
      return response;
    } catch (error: any) {
      console.error(
        'Error verifying email',
        error.response ? error.response.data : error.message
      );
      return error;
    }
  },

  resetPassword: async (token: string, newPassword: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/reset-password`,
        { token, newPassword },
        { withCredentials: true }
      );
      return response;
    } catch (error: any) {
      console.error(
        'Error sending forgot password email:',
        error.response ? error.response.data : error.message
      );
      return error;
    }
  },

  sendForgotPasswordEmail: async (email: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/forgot-password`,
        { email },
        { withCredentials: true }
      );
      return response;
    } catch (error: any) {
      console.error(
        'Error sending forgot password email:',
        error.response ? error.response.data : error.message
      );
      return error;
    }
  },

  getUserDetails: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/details`, {
        withCredentials: true,
      });
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  updateUserDetails: async (formData: any) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/details`,
        formData,
        {
          withCredentials: true,
        }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  createAccountUser: async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    city: string,
    country: string
  ) => {
    const userData = {
      firstName,
      lastName,
      email,
      password,
      city,
      country,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        withCredentials: true,
      });
      return response;
    } catch (error: any) {
      console.error(
        'Error creating user account:',
        error.response ? error.response.data : error.message
      );
      return error;
    }
  },

  createAccountRescue: async (
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
    const postData = {
      firstName,
      lastName,
      email,
      password,
      rescueType,
      rescueName,
      city,
      country,
      referenceNumber,
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/rescue/${rescueType.toLowerCase()}`,
        postData
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Error creating rescue account:',
        error.response ? error.response.data : error.message
      );
      throw error;
    }
  },
};

export default AuthService;
