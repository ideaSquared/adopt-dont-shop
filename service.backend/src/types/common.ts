// Common types used across the application
import { Includeable, Order, WhereOptions } from 'sequelize';

// Generic value types
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}

// Database and query types
export interface WhereClause {
  [key: string]: JsonValue | WhereOptions; // Sequelize operators
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  order?: Order;
  include?: Includeable[];
}

export interface SequelizeInclude {
  model: typeof import('sequelize').Model; // Sequelize model class constructor
  as?: string;
  attributes?: string[];
  where?: WhereClause;
  include?: SequelizeInclude[];
  required?: boolean;
}

export interface DateFilter {
  [key: string]: Date | { [op: string]: Date | Date[] };
}

export interface NumericFilter {
  [key: string]: number | { [op: string]: number | number[] };
}

// Pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filter types
export interface BaseFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  category?: string;
}

// API Response types
export interface ApiResponse<T = JsonValue> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface BulkOperationResult<T> {
  success: T[];
  errors: Array<{
    item: JsonValue;
    error: string;
  }>;
  total: number;
  successCount: number;
  errorCount: number;
}

// Analytics common types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricSummary {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

// Configuration types
export type ConfigValue = string | number | boolean | JsonObject | JsonArray;

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  allowedValues?: ConfigValue[];
  pattern?: string;
}

// Template and content types
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  description: string;
  required: boolean;
  defaultValue?: JsonValue;
}

export type TemplateData = Record<string, JsonValue>;

// Notification and messaging types
export interface NotificationData {
  title: string;
  message: string;
  type: string;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
  metadata?: JsonObject;
}

// File and media types
export interface FileAttachment {
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  url: string;
  alt?: string;
}

// Contact and address types
export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

// Staff and team types
export interface StaffMember {
  userId: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
  isActive: boolean;
}

// Reference and document types
export interface Reference {
  name: string;
  relationship: string;
  contactInfo: ContactInfo;
  yearsKnown: number;
  notes?: string;
}

export interface Document {
  type: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  status: 'pending' | 'verified' | 'rejected';
}

// Error handling types
export interface ServiceError {
  code: string;
  message: string;
  details?: JsonObject;
  stack?: string;
}

// Audit and logging types
export interface AuditLogDetails {
  action: string;
  entity: string;
  entityId: string;
  changes?: {
    before?: JsonObject;
    after?: JsonObject;
  };
  metadata?: JsonObject;
}

// Statistics and metrics types
export interface CountByCategory {
  [category: string]: number;
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
}

// Webhook and external service types
export interface WebhookPayload {
  event: string;
  data: JsonObject;
  timestamp: Date;
  signature?: string;
}

// Feature flag types
export type FeatureFlagContext = Record<string, JsonValue>;

// Query result types for analytics
export interface QueryResultRow {
  [key: string]: JsonValue;
}

// Chat and messaging types
export interface MessageAttachment {
  type: 'image' | 'file';
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface MessageData {
  chatId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  replyToId?: string;
  attachments?: MessageAttachment[];
}

// Pet related types
export interface PetImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: JsonValue;
}
