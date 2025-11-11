// Test setup for backend service
import { config } from 'dotenv';
import { DataTypes, Op } from 'sequelize';
import { vi } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Mock Sequelize completely FIRST - this must be done before models are imported
vi.mock('sequelize', async () => {
  // Use ES module import approach that ESLint prefers
  const actualSequelize = await vi.importActual('sequelize') as typeof import('sequelize');

  // Create a mock sequelize instance
  const mockSequelizeInstance = {
    query: vi.fn(() => Promise.resolve([[]])),
    transaction: vi.fn(() =>
      Promise.resolve({
        commit: vi.fn(),
        rollback: vi.fn(),
      })
    ),
    authenticate: vi.fn(() => Promise.resolve()),
    define: vi.fn(() => ({})),
    models: {},
    DataTypes: actualSequelize.DataTypes,
    literal: vi.fn((sql: string) => ({ val: sql })), // Mock literal function
    fn: vi.fn((func: string, ...args: Array<string | number | object>) => ({ fn: func, args })),
    col: vi.fn((column: string) => ({ col: column })),
    where: vi.fn(
      (left: string | number | object, operator: string, right: string | number | object) => ({
        where: { left, operator, right },
      })
    ),
    Op: actualSequelize.Op,
  };

  // Return both the constructor and the instance methods
  return {
    ...actualSequelize,
    Sequelize: vi.fn(() => mockSequelizeInstance),
    default: mockSequelizeInstance,
  };
});

// Mock the sequelize instance file specifically
vi.mock('./sequelize', () => ({
  __esModule: true,
  default: {
    query: vi.fn(() => Promise.resolve([[]])),
    transaction: vi.fn(() =>
      Promise.resolve({
        commit: vi.fn(),
        rollback: vi.fn(),
      })
    ),
    authenticate: vi.fn(() => Promise.resolve()),
    define: vi.fn(() => ({})),
    models: {},
    DataTypes,
    literal: vi.fn((sql: string) => ({ val: sql })), // Mock literal function
    fn: vi.fn((func: string, ...args: Array<string | number | object>) => ({ fn: func, args })),
    col: vi.fn((column: string) => ({ col: column })),
    where: vi.fn(
      (left: string | number | object, operator: string, right: string | number | object) => ({
        where: { left, operator, right },
      })
    ),
    Op,
  },
}));

// Mock loggerHelpers to prevent undefined errors in tests
vi.mock('./utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
    end: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
    end: vi.fn(),
  },
  loggerHelpers: {
    logBusiness: vi.fn(),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logDatabase: vi.fn(),
    logPerformance: vi.fn(),
    logLifecycle: vi.fn(),
    logExternalService: vi.fn(),
    logAuditableAction: vi.fn(),
    logRequest: vi.fn(),
  },
  safeLoggerHelpers: {
    logBusiness: vi.fn(),
  },
}));

// Mock the config
vi.mock('./config', () => ({
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
vi.mock('./models/User', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    bulkCreate: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    hasOne: vi.fn(),
    belongsToMany: vi.fn(),
    scope: vi.fn().mockReturnThis(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(),
    },
    associate: vi.fn(),
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
vi.mock('./models/Pet', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    bulkCreate: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    hasOne: vi.fn(),
    belongsToMany: vi.fn(),
    searchPets: vi.fn(),
    associate: vi.fn(),
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
vi.mock('./models/Application', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  ApplicationStatus: {
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn',
  },
  ApplicationPriority: {
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}));

// Mock Chat model
vi.mock('./models/Chat', () => ({
  __esModule: true,
  Chat: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock Message model
vi.mock('./models/Message', () => ({
  __esModule: true,
  Message: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock Rescue model
vi.mock('./models/Rescue', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(() =>
        Promise.resolve({
          commit: vi.fn(),
          rollback: vi.fn(),
        })
      ),
    },
  },
}));

// Mock AuditLog model
vi.mock('./models/AuditLog', () => ({
  __esModule: true,
  AuditLog: {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    findAndCountAll: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock external services
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  genSalt: vi.fn(),
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn(),
  decode: vi.fn(),
}));

// Mock crypto for UUID generation
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'mock-uuid-123'),
  randomBytes: vi.fn(() => Buffer.from('mock-random-bytes')),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash'),
  })),
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  createTransporter: vi.fn(),
  createTestAccount: vi.fn(),
}));

// Mock ChatParticipant model
vi.mock('./models/ChatParticipant', () => ({
  __esModule: true,
  ChatParticipant: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    init: vi.fn(),
  },
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    init: vi.fn(),
  },
}));

// Mock UserFavorite model
vi.mock('./models/UserFavorite', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock other models that might be imported
vi.mock('./models/StaffMember', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(() =>
        Promise.resolve({
          commit: vi.fn(),
          rollback: vi.fn(),
        })
      ),
    },
  },
}));

