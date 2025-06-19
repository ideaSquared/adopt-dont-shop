import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration object
export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'adopt_dont_shop',
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'adoptdontshopsecret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Cors configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // File upload configuration
  uploads: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@adoptdontshop.com',
  },
};
