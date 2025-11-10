import { Response } from 'express';
import { validationResult } from 'express-validator';
import { ApplicationProfileService } from '../services/application-profile.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

/**
 * Phase 1 - Application Profile Controller
 * Handles API endpoints for application defaults and pre-population functionality.
 * Provides RESTful endpoints for managing user application profiles, preferences,
 * and pre-population data to reduce form filling time.
 */
export class ApplicationProfileController {
  /**
   * Get user's application defaults for form pre-population
   * @route GET /api/v1/profile/application-defaults
   * @param req - Authenticated request containing user information
   * @param res - Express response object
   * @returns JSON response with user's application defaults or error
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "personalInfo": { "firstName": "John", "lastName": "Doe" },
   *     "livingSituation": { "housingType": "apartment", "isOwned": false }
   *   }
   * }
   * ```
   */
  static async getApplicationDefaults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const defaults = await ApplicationProfileService.getApplicationDefaults(userId);

      res.status(200).json({
        success: true,
        data: defaults,
      });
    } catch (error) {
      logger.error('Error getting application defaults:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get application defaults',
      });
    }
  }

  /**
   * Update user's application defaults with validation and error handling
   * @route PUT /api/v1/profile/application-defaults
   * @param req - Authenticated request containing application defaults in body
   * @param res - Express response object
   * @returns JSON response with updated defaults or validation errors
   * @example
   * Request body:
   * ```json
   * {
   *   "applicationDefaults": {
   *     "personalInfo": { "firstName": "Jane", "occupation": "Teacher" },
   *     "livingSituation": { "housingType": "house", "hasYard": true }
   *   }
   * }
   * ```
   */
  static async updateApplicationDefaults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!.userId;
      const updatedDefaults = await ApplicationProfileService.updateApplicationDefaults(
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Application defaults updated successfully',
        data: updatedDefaults,
      });
    } catch (error) {
      logger.error('Error updating application defaults:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application defaults',
      });
    }
  }

  /**
   * Get user's application behavior preferences (auto-populate, quick apply, notifications)
   * @route GET /api/v1/profile/application-preferences
   * @param req - Authenticated request containing user information
   * @param res - Express response object
   * @returns JSON response with user's application preferences
   * @example
   * Response:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "auto_populate": true,
   *     "quick_apply_enabled": false,
   *     "completion_reminders": true
   *   }
   * }
   * ```
   */
  static async getApplicationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const preferences = await ApplicationProfileService.getApplicationPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Error getting application preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get application preferences',
      });
    }
  }

  /**
   * Update user's application behavior preferences with validation
   * @route PUT /api/v1/profile/application-preferences
   * @param req - Authenticated request containing application preferences in body
   * @param res - Express response object
   * @returns JSON response with updated preferences or validation errors
   * @example
   * Request body:
   * ```json
   * {
   *   "applicationPreferences": {
   *     "auto_populate": false,
   *     "quick_apply_enabled": true,
   *     "completion_reminders": false
   *   }
   * }
   * ```
   */
  static async updateApplicationPreferences(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!.userId;
      const updatedPreferences = await ApplicationProfileService.updateApplicationPreferences(
        userId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: 'Application preferences updated successfully',
        data: updatedPreferences,
      });
    } catch (error) {
      logger.error('Error updating application preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update application preferences',
      });
    }
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const completion = await ApplicationProfileService.getProfileCompletion(userId);

      res.status(200).json({
        success: true,
        data: completion,
      });
    } catch (error) {
      logger.error('Error getting profile completion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile completion status',
      });
    }
  }

  /**
   * Get pre-population data for application forms
   */
  static async getPrePopulationData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { petId } = req.query;

      const prePopulationData = await ApplicationProfileService.getPrePopulationData(
        userId,
        petId as string
      );

      res.status(200).json({
        success: true,
        data: prePopulationData,
      });
    } catch (error) {
      logger.error('Error getting pre-population data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pre-population data',
      });
    }
  }

  /**
   * Process quick application request
   */
  static async processQuickApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
        return;
      }

      const userId = req.user!.userId;
      const result = await ApplicationProfileService.processQuickApplication(userId, req.body);

      if (!result.canProceed) {
        res.status(400).json({
          success: false,
          message: 'Profile not complete enough for quick application',
          data: {
            missingFields: result.missingFields,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Quick application can proceed',
        data: {
          prePopulationData: result.prePopulationData,
        },
      });
    } catch (error) {
      logger.error('Error processing quick application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process quick application request',
      });
    }
  }
}
