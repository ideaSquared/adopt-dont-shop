// Mock logger for tests
export const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  end: jest.fn(),
};

export const loggerHelpers = {
  logBusiness: jest.fn(),
  logAuth: jest.fn(),
  logSecurity: jest.fn(),
  logDatabase: jest.fn(),
  logPerformance: jest.fn(),
  logLifecycle: jest.fn(),
  logExternalService: jest.fn(),
  logAuditableAction: jest.fn(),
  logRequest: jest.fn(),
};

export const safeLoggerHelpers = {
  logBusiness: jest.fn(),
};

export default logger;
