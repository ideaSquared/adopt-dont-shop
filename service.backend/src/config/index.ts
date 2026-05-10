import dotenv from 'dotenv';
import path from 'path';
import { env, getDatabaseName } from './env';

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

// ADS-452/465: resolve the database name through the same canonical lookup
// `sequelize.ts` uses (DEV_DB_NAME / TEST_DB_NAME / PROD_DB_NAME) so we don't
// introduce a fourth variable. Resolved lazily so importing this module never
// throws when the env-specific name is missing in non-runtime contexts (tests
// stub `getDatabaseName` directly).
const resolveDatabaseName = (): string => {
  try {
    return getDatabaseName(process.env.NODE_ENV || 'development');
  } catch {
    return 'adopt_dont_shop';
  }
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
    database: resolveDatabaseName(),
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
        // ADS-215: with `credentials: true` the browser already disallows
        // wildcard (`*`) Access-Control-Allow-Origin, but reject it here
        // explicitly so the misconfiguration fails at startup with a
        // clearer error than CORS-blocked-in-the-browser noise. Same for
        // `null` and bare wildcards inside the comma-list.
        const origins = corsOrigin.includes(',')
          ? corsOrigin
              .split(',')
              .map(origin => origin.trim())
              .filter(Boolean)
          : [corsOrigin.trim()];
        const wildcards = origins.filter(o => o === '*' || o === 'null' || o.includes('*'));
        if (wildcards.length > 0) {
          throw new Error(
            `CORS_ORIGIN must be an explicit allowlist when credentials are enabled. ` +
              `Got wildcard/unsafe entries: ${wildcards.join(', ')}. ` +
              `List exact origins, comma-separated.`
          );
        }
        return origins.length === 1 ? origins[0] : origins;
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
      // ADS-422: in production nginx serves /uploads/* directly from the
      // shared volume after an auth_request to /api/v1/uploads/authorize.
      // Set SERVE_LOCAL_UPLOADS=true only when nginx is NOT in front
      // (local dev, CI without Docker networking).
      serveLocalUploads: process.env.SERVE_LOCAL_UPLOADS !== 'false',
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
    provider: process.env.EMAIL_PROVIDER || 'ethereal', // 'ethereal' | 'console' | 'resend' | 'sendgrid' | 'ses' | 'smtp'
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
      fromName: process.env.RESEND_FROM_NAME || "Adopt Don't Shop",
      replyTo: process.env.RESEND_REPLY_TO,
    },
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
    sessionSecret: env.SESSION_SECRET, // Validated in env.ts (minimum 32 characters)
    csrfSecret: env.CSRF_SECRET, // Validated in env.ts (minimum 32 characters)
  },
};
