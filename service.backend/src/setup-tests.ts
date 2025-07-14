// Test setup for backend service
import { config } from 'dotenv';
import { DataTypes, Op } from 'sequelize';

// Load test environment variables
config({ path: '.env.test' });

// Mock Sequelize completely FIRST - this must be done before models are imported
jest.mock('sequelize', () => {
  // Use ES module import approach that ESLint prefers
  const actualSequelize = jest.requireActual('sequelize') as typeof import('sequelize');

  // Create a mock sequelize instance
  const mockSequelizeInstance = {
    query: jest.fn(() => Promise.resolve([[]])),
    transaction: jest.fn(() =>
      Promise.resolve({
        commit: jest.fn(),
        rollback: jest.fn(),
      })
    ),
    authenticate: jest.fn(() => Promise.resolve()),
    define: jest.fn(() => ({})),
    models: {},
    DataTypes: actualSequelize.DataTypes,
    literal: jest.fn((sql: string) => ({ val: sql })), // Mock literal function
    fn: jest.fn((func: string, ...args: Array<string | number | object>) => ({ fn: func, args })),
    col: jest.fn((column: string) => ({ col: column })),
    where: jest.fn(
      (left: string | number | object, operator: string, right: string | number | object) => ({
        where: { left, operator, right },
      })
    ),
    Op: actualSequelize.Op,
  };

  // Return both the constructor and the instance methods
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => mockSequelizeInstance),
    default: mockSequelizeInstance,
  };
});

// Mock the sequelize instance file specifically
jest.mock('./sequelize', () => ({
  __esModule: true,
  default: {
    query: jest.fn(() => Promise.resolve([[]])),
    transaction: jest.fn(() =>
      Promise.resolve({
        commit: jest.fn(),
        rollback: jest.fn(),
      })
    ),
    authenticate: jest.fn(() => Promise.resolve()),
    define: jest.fn(() => ({})),
    models: {},
    DataTypes,
    literal: jest.fn((sql: string) => ({ val: sql })), // Mock literal function
    fn: jest.fn((func: string, ...args: Array<string | number | object>) => ({ fn: func, args })),
    col: jest.fn((column: string) => ({ col: column })),
    where: jest.fn(
      (left: string | number | object, operator: string, right: string | number | object) => ({
        where: { left, operator, right },
      })
    ),
    Op,
  },
}));

// Mock loggerHelpers to prevent undefined errors in tests
jest.mock('./utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    end: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
    end: jest.fn(),
  },
  loggerHelpers: {
    logBusiness: jest.fn(),
    logAuth: jest.fn(),
    logSecurity: jest.fn(),
    logDatabase: jest.fn(),
    logPerformance: jest.fn(),
    logLifecycle: jest.fn(),
    logExternalService: jest.fn(),
    logAuditableAction: jest.fn(),
    logRequest: jest.fn(),
  },
  safeLoggerHelpers: {
    logBusiness: jest.fn(),
  },
}));

// Mock the config
jest.mock('./config', () => ({
  config: {
    database: {
      host: 'localhost',
      port: 5432,
      username: 'test',
      password: 'test',
      database: 'test',
    },
    email: {
      provider: 'console',
    },
    jwt: {
      secret: 'test-secret',
      refreshSecret: 'test-refresh-secret',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

// Mock Sequelize models with proper methods - removed unused createMockSequelizeModel function

// Mock User model
jest.mock('./models/User', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn(),
    scope: jest.fn().mockReturnThis(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
    associate: jest.fn(),
  },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    DEACTIVATED: 'deactivated',
  },
  UserType: {
    ADOPTER: 'adopter',
    RESCUE_STAFF: 'rescue_staff',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
}));

// Mock Pet model with ALL enums
jest.mock('./models/Pet', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn(),
    searchPets: jest.fn(),
    associate: jest.fn(),
  },
  PetStatus: {
    AVAILABLE: 'available',
    PENDING: 'pending',
    ADOPTED: 'adopted',
    FOSTER: 'foster',
    MEDICAL_HOLD: 'medical_hold',
    BEHAVIORAL_HOLD: 'behavioral_hold',
    NOT_AVAILABLE: 'not_available',
    DECEASED: 'deceased',
  },
  PetType: {
    DOG: 'dog',
    CAT: 'cat',
    RABBIT: 'rabbit',
    BIRD: 'bird',
    REPTILE: 'reptile',
    SMALL_MAMMAL: 'small_mammal',
    FISH: 'fish',
    OTHER: 'other',
  },
  Gender: {
    MALE: 'male',
    FEMALE: 'female',
    UNKNOWN: 'unknown',
  },
  Size: {
    EXTRA_SMALL: 'extra_small',
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
    EXTRA_LARGE: 'extra_large',
  },
  AgeGroup: {
    BABY: 'baby',
    YOUNG: 'young',
    ADULT: 'adult',
    SENIOR: 'senior',
  },
  EnergyLevel: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    VERY_HIGH: 'very_high',
  },
  VaccinationStatus: {
    UP_TO_DATE: 'up_to_date',
    PARTIAL: 'partial',
    NOT_VACCINATED: 'not_vaccinated',
    UNKNOWN: 'unknown',
  },
  SpayNeuterStatus: {
    SPAYED: 'spayed',
    NEUTERED: 'neutered',
    NOT_ALTERED: 'not_altered',
    UNKNOWN: 'unknown',
  },
}));

