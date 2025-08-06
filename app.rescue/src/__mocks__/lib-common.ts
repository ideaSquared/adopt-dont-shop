// Generic mock for other library services
export const ChatService = jest.fn();
export const AnalyticsService = jest.fn();
export const NotificationsService = jest.fn();
export const FeatureFlagsService = jest.fn();
export const PermissionsService = jest.fn();
export const SearchService = jest.fn();
export const DiscoveryService = jest.fn();
export const ValidationService = jest.fn();

// Mock apiService for lib-api
export const apiService = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  updateConfig: jest.fn(),
};

// Mock service instances
export const analyticsService = {
  track: jest.fn(),
  identify: jest.fn(),
};

export const chatService = {
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
};

export const notificationsService = {
  send: jest.fn(),
  markAsRead: jest.fn(),
};

export const featureFlagsService = {
  isEnabled: jest.fn(() => false),
  getValue: jest.fn(),
};

export const permissionsService = {
  hasPermission: jest.fn(() => true),
  getUserPermissions: jest.fn(() => []),
};

export const searchService = {
  search: jest.fn(() => ({ results: [], total: 0 })),
};

export const discoveryService = {
  getPets: jest.fn(() => ({ pets: [], total: 0 })),
};

export const validationService = {
  validateForm: jest.fn(() => ({ isValid: true, errors: {} })),
};
