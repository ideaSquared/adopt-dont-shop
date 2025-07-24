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
    origin: (() => {
      const corsOrigin = process.env.CORS_ORIGIN;
      if (corsOrigin) {
        // Handle multiple origins (comma-separated)
        if (corsOrigin.includes(',')) {
          return corsOrigin.split(',').map(origin => origin.trim());
        }
        return corsOrigin;
      }
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CORS_ORIGIN environment variable is required in production');
      }
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost',
        'http://admin.localhost',
        'http://rescue.localhost',
        'http://api.localhost',
      ]; // Safe defaults for development
    })(),
    credentials: true,
  },

  // Storage configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local' | 's3'
    local: {
      directory: process.env.UPLOAD_DIR || 'uploads',
      publicPath: process.env.PUBLIC_UPLOAD_PATH || '/uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain',
      ],
    },
    s3: {
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
    },
  },

  // Email configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'ethereal', // 'ethereal' | 'sendgrid' | 'ses' | 'smtp'
    ethereal: {
      // Ethereal creates test accounts automatically
      createTestAccount: process.env.NODE_ENV === 'development',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME || "Adopt Don't Shop",
    },
    ses: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
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
