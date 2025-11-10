/**
 * Manual mock for Sequelize instance
 * This prevents models from initializing during tests
 */

const mockSequelize = {
  define: jest.fn().mockReturnValue({
    init: jest.fn(),
    sync: jest.fn(),
  }),
  query: jest.fn(),
  transaction: jest.fn(),
  authenticate: jest.fn(),
  sync: jest.fn(),
  close: jest.fn(),
  model: jest.fn(),
  isDefined: jest.fn().mockReturnValue(false),
  runHooks: jest.fn().mockResolvedValue(undefined),
  addHook: jest.fn(),
  removeHook: jest.fn(),
  hasHook: jest.fn().mockReturnValue(false),
  models: {},
  options: {
    hooks: {},
    define: {
      underscored: true,
      timestamps: true,
      freezeTableName: false,
      paranoid: true,
    },
  },
  config: {},
  dialect: {
    name: 'postgres',
    supports: {
      schemas: true,
      transactions: true,
    },
  },
  getQueryInterface: jest.fn().mockReturnValue({
    createTable: jest.fn(),
    dropTable: jest.fn(),
    addColumn: jest.fn(),
    removeColumn: jest.fn(),
  }),
};

export default mockSequelize;
