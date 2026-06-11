export const authService = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(() => false),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

export const AuthService = jest.fn();