vi.mock('./models/Notification', () => ({
  __esModule: true,
  Notification: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

vi.mock('./models/EmailPreference', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

vi.mock('./models/DeviceToken', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock ApplicationQuestion model
vi.mock('./models/ApplicationQuestion', () => ({
  __esModule: true,
  ApplicationQuestion: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    init: vi.fn(),
    getCoreQuestions: vi.fn().mockResolvedValue([]),
    getRescueQuestions: vi.fn().mockResolvedValue([]),
    getAllQuestionsForRescue: vi.fn().mockResolvedValue([]),
  },
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    init: vi.fn(),
    getCoreQuestions: vi.fn().mockResolvedValue([]),
    getRescueQuestions: vi.fn().mockResolvedValue([]),
    getAllQuestionsForRescue: vi.fn().mockResolvedValue([]),
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

// Mock ApplicationTimeline model
vi.mock('./models/ApplicationTimeline', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  TimelineEventType: {
    STAGE_CHANGE: 'stage_change',
    STATUS_UPDATE: 'status_update',
    NOTE_ADDED: 'note_added',
    REFERENCE_CONTACTED: 'reference_contacted',
    REFERENCE_VERIFIED: 'reference_verified',
    INTERVIEW_SCHEDULED: 'interview_scheduled',
    INTERVIEW_COMPLETED: 'interview_completed',
    HOME_VISIT_SCHEDULED: 'home_visit_scheduled',
    HOME_VISIT_COMPLETED: 'home_visit_completed',
    HOME_VISIT_RESCHEDULED: 'home_visit_rescheduled',
    HOME_VISIT_CANCELLED: 'home_visit_cancelled',
    SCORE_UPDATED: 'score_updated',
    DOCUMENT_UPLOADED: 'document_uploaded',
    DECISION_MADE: 'decision_made',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_REJECTED: 'application_rejected',
    APPLICATION_WITHDRAWN: 'application_withdrawn',
    APPLICATION_REOPENED: 'application_reopened',
    COMMUNICATION_SENT: 'communication_sent',
    COMMUNICATION_RECEIVED: 'communication_received',
    SYSTEM_AUTO_PROGRESSION: 'system_auto_progression',
    MANUAL_OVERRIDE: 'manual_override',
  },
}));

// Mock Rating model
vi.mock('./models/Rating', () => ({
  __esModule: true,
  Rating: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Mock models/index to prevent circular imports
vi.mock('./models/index', () => ({
  __esModule: true,
  default: {},
}));

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
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
vi.mock('./models', () => ({
  __esModule: true,
  Application: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  Pet: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    bulkCreate: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    hasOne: vi.fn(),
    belongsToMany: vi.fn(),
    searchPets: vi.fn(),
    associate: vi.fn(),
  },
  Rescue: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(() =>
        Promise.resolve({
          commit: vi.fn(),
          rollback: vi.fn(),
        })
      ),
    },
  },
  StaffMember: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(() =>
        Promise.resolve({
          commit: vi.fn(),
          rollback: vi.fn(),
        })
      ),
    },
  },
  User: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    bulkCreate: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    hasOne: vi.fn(),
    belongsToMany: vi.fn(),
    scope: vi.fn().mockReturnThis(),
    sequelize: {
      query: vi.fn(),
      transaction: vi.fn(),
    },
    associate: vi.fn(),
  },
  Role: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    associate: vi.fn(),
  },
  UserRole: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    bulkCreate: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
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

// Mock Report model
vi.mock('./models/Report', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  ReportStatus: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
    ESCALATED: 'escalated',
  },
  ReportSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
  ReportCategory: {
    INAPPROPRIATE_CONTENT: 'inappropriate_content',
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    FALSE_INFORMATION: 'false_information',
    SCAM: 'scam',
    ANIMAL_WELFARE: 'animal_welfare',
    IDENTITY_THEFT: 'identity_theft',
    OTHER: 'other',
  },
  ReportedEntityType: {
    USER: 'user',
    RESCUE: 'rescue',
    PET: 'pet',
    MESSAGE: 'message',
    APPLICATION: 'application',
    CONVERSATION: 'conversation',
  },
}));

// Mock ModeratorAction model
vi.mock('./models/ModeratorAction', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
  ActionType: {
    WARNING_ISSUED: 'warning_issued',
    CONTENT_REMOVED: 'content_removed',
    USER_SUSPENDED: 'user_suspended',
    USER_BANNED: 'user_banned',
    ACCOUNT_RESTRICTED: 'account_restricted',
    CONTENT_FLAGGED: 'content_flagged',
  },
  ActionSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

// Mock Invitation model
vi.mock('./models/Invitation', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    count: vi.fn(),
    findAndCountAll: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    associate: vi.fn(),
  },
}));

// Update sequelize.transaction mock to support callback pattern
// This must be done after mocks are set up
beforeEach(async () => {
  const originalSequelizeMock = await vi.importMock<typeof import('./sequelize')>('./sequelize');
  if (originalSequelizeMock.default) {
    originalSequelizeMock.default.transaction = vi.fn(async (callback) => {
      if (typeof callback === 'function') {
        const t = { commit: vi.fn(), rollback: vi.fn() };
        return await callback(t);
      }
      return Promise.resolve({
        commit: vi.fn(),
        rollback: vi.fn(),
      });
    });
  }
});
