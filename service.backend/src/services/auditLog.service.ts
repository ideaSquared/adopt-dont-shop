import { Op, WhereOptions } from 'sequelize';
import { AuditLog } from '../models/AuditLog';
import User from '../models/User';
import { JsonObject } from '../types/common';
import { logger } from '../utils/logger';

export enum AuditLogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNSUSPENDED = 'USER_UNSUSPENDED',
  RESCUE_VERIFIED = 'RESCUE_VERIFIED',
  RESCUE_VERIFICATION_REJECTED = 'RESCUE_VERIFICATION_REJECTED',
  // Add other actions as needed
}

export interface AuditLogData {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: JsonObject;
  ipAddress?: string;
  userAgent?: string;
  service?: string;
  level?: 'INFO' | 'WARNING' | 'ERROR';
  status?: 'success' | 'failure';
}

export class AuditLogService {
  /**
   * Log an action to the audit log
   */
  static async log(data: AuditLogData): Promise<AuditLog> {
    try {
      const auditLog = await AuditLog.create({
        service: data.service || 'adopt-dont-shop-backend',
        user: data.userId,
        action: data.action,
        level: data.level || 'INFO',
        status: data.status,
        timestamp: new Date(),
        metadata: {
          entity: data.entity,
          entityId: data.entityId,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
        category: data.entity || 'GENERAL',
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
      });

      logger.info(`Audit log created: ${data.action} on ${data.entity} by ${data.userId}`);
      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Alias for log method for backward compatibility
   */
  static async logAction(data: AuditLogData): Promise<AuditLog> {
    return this.log(data);
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(
    whereConditions: WhereOptions,
    options: {
      limit?: number;
      offset?: number;
      order?: Array<[string, 'ASC' | 'DESC']>;
    }
  ) {
    try {
      const { rows: logs, count: total } = await AuditLog.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'userDetails',
            attributes: ['userId', 'firstName', 'lastName', 'email', 'userType'],
          },
        ],
        ...options,
      });

      return { rows: logs, count: total };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get logs by user
   */
  static async getLogsByUser(userId: string, limit = 50, offset = 0) {
    return this.getLogs({ userId }, { limit, offset, order: [['timestamp', 'DESC']] });
  }

  /**
   * Get logs by entity
   */
  static async getLogsByEntity(entity: string, entityId: string, limit = 50, offset = 0) {
    return this.getLogs({ entity, entityId }, { limit, offset, order: [['timestamp', 'DESC']] });
  }

  /**
   * Clean up old logs (data retention)
   */
  static async cleanupOldLogs(daysToKeep = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await AuditLog.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${deletedCount} old audit logs`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      throw error;
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        userId,
        entity,
        entityId,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = filters;

      const whereClause: WhereOptions = {};

      if (userId) {
        whereClause.user = userId; // Model uses 'user' field, not 'userId'
      }
      if (entity) {
        whereClause.category = entity; // Model uses 'category' field for entity
      }
      if (entityId) {
        // entityId is stored in metadata, needs special handling
        whereClause['metadata.entityId'] = entityId;
      }
      if (action) {
        whereClause.action = action;
      }

      if (startDate && endDate) {
        whereClause.timestamp = {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        };
      } else if (startDate) {
        whereClause.timestamp = { [Op.gte]: startDate };
      } else if (endDate) {
        whereClause.timestamp = { [Op.lte]: endDate };
      }

      const offset = (page - 1) * limit;

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit,
        offset,
      });

      const totalPages = Math.ceil(count / limit);

      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: count,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Error retrieving audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }
}

export default new AuditLogService();
