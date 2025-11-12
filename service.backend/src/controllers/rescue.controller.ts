import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { RescueService } from '../services/rescue.service';
import { InvitationService } from '../services/invitation.service';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';
import { AdoptionPolicy } from '../types/rescue';
import EmailService from '../services/email.service';
import { EmailType, EmailPriority } from '../models/EmailQueue';

export class RescueController {
  /**
   * Search rescues with filters and pagination
   */
  searchRescues = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 20,
        search,
        status,
        location,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per page
        search: search as string,
        status: status as 'pending' | 'verified' | 'suspended' | 'inactive',
        location: location as string,
        sortBy: sortBy as 'name' | 'createdAt' | 'verifiedAt',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const result = await RescueService.searchRescues(options);

      res.status(200).json({
        success: true,
        data: result.rescues,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Search rescues failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search rescues',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get rescue by ID
   */
  getRescueById = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const includeStats = req.query.includeStats === 'true';

      const rescue = await RescueService.getRescueById(rescueId, includeStats);

      res.status(200).json({
        success: true,
        data: rescue,
      });
    } catch (error) {
      logger.error('Get rescue by ID failed:', error);
      const statusCode = error instanceof Error && error.message === 'Rescue not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to retrieve rescue',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Create new rescue organization
   */
  createRescue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const rescueData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city,
        county: req.body.state,
        postcode: req.body.zipCode,
        country: req.body.country,
        website: req.body.website,
        description: req.body.description,
        mission: req.body.mission,
        ein: req.body.ein,
        registrationNumber: req.body.registrationNumber,
        contactPerson: req.body.contactPerson,
        contactTitle: req.body.contactTitle,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
      };

      const rescue = await RescueService.createRescue(rescueData, req.user!.userId);

      res.status(201).json({
        success: true,
        message: 'Rescue organization created successfully',
        data: rescue,
      });
    } catch (error) {
      logger.error('Create rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create rescue organization',
        error: errorMessage,
      });
    }
  };

  /**
   * Update rescue information
   */
  updateRescue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const updateData = req.body;

      const rescue = await RescueService.updateRescue(rescueId, updateData, req.user!.userId);

      res.status(200).json({
        success: true,
        message: 'Rescue updated successfully',
        data: rescue,
      });
    } catch (error) {
      logger.error('Update rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update rescue',
        error: errorMessage,
      });
    }
  };

  /**
   * Verify rescue organization (admin only)
   */
  verifyRescue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { notes } = req.body;

      const rescue = await RescueService.verifyRescue(rescueId, req.user!.userId, notes);

      res.status(200).json({
        success: true,
        message: 'Rescue verified successfully',
        data: rescue,
      });
    } catch (error) {
      logger.error('Verify rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already verified')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to verify rescue',
        error: errorMessage,
      });
    }
  };

  /**
   * Reject a rescue organization
   */
  rejectRescue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { reason, notes } = req.body;

      const rescue = await RescueService.rejectRescue(rescueId, req.user!.userId, reason, notes);

      res.status(200).json({
        success: true,
        message: 'Rescue rejected successfully',
        data: rescue,
      });
    } catch (error) {
      logger.error('Reject rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already verified') || errorMessage.includes('already rejected')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to reject rescue',
        error: errorMessage,
      });
    }
  };

  /**
   * Get rescue staff with pagination
   */
  getRescueStaff = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // First verify rescue exists
      const rescue = await RescueService.getRescueById(rescueId);
      if (!rescue) {
        return res.status(404).json({
          success: false,
          message: 'Rescue not found',
        });
      }

      // Get staff members via RescueService
      const result = await RescueService.getRescueStaff(rescueId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        data: result.staff,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get rescue staff failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rescue staff',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Add staff member to rescue
   */
  addStaffMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { userId, title } = req.body;

      const staffMember = await RescueService.addStaffMember(
        rescueId,
        userId,
        title,
        req.user!.userId
      );

      res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        data: staffMember,
      });
    } catch (error) {
      logger.error('Add staff member failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage.includes('already a staff member')) {
        return res.status(409).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add staff member',
        error: errorMessage,
      });
    }
  };

  /**
   * Remove staff member from rescue
   */
  removeStaffMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId, userId } = req.params;
      const currentUserId = req.user!.userId;

      // Prevent self-removal
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message:
            'You cannot remove yourself from the rescue. Please ask another admin to remove you.',
        });
      }

      const result = await RescueService.removeStaffMember(rescueId, userId, currentUserId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Remove staff member failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to remove staff member',
        error: errorMessage,
      });
    }
  };

  /**
   * Update staff member in rescue
   */
  updateStaffMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId, userId } = req.params;
      const { title } = req.body;
      const currentUserId = req.user!.userId;

      // Prevent self-editing
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message:
            'You cannot edit your own profile. Please ask another admin to make changes to your account.',
        });
      }

      const result = await RescueService.updateStaffMember(
        rescueId,
        userId,
        { title },
        currentUserId
      );

      res.status(200).json({
        success: true,
        message: 'Staff member updated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Update staff member failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Staff member not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update staff member',
        error: errorMessage,
      });
    }
  };

  /**
   * Get rescue pets with pagination
   */
  getRescuePets = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const result = await RescueService.getRescuePets(rescueId, options);

      res.status(200).json({
        success: true,
        data: result.pets,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Get rescue pets failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rescue pets',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get rescue analytics and statistics
   */
  getRescueAnalytics = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;

      const statistics = await RescueService.getRescueStatistics(rescueId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error('Get rescue analytics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rescue analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Delete rescue (soft delete, admin only)
   */
  deleteRescue = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { reason } = req.body;

      const result = await RescueService.deleteRescue(rescueId, req.user!.userId, reason);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      logger.error('Delete rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete rescue',
        error: errorMessage,
      });
    }
  };

  /**
   * Invite a new staff member to join the rescue
   */
  inviteStaffMember = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { email, title } = req.body;
      const invitedBy = req.user!.userId;

      const result = await InvitationService.inviteStaffMember(rescueId, email, title, invitedBy);

      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error inviting staff member:', {
        error: errorMessage,
        rescueId: req.params.rescueId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to invite staff member',
        error: errorMessage,
      });
    }
  };

  /**
   * Get pending invitations for a rescue
   */
  getPendingInvitations = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;

      const result = await InvitationService.getPendingInvitations(rescueId);

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting pending invitations:', {
        error: errorMessage,
        rescueId: req.params.rescueId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get pending invitations',
        error: errorMessage,
      });
    }
  };

  /**
   * Cancel a pending invitation
   */
  cancelInvitation = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId, invitationId } = req.params;
      const cancelledBy = req.user!.userId;

      const result = await InvitationService.cancelInvitation(parseInt(invitationId), cancelledBy);

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error cancelling invitation:', {
        error: errorMessage,
        invitationId: req.params.invitationId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to cancel invitation',
        error: errorMessage,
      });
    }
  };

  /**
   * Update adoption policies for a rescue
   */
  updateAdoptionPolicies = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const adoptionPolicies: AdoptionPolicy = req.body;
      const updatedBy = req.user!.userId;

      const result = await RescueService.updateAdoptionPolicies(
        rescueId,
        adoptionPolicies,
        updatedBy
      );

      res.status(200).json({
        success: true,
        message: 'Adoption policies updated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Update adoption policies failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update adoption policies',
        error: errorMessage,
      });
    }
  };

  /**
   * Get adoption policies for a rescue
   */
  getAdoptionPolicies = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;

      const adoptionPolicies = await RescueService.getAdoptionPolicies(rescueId);

      res.status(200).json({
        success: true,
        data: adoptionPolicies,
      });
    } catch (error) {
      logger.error('Get adoption policies failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve adoption policies',
        error: errorMessage,
      });
    }
  };

  /**
   * Send email to rescue organization
   */
  sendEmail = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { rescueId } = req.params;
      const { subject, body, templateId } = req.body;

      // Get rescue organization details first
      const rescue = await RescueService.getRescueById(rescueId, false);

      if (!rescue) {
        return res.status(404).json({
          success: false,
          message: 'Rescue not found',
        });
      }

      // Check if rescue has an email address
      if (!rescue.email) {
        return res.status(400).json({
          success: false,
          message: 'Rescue organization does not have an email address',
        });
      }

      // If using a template, only templateId is required
      // If custom email, both subject and body are required
      if (!templateId && (!subject || !body)) {
        return res.status(400).json({
          success: false,
          message: 'Either templateId or both subject and body are required',
        });
      }

      // Send email via email service with template support
      const emailId = await EmailService.sendEmail({
        templateId: templateId || undefined,
        toEmail: rescue.email,
        toName: rescue.name,
        subject: subject || undefined,
        htmlContent: body || undefined,
        templateData: {
          rescueName: rescue.name,
          rescueId: rescue.rescueId,
          baseUrl: process.env.FRONTEND_URL || 'https://adoptdontshop.com',
        },
        userId: req.user!.userId,
        type: EmailType.SYSTEM,
        priority: EmailPriority.NORMAL,
        tags: ['rescue-email', rescueId],
        metadata: {
          rescueId,
          rescueName: rescue.name,
          sentBy: req.user!.userId,
          ...(templateId && { templateId }),
        },
      });

      logger.info('Email sent to rescue organization', {
        rescueId,
        rescueName: rescue.name,
        emailId,
        sentBy: req.user!.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: {
          emailId,
          recipientEmail: rescue.email,
        },
      });
    } catch (error) {
      logger.error('Send email to rescue failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Rescue not found') {
        return res.status(404).json({
          success: false,
          message: errorMessage,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: errorMessage,
      });
    }
  };
}
