import { Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Base Controller - Provides standardized response formatting
 *
 * Ensures all API responses follow a consistent format across the application:
 * - Success responses include success: true, data, and optional meta/message
 * - Error responses include success: false, message, and optional error details
 * - Pagination follows the meta structure used by other endpoints
 */
export class BaseController {
  /**
   * Send a successful response with data
   */
  protected sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
    meta?: {
      total?: number;
      page?: number;
      totalPages?: number;
      hasNext?: boolean;
      hasPrev?: boolean;
      [key: string]: unknown;
    }
  ): Response {
    const response: Record<string, unknown> = {
      success: true,
      data,
    };

    if (message) {
      response.message = message;
    }

    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a successful response for lists with pagination (using meta structure)
   */
  protected sendPaginatedSuccess<T>(
    res: Response,
    data: T[],
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
    message?: string,
    statusCode: number = 200
  ): Response {
    return this.sendSuccess(res, data, message, statusCode, {
      total: pagination.total,
      page: pagination.page,
      totalPages: pagination.totalPages,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    });
  }

  /**
   * Send an error response
   */
  protected sendError(
    res: Response,
    message: string,
    statusCode: number = 500,
    error?: string | string[],
    errors?: Record<string, unknown>[]
  ): Response {
    const response: Record<string, unknown> = {
      success: false,
      message,
    };

    // Add validation errors if provided
    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    // Add error details in development mode
    if (error && process.env.NODE_ENV === 'development') {
      response.error = error;
    }

    // Log the error for debugging
    logger.error(`API Error (${statusCode}): ${message}`, {
      error,
      statusCode,
    });

    return res.status(statusCode).json(response);
  }

  /**
   * Send a validation error response
   */
  protected sendValidationError(
    res: Response,
    errors: Record<string, unknown>[],
    message: string = 'Validation failed'
  ): Response {
    return this.sendError(res, message, 400, undefined, errors);
  }

  /**
   * Send a not found error response
   */
  protected sendNotFound(res: Response, resource: string = 'Resource'): Response {
    return this.sendError(res, `${resource} not found`, 404);
  }

  /**
   * Send an unauthorized error response
   */
  protected sendUnauthorized(res: Response, message: string = 'Unauthorized access'): Response {
    return this.sendError(res, message, 401);
  }

  /**
   * Send a forbidden error response
   */
  protected sendForbidden(res: Response, message: string = 'Access denied'): Response {
    return this.sendError(res, message, 403);
  }

  /**
   * Transform raw database model to frontend-compatible format
   * This method should be overridden by child controllers for specific transformations
   */
  protected transformModel<T, K>(model: T): K {
    // Default implementation - just return the model as-is
    // Child controllers should override this for specific transformations
    return model as unknown as K;
  }

  /**
   * Transform an array of models
   */
  protected transformModels<T, K>(models: T[]): K[] {
    return models.map(model => this.transformModel<T, K>(model));
  }

  /**
   * Extract pagination parameters from query
   */
  protected getPaginationParams(query: Record<string, unknown>): {
    page: number;
    limit: number;
    offset: number;
  } {
    const page = Math.max(1, parseInt((query.page as string) || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt((query.limit as string) || '20') || 20));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Extract sort parameters from query
   */
  protected getSortParams(
    query: Record<string, unknown>,
    defaultSortBy: string = 'created_at'
  ): {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  } {
    const sortBy = (query.sortBy as string) || defaultSortBy;
    const sortOrder = ((query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as
      | 'ASC'
      | 'DESC';

    return { sortBy, sortOrder };
  }

  /**
   * @deprecated Use sendPaginatedSuccess instead
   * Send a paginated response (legacy method for backward compatibility)
   */
  protected sendPaginatedResponse(
    res: Response,
    data: unknown[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success'
  ): void {
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
