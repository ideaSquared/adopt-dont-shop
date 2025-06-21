import { Op } from 'sequelize';
import Application from '../models/Application';
import AuditLog from '../models/AuditLog';
import Pet from '../models/Pet';
import Rescue from '../models/Rescue';
import User, { UserStatus } from '../models/User';
import { logger } from '../utils/logger';
import auditLogService from './auditLog.service';

interface UserFilter {
  role?: string;
  status?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

interface RescueFilter {
  status?: string;
  verified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
}

interface PetFilter {
  status?: string;
  species?: string;
  breed?: string;
  age?: string;
  size?: string;
  rescueId?: string;
  search?: string;
}

interface SystemStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  rescues: {
    total: number;
    verified: number;
    pending: number;
    newThisMonth: number;
  };
  pets: {
    total: number;
    available: number;
    adopted: number;
    newThisMonth: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    newThisMonth: number;
  };
}

export class AdminService {
  /**
   * Get all users with filtering options
   */
  static async getUsers(filter: UserFilter = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${filter.search}%` } },
          { lastName: { [Op.iLike]: `%${filter.search}%` } },
          { email: { [Op.iLike]: `%${filter.search}%` } },
        ];
      }

      if (filter.createdAfter) {
        where.createdAt = { [Op.gte]: filter.createdAfter };
      }

      if (filter.createdBefore) {
        where.createdAt = { ...where.createdAt, [Op.lte]: filter.createdBefore };
      }

      const { rows: users, count } = await User.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            association: 'Roles',
            include: ['Permissions'],
          },
        ],
      });

      return {
        users,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            association: 'Roles',
            include: ['Permissions'],
          },
        ],
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId: string, status: UserStatus, adminId: string) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({ status });

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'USER_STATUS_UPDATED',
        tableName: 'users',
        recordId: userId,
        changes: { status },
      });

      logger.info(`User status updated: ${userId} to ${status} by admin: ${adminId}`);
      return user;
    } catch (error) {
      logger.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Suspend user account
   */
  static async suspendUser(userId: string, adminId: string, reason: string) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({
        status: UserStatus.SUSPENDED,
      });

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'USER_SUSPENDED',
        tableName: 'users',
        recordId: userId,
        changes: {
          status: UserStatus.SUSPENDED,
          reason,
        },
      });

      logger.info(`User suspended: ${userId} by admin: ${adminId}`);
      return user;
    } catch (error) {
      logger.error('Error suspending user:', error);
      throw error;
    }
  }

  /**
   * Unsuspend user account
   */
  static async unsuspendUser(userId: string, adminId: string) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({
        status: UserStatus.ACTIVE,
      });

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'USER_UNSUSPENDED',
        tableName: 'users',
        recordId: userId,
        changes: {
          status: UserStatus.ACTIVE,
        },
      });

      logger.info(`User unsuspended: ${userId} by admin: ${adminId}`);
      return user;
    } catch (error) {
      logger.error('Error unsuspending user:', error);
      throw error;
    }
  }

  /**
   * Delete user account (soft delete)
   */
  static async deleteUser(userId: string, adminId: string) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.destroy();

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'USER_DELETED',
        tableName: 'users',
        recordId: userId,
        changes: { deleted: true },
      });

      logger.info(`User deleted: ${userId} by admin: ${adminId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get all rescues with filtering options
   */
  static async getRescues(filter: RescueFilter = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (filter.verified !== undefined) {
        where.verifiedAt = filter.verified ? { [Op.ne]: null } : null;
      }

      if (filter.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filter.search}%` } },
          { email: { [Op.iLike]: `%${filter.search}%` } },
        ];
      }

      if (filter.createdAfter) {
        where.createdAt = { [Op.gte]: filter.createdAfter };
      }

      if (filter.createdBefore) {
        where.createdAt = { ...where.createdAt, [Op.lte]: filter.createdBefore };
      }

      const { rows: rescues, count } = await Rescue.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      return {
        rescues,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching rescues:', error);
      throw error;
    }
  }

  /**
   * Verify rescue organization
   */
  static async verifyRescue(rescueId: string, adminId: string, notes?: string) {
    try {
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      await rescue.update({
        verifiedAt: new Date(),
        verifiedBy: adminId,
      });

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'RESCUE_VERIFIED',
        tableName: 'rescues',
        recordId: rescueId,
        changes: { verified: true, notes },
      });

      logger.info(`Rescue verified: ${rescueId} by admin: ${adminId}`);
      return rescue;
    } catch (error) {
      logger.error('Error verifying rescue:', error);
      throw error;
    }
  }

  /**
   * Unverify rescue organization
   */
  static async unverifyRescue(rescueId: string, adminId: string, reason?: string) {
    try {
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      await rescue.update({
        verifiedAt: null,
        verifiedBy: null,
      });

      // Log the action
      await auditLogService.log({
        userId: adminId,
        action: 'RESCUE_UNVERIFIED',
        tableName: 'rescues',
        recordId: rescueId,
        changes: { verified: false, reason },
      });

      logger.info(`Rescue unverified: ${rescueId} by admin: ${adminId}`);
      return rescue;
    } catch (error) {
      logger.error('Error unverifying rescue:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  static async getSystemStatistics(): Promise<SystemStats> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // User statistics
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: UserStatus.ACTIVE } });
      const newUsersThisMonth = await User.count({
        where: { createdAt: { [Op.gte]: startOfMonth } },
      });

      // Rescue statistics
      const totalRescues = await Rescue.count();
      const verifiedRescues = await Rescue.count({ where: { verifiedAt: { [Op.ne]: null } } });
      const pendingRescues = await Rescue.count({ where: { verifiedAt: null } });
      const newRescuesThisMonth = await Rescue.count({
        where: { createdAt: { [Op.gte]: startOfMonth } },
      });

      // Pet statistics
      const totalPets = await Pet.count();
      const availablePets = await Pet.count({ where: { status: 'available' } });
      const adoptedPets = await Pet.count({ where: { status: 'adopted' } });
      const newPetsThisMonth = await Pet.count({
        where: { createdAt: { [Op.gte]: startOfMonth } },
      });

      // Application statistics
      const totalApplications = await Application.count();
      const pendingApplications = await Application.count({ where: { status: 'pending' } });
      const approvedApplications = await Application.count({ where: { status: 'approved' } });
      const newApplicationsThisMonth = await Application.count({
        where: { createdAt: { [Op.gte]: startOfMonth } },
      });

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
        },
        rescues: {
          total: totalRescues,
          verified: verifiedRescues,
          pending: pendingRescues,
          newThisMonth: newRescuesThisMonth,
        },
        pets: {
          total: totalPets,
          available: availablePets,
          adopted: adoptedPets,
          newThisMonth: newPetsThisMonth,
        },
        applications: {
          total: totalApplications,
          pending: pendingApplications,
          approved: approvedApplications,
          newThisMonth: newApplicationsThisMonth,
        },
      };
    } catch (error) {
      logger.error('Error fetching system statistics:', error);
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(page = 1, limit = 50, userId?: string, action?: string) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      const { rows: logs, count } = await AuditLog.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['firstName', 'lastName', 'email'],
          },
        ],
      });

      return {
        logs,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get pets with filtering options
   */
  static async getPets(filter: PetFilter = {}, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.species) {
        where.species = filter.species;
      }

      if (filter.breed) {
        where.breed = { [Op.iLike]: `%${filter.breed}%` };
      }

      if (filter.rescueId) {
        where.rescueId = filter.rescueId;
      }

      if (filter.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filter.search}%` } },
          { breed: { [Op.iLike]: `%${filter.search}%` } },
          { description: { [Op.iLike]: `%${filter.search}%` } },
        ];
      }

      const { rows: pets, count } = await Pet.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['name', 'email'],
          },
        ],
      });

      return {
        pets,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching pets:', error);
      throw error;
    }
  }

  /**
   * Get applications with filtering options
   */
  static async getApplications(page = 1, limit = 50, status?: string, rescueId?: string) {
    try {
      const offset = (page - 1) * limit;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (rescueId) {
        where.rescueId = rescueId;
      }

      const { rows: applications, count } = await Application.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['firstName', 'lastName', 'email'],
          },
          {
            model: Pet,
            as: 'Pet',
            attributes: ['name', 'species', 'breed'],
          },
          {
            model: Rescue,
            as: 'Rescue',
            attributes: ['name', 'email'],
          },
        ],
      });

      return {
        applications,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching applications:', error);
      throw error;
    }
  }
}

export default AdminService;
