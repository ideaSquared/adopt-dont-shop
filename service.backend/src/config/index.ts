import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Database logging function (eslint-compliant)
const createDatabaseLogger = () => {
  if (process.env.NODE_ENV === 'development' && process.env.DB_LOGGING === 'true') {
    // eslint-disable-next-line no-console
    return console.log;
  }
  return false;
};

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
    logging: createDatabaseLogger(),
  },

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (() => {
        throw new Error('JWT_SECRET environment variable is required');
      })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Cors configuration
  cors: {
    origin:
      process.env.CORS_ORIGIN ||
      (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('CORS_ORIGIN environment variable is required in production');
        }
        return 'http://localhost:3000'; // Safe default for development
      })(),
    credentials: true,
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

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret:
      process.env.SESSION_SECRET ||
      (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('SESSION_SECRET environment variable is required in production');
        }
        return 'dev-session-secret';
      })(),
  },
};
