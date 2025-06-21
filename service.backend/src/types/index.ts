// Export all main type definitions
export * from './api';
export * from './application';
export * from './pet';
export * from './user';

// Import types we need to use in this file
import { JsonObject } from './common';

// Export new specific types to avoid conflicts
export type {
  AuditLogDetails,
  BaseFilters,
  BulkOperationResult,
  ConfigValue,
  CountByCategory,
  DateFilter,
  DateRange,
  Document,
  FeatureFlagContext,
  FileAttachment,
  ImageMetadata,
  JsonArray,
  JsonObject,
  JsonValue,
  MetricSummary,
  NotificationData,
  PaginatedResult,
  Reference,
  ServiceError,
  StaffMember,
  TemplateData,
  TemplateVariable,
  TimeSeriesPoint,
  TrendData,
  WebhookPayload,
  WhereClause,
} from './common';

export * from './analytics';
export * from './configuration';
export * from './email';

// Export specific types from auth to avoid conflicts
export type {
  AuthenticatedUser,
  AuthEvent,
  AuthResponse,
  AuthUserRole,
  EmailVerificationRequest,
  EmailVerificationToken,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  PasswordResetToken,
  PasswordStrength,
  RefreshTokenRequest,
  RegisterData,
  TokenValidationResult,
  TwoFactorAuth,
  TwoFactorBackupCode,
  TwoFactorSetupRequest,
  TwoFactorVerifyRequest,
  UserPermission,
  UserSession,
} from './auth';

// RBAC Types
export * from './rbac';

// Database Types - export specific types to avoid ValidationRule conflict
export type {
  DatabaseConfig,
  DatabaseHealth,
  DatabaseMetrics,
  QueryPerformance,
  TransactionOptions,
} from './database';

// Common Utility Types
export interface IdParam {
  id: string;
}

export interface UserIdParam {
  userId: string;
}

export interface TimestampFields {
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface AuditFields {
  created_by: string;
  updated_by: string;
  version: number;
}

// Generic CRUD Types
export interface CreateRequest<T> {
  data: Omit<T, 'id' | 'created_at' | 'updated_at'>;
}

export interface UpdateRequest<T> {
  data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>;
}

export interface ListRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: JsonObject;
}

export interface ListResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Environment Types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  CORS_ORIGIN: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  REDIS_URL?: string;
  EMAIL_FROM: string;
  EMAIL_SERVICE?: string;
  EMAIL_HOST?: string;
  EMAIL_PORT?: number;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  S3_BUCKET?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

// Configuration Types
export interface AppConfig {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
  };
  database: {
    url: string;
    pool: {
      max: number;
      min: number;
      acquire: number;
      idle: number;
    };
    logging: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    bcryptRounds: number;
  };
  email: {
    from: string;
    service?: string;
    host?: string;
    port?: number;
    auth?: {
      user: string;
      pass: string;
    };
  };
  storage: {
    provider: 'local' | 'aws' | 'gcp';
    local?: {
      uploadPath: string;
      maxFileSize: number;
    };
    aws?: {
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  cache: {
    provider: 'memory' | 'redis';
    redis?: {
      url: string;
      keyPrefix: string;
    };
    ttl: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'pretty';
    transports: ('console' | 'file' | 'database')[];
  };
  security: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    helmet: boolean;
  };
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: JsonObject;
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
  timestamp: Date;
}

// Logging Types
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  service: string;
  userId?: string;
  requestId?: string;
  metadata?: JsonObject;
  stack?: string;
}

// Health Check Types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    cache?: ServiceHealth;
    email?: ServiceHealth;
    storage?: ServiceHealth;
  };
  version: string;
  uptime: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: JsonObject;
}

// Metrics Types
export interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    rate: number; // requests per second
  };
  response_time: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  database: {
    connections: number;
    queries: number;
    slow_queries: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  timestamp: Date;
}

// User Activity Types
export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: JsonObject;
}

export interface UserActivity {
  recent: ActivityItem[];
  total: number;
  lastActive?: Date;
}

// System Analytics Types
export interface SystemMetrics {
  users: {
    total: number;
    active: number;
    new: number;
  };
  rescues: {
    total: number;
    verified: number;
    pending: number;
  };
  pets: {
    total: number;
    available: number;
    adopted: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
  };
}
