import { Request, Response } from 'express';
import User from '../models/User';
import { JsonObject, JsonValue } from './common';

// Base API Response Types
export interface ApiResponse<T = JsonValue> {
  message: string;
  data?: T;
  error?: string;
  details?: JsonObject;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: JsonObject;
  stack?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
  resourceId?: string;
}

export interface RequestWithResourceId extends AuthenticatedRequest {
  resourceId: string;
}

// Query Parameter Types
export interface SearchQuery {
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

// File Upload Types
export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: JsonValue;
}

export interface ValidationErrorDetails {
  type: string;
  msg: string;
  path: string;
  location: string;
  value?: JsonValue;
}

// JWT Types
export interface JWTPayload {
  userId: string;
  email: string;
  userType: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// HTTP Status Types
export type HttpStatus =
  | 200 // OK
  | 201 // Created
  | 204 // No Content
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 422 // Unprocessable Entity
  | 423 // Locked
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 503; // Service Unavailable

// API Route Handler Types
export type ApiHandler<T = JsonValue> = (req: AuthenticatedRequest, res: Response) => Promise<void>;

export type PublicApiHandler<T = JsonValue> = (req: Request, res: Response) => Promise<void>;
