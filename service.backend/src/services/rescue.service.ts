import { Op, WhereOptions } from 'sequelize';
import { Application, Pet, Rescue, StaffMember, User, Role, UserRole } from '../models';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';
import sequelize from '../sequelize';

export interface RescueSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'verified' | 'suspended' | 'inactive';
  location?: string;
  sortBy?: 'name' | 'createdAt' | 'verifiedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateRescueRequest {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registrationNumber?: string;
  contactPerson: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface UpdateRescueRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  description?: string;
  mission?: string;
  ein?: string;
  registrationNumber?: string;
  contactPerson?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  settings?: object;
}

export interface RescueStatsResponse {
  totalPets: number;
  availablePets: number;
  adoptedPets: number;
  pendingApplications: number;
  totalApplications: number;
  staffCount: number;
  activeListings: number;
  monthlyAdoptions: number;
  averageTimeToAdoption: number;
}

export class RescueService {
  /**
   * Search and filter rescues with pagination
   */
  static async searchRescues(options: RescueSearchOptions = {}): Promise<{
    rescues: Rescue[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const startTime = Date.now();

    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        location,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = options;

      const offset = (page - 1) * limit;
      let whereClause: WhereOptions = {};

      // Status filter (applied first)
      if (status) {
        whereClause.status = status;
      }

      // Text search across multiple fields (applied after status)
      if (search) {
        whereClause = {
          ...whereClause,
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } },
            { description: { [Op.iLike]: `%${search}%` } },
          ],
        };
      }

      // Location filter (applied after search to avoid conflicts)
      if (location && !search) {
        whereClause = {
          ...whereClause,
          [Op.or]: [
            { city: { [Op.iLike]: `%${location}%` } },
            { state: { [Op.iLike]: `%${location}%` } },
            { country: { [Op.iLike]: `%${location}%` } },
          ],
        };
      } else if (location && search) {
        // Combine search and location with AND
        whereClause = {
          [Op.and]: [
            whereClause,
            {
              [Op.or]: [
                { city: { [Op.iLike]: `%${location}%` } },
                { state: { [Op.iLike]: `%${location}%` } },
                { country: { [Op.iLike]: `%${location}%` } },
              ],
            },
          ],
        };
      }

      // Sort configuration
      const orderClause = [];
      if (sortBy === 'name') {
        orderClause.push(['name', sortOrder]);
      } else if (sortBy === 'verifiedAt') {
        orderClause.push(['verifiedAt', sortOrder]);
      } else {
        orderClause.push(['createdAt', sortOrder]);
      }

      const { count, rows: rescues } = await Rescue.findAndCountAll({
        where: whereClause,
        order: orderClause as any,
        limit,
        offset,
        include: [
          {
            model: StaffMember,
            as: 'staff',
            required: false,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'firstName', 'lastName', 'email'],
              },
            ],
          },
        ],
      });

      loggerHelpers.logPerformance('Rescue Search', {
        duration: Date.now() - startTime,
        filters: Object.keys(options),
        resultCount: rescues.length,
        total: count,
        page,
        limit,
      });

      return {
        rescues: rescues.map(rescue => rescue.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching rescues:', error);
      throw new Error('Failed to search rescues');
    }
  }

  /**
   * Get rescue by ID with full details
   */
  static async getRescueById(rescueId: string, includeStats = false): Promise<Rescue | null> {
    const startTime = Date.now();

    try {
      const rescue = await Rescue.findByPk(rescueId, {
        include: [
          {
            model: StaffMember,
            as: 'staff',
            required: false,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['userId', 'firstName', 'lastName', 'email', 'userType'],
              },
            ],
          },
        ],
      });

      loggerHelpers.logDatabase('READ', {
        rescueId,
        duration: Date.now() - startTime,
        found: !!rescue,
      });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      const rescueData = rescue.toJSON();

      // Include statistics if requested
      if (includeStats) {
        const stats = await this.getRescueStatistics(rescueId);
        return { ...rescueData, statistics: stats } as any;
      }

      return rescueData as any;
    } catch (error) {
      logger.error('Error getting rescue by ID:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error && error.message === 'Rescue not found') {
        throw error;
      }
      throw new Error('Failed to retrieve rescue');
    }
  }

  /**
   * Create new rescue organization
   */
  static async createRescue(rescueData: CreateRescueRequest, createdBy: string): Promise<Rescue> {
    const startTime = Date.now();

    const transaction = await Rescue.sequelize!.transaction();

    try {
      // Check if rescue with same email already exists
      const existingRescue = await Rescue.findOne({
        where: { email: rescueData.email },
        transaction,
      });

      if (existingRescue) {
        throw new Error('A rescue organization with this email already exists');
      }

      // Create the rescue
      const rescue = await Rescue.create(
        {
          ...rescueData,
          status: 'pending',
          isDeleted: false,
        },
        { transaction }
      );

      // Log the action
      await AuditLogService.log({
        userId: createdBy,
        action: 'create',
        entity: 'rescue',
        entityId: rescue.rescueId,
        details: {
          rescueId: rescue.rescueId,
          name: rescue.name,
          email: rescue.email,
        },
      });

      loggerHelpers.logBusiness(
        'Rescue Created',
        {
          rescueId: rescue.rescueId,
          name: rescue.name,
          createdBy,
          duration: Date.now() - startTime,
        },
        createdBy
      );

      await transaction.commit();

      logger.info(`Created new rescue: ${rescue.rescueId}`);
      return rescue.toJSON() as any;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueData: JSON.parse(JSON.stringify(rescueData)),
        createdBy,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create rescue');
    }
  }

  /**
   * Update rescue information
   */
  static async updateRescue(
    rescueId: string,
    updateData: UpdateRescueRequest,
    updatedBy: string
  ): Promise<any> {
    const startTime = Date.now();

    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== rescue.email) {
        const existingRescue = await Rescue.findOne({
          where: {
            email: updateData.email,
            rescueId: { [Op.ne]: rescueId },
          },
          transaction,
        });

        if (existingRescue) {
          throw new Error('A rescue organization with this email already exists');
        }
      }

      const oldData = rescue.toJSON();
      await rescue.update(updateData, { transaction });

      // Log the action
      await AuditLogService.log({
        userId: updatedBy,
        action: 'update',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          changes: JSON.parse(JSON.stringify(updateData)),
          oldData: {
            name: oldData.name,
            email: oldData.email,
            status: oldData.status,
          },
        },
      });

      loggerHelpers.logBusiness(
        'Rescue Updated',
        {
          rescueId,
          updatedFields: Object.keys(updateData),
          updatedBy,
          duration: Date.now() - startTime,
        },
        updatedBy
      );

      await transaction.commit();

      logger.info(`Updated rescue: ${rescueId}`);
      return rescue.toJSON();
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update rescue');
    }
  }

  /**
   * Verify a rescue organization
   */
  static async verifyRescue(rescueId: string, verifiedBy: string, notes?: string): Promise<Rescue> {
    const startTime = Date.now();

    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      if (rescue.status === 'verified') {
        throw new Error('Rescue is already verified');
      }

      await rescue.update(
        {
          status: 'verified',
          verifiedAt: new Date(),
          verifiedBy,
        },
        { transaction }
      );

      // Log the action
      await AuditLogService.log({
        userId: verifiedBy,
        action: 'verify',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          name: rescue.name,
          verificationNotes: notes || null,
        },
      });

      loggerHelpers.logBusiness(
        'Rescue Verified',
        {
          rescueId,
          verifiedBy,
          duration: Date.now() - startTime,
        },
        verifiedBy
      );

      await transaction.commit();

      logger.info(`Verified rescue: ${rescueId}`);
      return rescue.toJSON() as any;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error verifying rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        verifiedBy,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to verify rescue');
    }
  }

  /**
   * Add staff member to rescue
   */
  static async addStaffMember(
    rescueId: string,
    userId: string,
    title: string | undefined,
    addedBy: string
  ): Promise<any> {
    logger.info(`addStaffMember called with: rescueId=${rescueId}, userId=${userId}, title=${title}, addedBy=${addedBy}`);
    
    const transaction = await Rescue.sequelize!.transaction();

    try {
      // Verify rescue exists
      const rescue = await Rescue.findByPk(rescueId, { transaction });
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      // Verify user exists
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already an active staff member
      const existingActiveStaff = await StaffMember.findOne({
        where: { rescueId, userId, isDeleted: false },
        transaction,
      });

      if (existingActiveStaff) {
        throw new Error('User is already a staff member of this rescue');
      }

      // Check if user was previously a staff member (soft deleted)
      const existingSoftDeletedStaff = await StaffMember.findOne({
        where: { rescueId, userId, isDeleted: true },
        transaction,
      });

      let staffMember;
      if (existingSoftDeletedStaff) {
        // Restore the soft-deleted staff member
        // Preserve verification status if they were previously verified
        const wasVerified = existingSoftDeletedStaff.isVerified;
        
        await existingSoftDeletedStaff.update({
          title,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          addedBy,
          addedAt: new Date(),
          isVerified: wasVerified, // Keep previous verification status
        }, { transaction });
        
        staffMember = existingSoftDeletedStaff;
        logger.info(`Restored soft-deleted staff member ${userId} in rescue ${rescueId} (verified: ${wasVerified})`);
      } else {
        // Create new staff member
        staffMember = await StaffMember.create(
          {
            rescueId,
            userId,
            title,
            addedBy,
            isVerified: false,
            isDeleted: false,
            addedAt: new Date(),
          },
          { transaction }
        );
        
        logger.info(`Created new staff member ${userId} in rescue ${rescueId}`);
      }

      // Ensure user has rescue_staff role (only assign if they don't have it)
      const rescueStaffRole = await Role.findOne({ 
        where: { name: 'rescue_staff' },
        transaction 
      });

      if (rescueStaffRole) {
        const existingUserRole = await UserRole.findOne({
          where: { 
            userId: userId, 
            roleId: rescueStaffRole.roleId 
          },
          transaction
        });

        if (!existingUserRole) {
          await UserRole.create({
            userId: userId,
            roleId: rescueStaffRole.roleId
          }, { transaction });

          logger.info(`Assigned rescue_staff role to user ${userId}`);
        } else {
          logger.info(`User ${userId} already has rescue_staff role`);
        }
      } else {
        logger.warn('rescue_staff role not found in database');
      }

      // Log the action
      await AuditLogService.log({
        userId: addedBy,
        action: 'addStaff',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          staffUserId: userId,
          title: title || null,
          staffName: `${user.firstName} ${user.lastName}`,
          roleAssigned: rescueStaffRole ? 'rescue_staff' : 'none',
        },
      });

      await transaction.commit();

      logger.info(`Added staff member ${userId} to rescue ${rescueId}`);
      return staffMember.toJSON();
    } catch (error) {
      await transaction.rollback();
      logger.error('Error adding staff member:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add staff member');
    }
  }

  /**
   * Remove staff member from rescue
   */
  static async removeStaffMember(rescueId: string, userId: string, removedBy: string) {
    const transaction = await Rescue.sequelize!.transaction();

    try {
      const staffMember = await StaffMember.findOne({
        where: { rescueId, userId, isDeleted: false },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['firstName', 'lastName'],
          },
        ],
        transaction,
      });

      if (!staffMember) {
        throw new Error('Staff member not found');
      }

      const user = staffMember.user!;
      
      // Soft delete the staff member instead of hard delete
      await staffMember.update({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: removedBy
      }, { transaction });

      // Keep the user's rescue_staff role intact
      // This allows them to be re-added easily and maintains their capability level
      // Roles represent what they CAN do, not what they ARE currently doing

      // Log the action
      await AuditLogService.log({
        userId: removedBy,
        action: 'removeStaff',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          removedUserId: userId,
          staffName: `${user.firstName} ${user.lastName}`,
          method: 'soft_delete',
        },
      });

      await transaction.commit();

      logger.info(`Soft deleted staff member ${userId} from rescue ${rescueId}`);
      return { success: true, message: 'Staff member removed successfully' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error removing staff member:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to remove staff member');
    }
  }

  /**
   * Update staff member in rescue
   */
  static async updateStaffMember(
    rescueId: string, 
    userId: string, 
    updates: { title?: string }, 
    updatedBy: string
  ): Promise<any> {
    const transaction = await sequelize.transaction();

    try {
      // Verify rescue exists
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      // Find the staff member
      const staffMember = await StaffMember.findOne({
        where: { rescueId, userId },
        include: [{ model: User, as: 'user' }],
      });

      if (!staffMember) {
        throw new Error('Staff member not found');
      }

      // Update the staff member
      await staffMember.update(updates, { transaction });

      // Log the action
      await AuditLogService.log({
        userId: updatedBy,
        action: 'updateStaff',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          updatedUserId: userId,
          staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`,
          updates,
        },
      });

      await transaction.commit();

      logger.info(`Updated staff member ${userId} in rescue ${rescueId}`);
      return staffMember.toJSON();
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating staff member:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update staff member');
    }
  }

  /**
   * Get rescue statistics and analytics
   */
  static async getRescueStatistics(rescueId: string): Promise<RescueStatsResponse> {
    const startTime = Date.now();

    try {
      // Get pet statistics
      const [totalPets, availablePets, adoptedPets] = await Promise.all([
        Pet.count({ where: { rescue_id: rescueId } }),
        Pet.count({ where: { rescue_id: rescueId, status: 'available' } }),
        Pet.count({ where: { rescue_id: rescueId, status: 'adopted' } }),
      ]);

      // Get application statistics
      const [totalApplications, pendingApplications] = await Promise.all([
        Application.count({
          include: [{ model: Pet, as: 'Pet', where: { rescue_id: rescueId } }],
        }),
        Application.count({
          where: {
            status: {
              [Op.in]: ['submitted'],
            },
          },
          include: [{ model: Pet, as: 'Pet', where: { rescue_id: rescueId } }],
        }),
      ]);

      // Get staff count
      const staffCount = await StaffMember.count({ where: { rescueId } });

      // Get monthly adoptions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyAdoptions = await Pet.count({
        where: {
          rescue_id: rescueId,
          status: 'adopted',
          updated_at: { [Op.gte]: thirtyDaysAgo },
        },
      });

      // Calculate average time to adoption (simplified)
      const recentAdoptions = await Pet.findAll({
        where: {
          rescue_id: rescueId,
          status: 'adopted',
          adopted_date: { [Op.ne]: null },
        },
        attributes: ['created_at', 'adopted_date'],
        limit: 50,
        order: [['adopted_date', 'DESC']],
      });

      let averageTimeToAdoption = 0;
      if (recentAdoptions.length > 0) {
        const totalDays = recentAdoptions.reduce((sum, pet) => {
          const createdAt = new Date(pet.created_at);
          const adoptedAt = new Date(pet.adopted_date!);
          const diffTime = Math.abs(adoptedAt.getTime() - createdAt.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return sum + diffDays;
        }, 0);
        averageTimeToAdoption = Math.round(totalDays / recentAdoptions.length);
      }

      loggerHelpers.logPerformance('Rescue Statistics', {
        duration: Date.now() - startTime,
        rescueId,
        totalPets,
        totalApplications,
      });

      return {
        totalPets: totalPets as unknown as number,
        availablePets: availablePets as unknown as number,
        adoptedPets: adoptedPets as unknown as number,
        pendingApplications,
        totalApplications,
        staffCount,
        activeListings: availablePets as unknown as number,
        monthlyAdoptions: monthlyAdoptions as unknown as number,
        averageTimeToAdoption,
      };
    } catch (error) {
      logger.error('Error getting rescue statistics:', error);
      throw new Error('Failed to retrieve rescue statistics');
    }
  }

  /**
   * Get rescue pets with pagination
   */
  static async getRescuePets(
    rescueId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'DESC' } = options;
      const offset = (page - 1) * limit;

      const whereClause: any = { rescue_id: rescueId };
      if (status) {
        whereClause.status = status;
      }

      const orderClause =
        sortBy === 'createdAt' ? [['created_at', sortOrder]] : [[sortBy, sortOrder]];

      const { count, rows: pets } = await Pet.findAndCountAll({
        where: whereClause,
        order: orderClause as any,
        limit,
        offset,
      });

      return {
        pets: pets.map(pet => pet.toJSON()),
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting rescue pets:', error);
      throw new Error('Failed to retrieve rescue pets');
    }
  }

  /**
   * Soft delete rescue (admin only)
   */
  static async deleteRescue(rescueId: string, deletedBy: string, reason?: string) {
    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      if (rescue.isDeleted) {
        throw new Error('Rescue organization is already deleted');
      }

      // Soft delete by updating status
      await rescue.update(
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
        { transaction }
      );

      // Log the action
      await AuditLogService.log({
        userId: deletedBy,
        action: 'delete',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          name: rescue.name,
          reason: reason || null,
        },
      });

      await transaction.commit();

      logger.info(`Soft deleted rescue: ${rescueId}`);
      return { success: true, message: 'Rescue deleted successfully' };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting rescue:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete rescue');
    }
  }

  /**
   * Get rescue staff members
   */
  static async getRescueStaff(
    rescueId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    } = {}
  ) {
    try {
      const rescue = await Rescue.findByPk(rescueId);
      if (!rescue) {
        throw new Error('Rescue not found');
      }

      const { page = 1, limit = 20, search, role } = options;
      const offset = (page - 1) * limit;

      const whereConditions: any = { 
        rescueId,
        isDeleted: false // Only get active staff members
      };

      // Build user search conditions for the included User model
      const userWhereConditions: any = {};
      if (search) {
        userWhereConditions[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: staffMembers, count: total } = await StaffMember.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'user',
            where: Object.keys(userWhereConditions).length > 0 ? userWhereConditions : undefined,
            attributes: ['userId', 'firstName', 'lastName', 'email', 'userType'],
          }
        ],
        order: [['addedAt', 'DESC']],
        limit,
        offset,
      });

      // Transform to the expected format
      const staff = staffMembers.map(staffMember => ({
        id: staffMember.staffMemberId,
        userId: staffMember.userId,
        rescueId: staffMember.rescueId,
        firstName: staffMember.user?.firstName || 'Unknown',
        lastName: staffMember.user?.lastName || 'User',
        email: staffMember.user?.email || '',
        title: staffMember.title || 'Staff Member',
        isVerified: staffMember.isVerified,
        addedAt: staffMember.addedAt,
      }));

      return {
        staff,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting rescue staff:', error);
      throw error;
    }
  }
}
