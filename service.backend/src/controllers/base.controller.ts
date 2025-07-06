import { Response } from 'express';
import { logger } from '../utils/logger';

export class BaseController {
  /**
   * Send a successful response
   */
  protected sendSuccess(
    res: Response,
    data: any = null,
    message: string = 'Success',
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send an error response
   */
  protected sendError(
    res: Response,
    message: string = 'Internal Server Error',
    statusCode: number = 500,
    errors: any = null
  ): void {
    const errorResponse: any = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      errorResponse.errors = errors;
    }

    // Log error details for debugging
    if (statusCode >= 500) {
      logger.error('Server error occurred', {
        statusCode,
        message,
        errors,
      });
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Send a paginated response
   */
  protected sendPaginatedResponse(
    res: Response,
    data: any[],
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
