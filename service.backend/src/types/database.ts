import {
  CreateOptions,
  DestroyOptions,
  Includeable,
  Op,
  Order,
  Transaction,
  UpdateOptions,
  WhereOptions,
} from 'sequelize';
import { JsonObject, JsonValue } from './common';

// Database Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'postgres' | 'mysql' | 'sqlite' | 'mariadb' | 'mssql';
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
  logging?: boolean | ((sql: string) => void);
  timezone?: string;
  ssl?: boolean | object;
  dialectOptions?: JsonObject;
}

// Query Types
export interface BaseQuery {
  where?: WhereOptions;
  include?: Includeable[];
  order?: Order;
  limit?: number;
  offset?: number;
  attributes?: string[];
  transaction?: Transaction;
}

export interface FindAllQuery extends BaseQuery {
  distinct?: boolean;
  group?: string[];
  having?: WhereOptions;
}

export interface CountQuery {
  where?: WhereOptions;
  include?: Includeable[];
  distinct?: boolean;
  transaction?: Transaction;
}

// Repository Pattern Types
export interface BaseRepository<T> {
  findById(id: string, options?: unknown): Promise<T | null>;
  findAll(filters?: WhereOptions): Promise<T[]>;
  findOne(query: BaseQuery): Promise<T | null>;
  create(data: Partial<T>, options?: CreateOptions): Promise<T>;
  update(id: string, data: Partial<T>, options?: UpdateOptions): Promise<T>;
  delete(id: string, options?: DestroyOptions): Promise<boolean>;
  count(query?: CountQuery): Promise<number>;
  exists(id: string): Promise<boolean>;
  bulkCreate(data: Partial<T>[], options?: CreateOptions): Promise<T[]>;
  bulkUpdate(data: Partial<T>, query: WhereOptions, options?: UpdateOptions): Promise<number>;
  bulkDelete(query: WhereOptions, options?: DestroyOptions): Promise<number>;
}

// Service Layer Types
export interface BaseService<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: ServiceFilters): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Service Filter Types
export interface ServiceFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  category?: string;
  [key: string]: JsonValue | WhereOptions | Date | undefined;
}

// Transaction Types
export interface TransactionContext {
  transaction: Transaction;
}

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  type?: 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';
  deferrable?: string;
  logging?: boolean | ((sql: string) => void);
}

// Migration Types
export interface MigrationInfo {
  name: string;
  version: string;
  description?: string;
  executed_at?: Date;
  execution_time?: number;
}

export interface MigrationRunner {
  up(): Promise<void>;
  down(): Promise<void>;
}

// Seed Data Types
export interface SeedData<T = JsonValue> {
  table: string;
  data: T[];
  dependencies?: string[];
  order?: number;
}

export interface SeedRunner {
  run(): Promise<void>;
  rollback(): Promise<void>;
}

// Database Health Types
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connection: boolean;
  response_time: number;
  active_connections: number;
  max_connections: number;
  disk_usage?: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  last_check: Date;
}

// Backup Types
export interface BackupConfig {
  schedule: string; // cron expression
  retention_days: number;
  storage_path: string;
  compression: boolean;
  encryption?: {
    enabled: boolean;
    key?: string;
  };
}

export interface BackupInfo {
  backup_id: string;
  filename: string;
  size: number;
  created_at: Date;
  type: 'full' | 'incremental' | 'differential';
  status: 'in_progress' | 'completed' | 'failed';
  error_message?: string;
}

// Model Associations Types
export interface AssociationConfig {
  model: string;
  type: 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';
  foreignKey?: string;
  targetKey?: string;
  through?: string;
  as?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// Audit Trail Types
export interface AuditTrail {
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: JsonObject;
  new_values?: JsonObject;
  changed_fields?: string[];
  user_id?: string;
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

// Database Monitoring Types
export interface QueryPerformance {
  query_id: string;
  sql: string;
  execution_time: number;
  row_count: number;
  timestamp: Date;
  slow_query: boolean;
}

export interface DatabaseMetrics {
  queries_per_second: number;
  average_response_time: number;
  slow_queries_count: number;
  connection_pool_usage: number;
  cache_hit_ratio: number;
  timestamp: Date;
}

// Data Validation Types
export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'length' | 'format' | 'custom';
  constraint?: JsonObject;
  message?: string;
  value?: JsonValue;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: JsonValue;
  }>;
}

// Cache Types
export interface CacheConfig {
  ttl: number; // time to live in seconds
  max_size?: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

export interface CacheEntry<T = JsonValue> {
  key: string;
  value: T;
  created_at: Date;
  expires_at: Date;
  hit_count: number;
  last_accessed: Date;
}

// Search Types
export interface SearchConfig {
  fields: string[];
  weights?: Record<string, number>;
  fuzzy?: boolean;
  fuzzy_threshold?: number;
}

export interface SearchResult<T> {
  items: Array<T & { _score?: number }>;
  total: number;
  max_score?: number;
  query_time: number;
}

// Connection Pool Types
export interface PoolConfig {
  min: number;
  max: number;
  acquire: number;
  idle: number;
  evict: number;
  handleDisconnects: boolean;
}

export interface PoolStatus {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface QueryOptions {
  where?: WhereOptions;
  include?: Includeable[];
  order?: Order;
  limit?: number;
  offset?: number;
}

export interface PaginatedQueryOptions extends QueryOptions {
  page?: number;
  limit?: number;
}

export interface CustomFindOptions {
  where?: WhereOptions;
  include?: Includeable[];
  // ... existing properties ...
}

export interface AuditLogEntry {
  // ... existing properties ...
  old_values?: JsonObject;
  new_values?: JsonObject;
}

export interface ValidationConstraint {
  // ... existing properties ...
  constraint?: JsonObject;
}

// Sequelize Operator Filter Types
export interface SequelizeOperatorFilter {
  [Op.gte]?: Date | number;
  [Op.lte]?: Date | number;
  [Op.gt]?: Date | number;
  [Op.lt]?: Date | number;
  [Op.between]?: [Date | number, Date | number];
  [Op.in]?: (string | number)[];
  [Op.notIn]?: (string | number)[];
  [Op.like]?: string;
  [Op.iLike]?: string;
  [Op.or]?: WhereOptions[];
  [Op.and]?: WhereOptions[];
  [Op.is]?: null | boolean;
  [Op.not]?: WhereOptions;
  [Op.ne]?: JsonValue;
  [Op.eq]?: JsonValue;
}

export interface SequelizeWhereConditions {
  [key: string]:
    | JsonValue
    | SequelizeOperatorFilter
    | WhereOptions
    | Date
    | number
    | string
    | boolean
    | null;
}
