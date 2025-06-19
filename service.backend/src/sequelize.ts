import { Sequelize } from 'sequelize-typescript';
import { config } from './config';
import { logger } from './utils/logger';

// Define the database connection
export const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  dialect: 'postgres',
  logging: config.database.logging,
  models: [__dirname + '/models'], // Auto-load all models from models directory
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true, // Add timestamps to all models
    underscored: true, // Use snake_case for all column names
  },
});

// Function to initialize database connection
export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Sync models with database (in development)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized successfully.');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};