// Mock Application model
jest.mock('./models/Application', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
  ApplicationStatus: {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },
}));

// Mock Chat model
jest.mock('./models/Chat', () => ({
  __esModule: true,
  Chat: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock Message model
jest.mock('./models/Message', () => ({
  __esModule: true,
  Message: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock Rescue model
jest.mock('./models/Rescue', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(() =>
        Promise.resolve({
          commit: jest.fn(),
          rollback: jest.fn(),
        })
      ),
    },
  },
}));

// Mock AuditLog model
jest.mock('./models/AuditLog', () => ({
  __esModule: true,
  AuditLog: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock external services
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
  genSalt: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}));

// Mock crypto for UUID generation
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(),
  createTestAccount: jest.fn(),
}));

// Mock ChatParticipant model
jest.mock('./models/ChatParticipant', () => ({
  __esModule: true,
  ChatParticipant: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
}));

// Mock UserFavorite model
jest.mock('./models/UserFavorite', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock other models that might be imported
jest.mock('./models/StaffMember', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(() =>
        Promise.resolve({
          commit: jest.fn(),
          rollback: jest.fn(),
        })
      ),
    },
  },
}));

jest.mock('./models/Notification', () => ({
  __esModule: true,
  Notification: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

jest.mock('./models/EmailPreference', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

jest.mock('./models/DeviceToken', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock ApplicationQuestion model
jest.mock('./models/ApplicationQuestion', () => ({
  __esModule: true,
  ApplicationQuestion: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
    getCoreQuestions: jest.fn(),
    getRescueQuestions: jest.fn(),
    getAllQuestionsForRescue: jest.fn(),
  },
  QuestionCategory: {
    PERSONAL_INFORMATION: 'personal_information',
    HOUSEHOLD_INFORMATION: 'household_information',
    PET_OWNERSHIP_EXPERIENCE: 'pet_ownership_experience',
    LIFESTYLE_COMPATIBILITY: 'lifestyle_compatibility',
    PET_CARE_COMMITMENT: 'pet_care_commitment',
    REFERENCES_VERIFICATION: 'references_verification',
    FINAL_ACKNOWLEDGMENTS: 'final_acknowledgments',
  },
  QuestionType: {
    TEXT: 'text',
    EMAIL: 'email',
    PHONE: 'phone',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    SELECT: 'select',
    MULTI_SELECT: 'multi_select',
    ADDRESS: 'address',
    DATE: 'date',
    FILE: 'file',
  },
  QuestionScope: {
    CORE: 'core',
    RESCUE_SPECIFIC: 'rescue_specific',
  },
}));

// Mock Rating model
jest.mock('./models/Rating', () => ({
  __esModule: true,
  Rating: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
}));

// Mock models/index to prevent circular imports
jest.mock('./models/index', () => ({
  __esModule: true,
  default: {},
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.TEST_DB_NAME = 'test_db';
process.env.POSTGRES_USER = 'test';
process.env.POSTGRES_PASSWORD = 'test';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';

// Export some utilities for tests
export const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  userType: 'adopter',
  status: 'active',
  emailVerified: true,
  ...overrides,
});

// Mock the models index file that exports named models
jest.mock('./models', () => ({
  __esModule: true,
  Application: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
  },
  Pet: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn(),
    searchPets: jest.fn(),
    associate: jest.fn(),
  },
  Rescue: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(() =>
        Promise.resolve({
          commit: jest.fn(),
          rollback: jest.fn(),
        })
      ),
    },
  },
  StaffMember: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    associate: jest.fn(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(() =>
        Promise.resolve({
          commit: jest.fn(),
          rollback: jest.fn(),
        })
      ),
    },
  },
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn(),
    scope: jest.fn().mockReturnThis(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
    associate: jest.fn(),
  },
}));

export const createMockPet = (overrides: Record<string, unknown> = {}) => ({
  petId: 'pet-123',
  name: 'Test Pet',
  type: 'dog',
  status: 'available',
  rescueId: 'rescue-123',
  ...overrides,
});
