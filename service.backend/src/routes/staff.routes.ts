import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import StaffMember from '../models/StaffMember';
import User, { UserType } from '../models/User';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';

const router = express.Router();
/** * @swagger * /api/v1/staff/me: *   get: *     tags: [Staff] *     summary: Get current user's staff information *     description: Get the current authenticated user's staff member record and rescue information *     security: *       - bearerAuth: [] *     responses: *       200: *         description: Staff information retrieved successfully *       401: *         description: Authentication required *       404: *         description: User is not associated with any rescue */ router.get(
  '/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;
      const staffMember = await StaffMember.findOne({
        where: { userId: userId, isDeleted: false },
      });
      if (!staffMember) {
        return res
          .status(404)
          .json({ success: false, message: 'You are not associated with any rescue organization' });
      }
      res.status(200).json({
        success: true,
        data: {
          staffMemberId: staffMember.staffMemberId,
          userId: staffMember.userId,
          rescueId: staffMember.rescueId,
          title: staffMember.title,
          isVerified: staffMember.isVerified,
          addedAt: staffMember.addedAt,
        },
      });
    } catch (error) {
      logger.error('Get staff me failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff information',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @swagger
 * /api/v1/staff/colleagues:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff colleagues for current user's rescue
 *     description: Get all staff members from the same rescue as the current user (rescue staff and admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff colleagues retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       rescueId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       user:
 *                         type: object
 *                         properties:
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - user must be rescue staff or admin
 *       404:
 *         description: User is not associated with any rescue
 */
router.get(
  '/colleagues',
  authenticateToken,
  requirePermission('staff.read'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.userId;

      // First find the current user's staff member record to get their rescue ID
      const currentUserStaff = await StaffMember.findOne({
        where: {
          userId: userId,
          isDeleted: false,
          isVerified: true,
        },
      });

      if (!currentUserStaff) {
        return res.status(404).json({
          success: false,
          message: 'You are not associated with any rescue organization',
        });
      }

      // Get all staff members from the same rescue
      const colleagues = await StaffMember.findAll({
        where: {
          rescueId: currentUserStaff.rescueId,
          isDeleted: false,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName', 'email'],
          },
        ],
        order: [['addedAt', 'DESC']],
      });

      const transformedColleagues = colleagues.map(staff => ({
        id: staff.staffMemberId,
        userId: staff.userId,
        rescueId: staff.rescueId,
        title: staff.title,
        isVerified: staff.isVerified,
        addedAt: staff.addedAt,
        user: staff.user
          ? {
              firstName: staff.user.firstName,
              lastName: staff.user.lastName,
              email: staff.user.email,
            }
          : null,
      }));

      res.status(200).json({
        success: true,
        data: transformedColleagues,
      });
    } catch (error) {
      logger.error('Get staff colleagues failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve staff colleagues',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
