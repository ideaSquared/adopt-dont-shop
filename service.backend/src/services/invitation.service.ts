import crypto from 'crypto';
import { Op } from 'sequelize';
import Invitation from '../models/Invitation';
import User, { UserType, UserStatus } from '../models/User';
import Rescue from '../models/Rescue';
import StaffMember from '../models/StaffMember';
import Role from '../models/Role';
import UserRole from '../models/UserRole';
import EmailTemplateService from './email-template.service';
import { logger } from '../utils/logger';

export class InvitationService {
  /**
   * Get invitation details for display (without sensitive info)
   */
  static async getInvitationDetails(token: string) {
    try {
      const invitation = await Invitation.findOne({
        where: {
          token,
          used: false,
          expiration: { [Op.gt]: new Date() },
        },
      });

      return invitation;
    } catch (error) {
      logger.error('Error getting invitation details:', error);
      throw new Error('Failed to get invitation details');
    }
  }

  /**
   * Invite a staff member to join a rescue
   */
  static async inviteStaffMember(
    rescueId: string,
    email: string,
    title: string = '',
    invitedBy: string
  ): Promise<{ success: boolean; message: string; invitationId?: number }> {
    const transaction = await Invitation.sequelize!.transaction();

    try {
      // Check if rescue exists
      const rescue = await Rescue.findByPk(rescueId, { transaction });
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      // Check if email is already associated with this rescue
      const existingStaff = await StaffMember.findOne({
        where: { rescueId, isDeleted: false },
        include: [
          {
            model: User,
            as: 'user',
            where: { email },
          },
        ],
        transaction,
      });

      if (existingStaff) {
        throw new Error('User is already a staff member of this rescue');
      }

      // Check for existing pending invitation
      const existingInvitation = await Invitation.findOne({
        where: {
          email,
          rescue_id: rescueId,
          used: false,
          expiration: { [Op.gt]: new Date() },
        },
        transaction,
      });

      if (existingInvitation) {
        throw new Error('A pending invitation already exists for this email');
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

      // Create invitation
      const invitation = await Invitation.create(
        {
          email,
          rescue_id: rescueId,
          token,
          expiration: expirationDate,
          title,
          invited_by: invitedBy,
          used: false,
        },
        { transaction }
      );

      // Send invitation email
      try {
        const invitationUrl = `${process.env.RESCUE_FRONTEND_URL || 'http://localhost:3002'}/accept-invitation?token=${token}`;

        await EmailTemplateService.sendStaffInvitation({
          recipientEmail: email,
          rescueName: rescue.name,
          inviterName: invitedBy,
          invitationUrl,
          title,
          expirationDays: 7,
        });

        logger.info(
          `Staff invitation email sent for ${email} for rescue ${rescueId}. URL: ${invitationUrl}`
        );
      } catch (emailError) {
        logger.error('Failed to send invitation email:', emailError);
        // Continue with the process - invitation is created even if email fails
      }

      await transaction.commit();

      return {
        success: true,
        message: 'Invitation sent successfully',
        invitationId: invitation.invitation_id,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error inviting staff member:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Accept a staff invitation and create user account
   */
  static async acceptInvitation(
    token: string,
    userData: {
      firstName: string;
      lastName: string;
      phone?: string;
      password: string;
      title?: string; // Add title to userData
    },
    invitedBy?: string // Add optional invitedBy parameter
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    const transaction = await Invitation.sequelize!.transaction();

    try {
      // Find valid invitation
      const invitation = await Invitation.findOne({
        where: {
          token,
          used: false,
          expiration: { [Op.gt]: new Date() },
        },
        include: [
          {
            model: Rescue,
            as: 'rescue',
            attributes: ['rescueId', 'name'],
          },
        ],
        transaction,
      });

      if (!invitation) {
        throw new Error('Invitation not found or expired');
      }

      if (invitation.used) {
        throw new Error('This invitation has already been used');
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({
        where: { email: invitation.email },
        transaction,
      });

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Generate unique user ID
      const userIdPrefix = 'user_rescue_staff_';
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      const userId = `${userIdPrefix}${timestamp}${randomSuffix}`;

      // Create user account
      const user = await User.create(
        {
          userId,
          email: invitation.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phone,
          password: userData.password, // Will be hashed by User model
          userType: UserType.RESCUE_STAFF,
          status: UserStatus.ACTIVE,
          emailVerified: true, // Email is verified since they received the invitation
        },
        { transaction }
      );

      // Create staff member record
      await StaffMember.create(
        {
          userId: user.userId,
          rescueId: invitation.rescue_id,
          title: userData.title || invitation.title || '',
          isVerified: true, // Auto-verified since invited by admin
          verifiedBy: invitation.invited_by || user.userId,
          verifiedAt: new Date(),
          addedBy: invitation.invited_by || user.userId,
          addedAt: new Date(),
          isDeleted: false,
        },
        { transaction }
      );

      // Assign rescue_staff role
      const rescueStaffRole = await Role.findOne({
        where: { name: 'rescue_staff' },
        transaction,
      });

      if (rescueStaffRole) {
        await UserRole.create(
          {
            userId: user.userId,
            roleId: rescueStaffRole.roleId,
          },
          { transaction }
        );
      }

      // Mark invitation as used
      await invitation.update(
        {
          used: true,
          user_id: user.userId,
        },
        { transaction }
      );

      await transaction.commit();

      logger.info(
        `Staff invitation accepted: ${invitation.email} created account ${user.userId} for rescue ${invitation.rescue_id}`
      );

      return {
        success: true,
        message: 'Account created successfully',
        userId: user.userId,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error accepting invitation:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get pending invitations for a rescue
   */
  static async getPendingInvitations(rescueId: string) {
    try {
      const invitations = await Invitation.findAll({
        where: {
          rescue_id: rescueId,
          used: false,
          expiration: { [Op.gt]: new Date() },
        },
        attributes: ['invitation_id', 'email', 'title', 'invited_by', 'created_at', 'expiration'],
        order: [['created_at', 'DESC']],
      });

      // Transform to camelCase for frontend
      const transformedInvitations = invitations.map(inv => {
        const plain = inv.get({ plain: true });
        return {
          invitationId: plain.invitation_id,
          rescueId: plain.rescue_id,
          email: plain.email,
          title: plain.title,
          status: 'pending' as const,
          token: '', // Don't expose token in list
          invitedBy: plain.invited_by,
          createdAt: plain.created_at,
          expiresAt: plain.expiration,
        };
      });

      return {
        success: true,
        data: transformedInvitations,
      };
    } catch (error) {
      logger.error('Error getting pending invitations:', error);
      throw new Error('Failed to get pending invitations');
    }
  }

  /**
   * Cancel a pending invitation
   */
  static async cancelInvitation(
    invitationId: number,
    cancelledBy: string
  ): Promise<{ success: boolean; message: string }> {
    const transaction = await Invitation.sequelize!.transaction();

    try {
      const invitation = await Invitation.findOne({
        where: {
          invitation_id: invitationId,
          used: false,
          expiration: { [Op.gt]: new Date() },
        },
        transaction,
      });

      if (!invitation) {
        throw new Error('Invitation not found or already expired');
      }

      // Mark as expired to effectively cancel it
      await invitation.update(
        {
          expiration: new Date(), // Set to past date
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: 'Invitation cancelled successfully',
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error cancelling invitation:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(errorMessage);
    }
  }
}
