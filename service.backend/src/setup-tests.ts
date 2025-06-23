// Test setup for backend service
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock Sequelize connection FIRST - this must be done before models are imported
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
    DataTypes: {},
  },
}));

// Mock loggerHelpers to prevent undefined errors in tests
jest.mock('./utils/logger', () => ({
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

// Mock Sequelize models with proper methods
const createMockSequelizeModel = (data: any = {}) => ({
  ...data,
  toJSON: jest.fn(() => data),
  save: jest.fn(() => Promise.resolve(data)),
  update: jest.fn(() => Promise.resolve([1])),
  destroy: jest.fn(() => Promise.resolve(1)),
  reload: jest.fn(() => Promise.resolve(data)),
  hasMany: jest.fn(),
  belongsTo: jest.fn(),
  hasOne: jest.fn(),
  belongsToMany: jest.fn(),
});

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
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
  },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
  },
  UserType: {
    ADOPTER: 'adopter',
    RESCUE: 'rescue',
    ADMIN: 'admin',
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

// Mock other required models
jest.mock('./models/Application', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
  },
}));

jest.mock('./models/Chat', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
  },
}));

jest.mock('./models/ChatParticipant', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    belongsTo: jest.fn(),
  },
}));

jest.mock('./models/Rescue', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
  },
}));

// Mock AuditLogService as static class
jest.mock('./services/auditLog.service', () => ({
  AuditLogService: {
    log: jest.fn(() => Promise.resolve()),
    getAuditLogs: jest.fn(() => Promise.resolve({ logs: [], total: 0 })),
  },
}));

// Mock sequelize connection
jest.mock('./sequelize', () => ({
  __esModule: true,
  default: {
    query: jest.fn(() => Promise.resolve([[]])),
    transaction: jest.fn(() => Promise.resolve()),
    authenticate: jest.fn(() => Promise.resolve()),
  },
}));

// Mock all models that might be used - this prevents initialization errors
jest.mock('./models/AuditLog', () => ({
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
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
  },
  AuditLog: {
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
  },
}));

jest.mock('./models/UserFavorite', () => ({
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
  },
}));

jest.mock('./models/StaffMember', () => ({
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
  },
}));

// Mock models/index.ts with all exported models
jest.mock('./models/index', () => {
  const createMockModel = () => ({
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
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(() =>
        Promise.resolve({
          commit: jest.fn(),
          rollback: jest.fn(),
        })
      ),
    },
  });

  return {
    __esModule: true,
    default: {},
    Application: createMockModel(),
    ApplicationQuestion: createMockModel(),
    AuditLog: createMockModel(),
    Chat: createMockModel(),
    ChatParticipant: createMockModel(),
    DeviceToken: createMockModel(),
    EmailPreference: createMockModel(),
    EmailQueue: createMockModel(),
    EmailTemplate: createMockModel(),
    FeatureFlag: createMockModel(),
    Invitation: createMockModel(),
    Message: createMockModel(),
    ModeratorAction: createMockModel(),
    Notification: createMockModel(),
    Permission: createMockModel(),
    Pet: createMockModel(),
    Rating: createMockModel(),
    Report: createMockModel(),
    Rescue: createMockModel(),
    Role: createMockModel(),
    RolePermission: createMockModel(),
    StaffMember: createMockModel(),
    User: createMockModel(),
    UserFavorite: createMockModel(),
    UserRole: createMockModel(),
  };
});

// Mock console methods during tests if needed
beforeEach(() => {
  jest.clearAllMocks();

  // Setup default mock implementations
  const { User } = jest.requireActual('./models/User');
  const { Pet } = jest.requireActual('./models/Pet');
  const { Application } = jest.requireActual('./models/Application');
  const { Chat } = jest.requireActual('./models/Chat');
  const { ChatParticipant } = jest.requireActual('./models/ChatParticipant');
  const { Rescue } = jest.requireActual('./models/Rescue');

  // Default User mock implementations
  User.findByPk.mockImplementation((id: string) => {
    if (id === 'nonexistent') return Promise.resolve(null);
    return Promise.resolve(
      createMockSequelizeModel({
        user_id: id,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        status: 'active',
        user_type: 'adopter',
        notificationPreferences: {},
        privacySettings: {},
      })
    );
  });

  // Mock User.scope method
  User.scope = jest.fn().mockImplementation((scope: string) => ({
    findByPk: jest.fn().mockImplementation((id: string) => {
      if (id === 'nonexistent' || id === 'non-existent') return Promise.resolve(null);
      return Promise.resolve(
        createMockSequelizeModel({
          userId: id,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          status: 'active',
          userType: 'adopter',
          notificationPreferences: {},
          privacySettings: {},
        })
      );
    }),
  }));

  User.findOne.mockImplementation(() =>
    Promise.resolve(
      createMockSequelizeModel({
        user_id: 'test-id',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      })
    )
  );

  User.findAndCountAll.mockImplementation(() =>
    Promise.resolve({
      rows: [createMockSequelizeModel({ user_id: 'test-id' })],
      count: 1,
    })
  );

  User.count.mockImplementation(() => Promise.resolve(1));

  // Default Pet mock implementations
  Pet.findByPk.mockImplementation((id: string) => {
    if (id === 'nonexistent') return Promise.resolve(null);
    return Promise.resolve(
      createMockSequelizeModel({
        pet_id: id,
        name: 'Test Pet',
        status: 'available',
        rescue_id: 'test-rescue-id',
      })
    );
  });

  Pet.findAndCountAll.mockImplementation(() =>
    Promise.resolve({
      rows: [createMockSequelizeModel({ pet_id: 'test-id' })],
      count: 1,
    })
  );

  Pet.create.mockImplementation((data: any) =>
    Promise.resolve(createMockSequelizeModel({ ...data, pet_id: 'new-pet-id' }))
  );

  // Mock other models
  Application.count.mockImplementation(() => Promise.resolve(0));
  Chat.count.mockImplementation(() => Promise.resolve(0));
  ChatParticipant.findAll.mockImplementation(() => Promise.resolve([]));
  Rescue.findByPk.mockImplementation(() =>
    Promise.resolve(createMockSequelizeModel({ rescue_id: 'test-rescue' }))
  );
});

// Global test teardown
afterAll(async () => {
  // Close any open connections, clean up resources
});
