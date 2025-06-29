import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
let database: string;

switch (env) {
  case 'development':
    database = process.env.DEV_DB_NAME!;
    break;
  case 'test':
    database = process.env.TEST_DB_NAME!;
    break;
  case 'production':
    database = process.env.PROD_DB_NAME!;
    break;
  default:
    throw new Error('NODE_ENV is not set to a valid environment');
}

const sequelize = new Sequelize(
  database,
  process.env.POSTGRES_USER!,
  process.env.POSTGRES_PASSWORD!,
  {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT!),
    dialect: 'postgres',
    define: {
      // Convert camelCase to snake_case for database columns
      underscored: true,
      // Use camelCase for model attributes
      freezeTableName: false,
      // Enable timestamps with camelCase names
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      deletedAt: 'deletedAt',
      // Enable paranoid (soft delete) by default
      paranoid: true,
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

export default sequelize;
