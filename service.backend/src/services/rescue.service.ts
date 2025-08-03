import { Op, WhereOptions } from 'sequelize';
import { Application, Pet, Rescue, StaffMember, User } from '../models';
import { logger, loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

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

      // Check if user is already a staff member
      const existingStaff = await StaffMember.findOne({
        where: { rescueId, userId },
        transaction,
      });

      if (existingStaff) {
        throw new Error('User is already a staff member of this rescue');
      }

      const staffMember = await StaffMember.create(
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
        where: { rescueId, userId },
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
      await staffMember.destroy({ transaction });

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
        },
      });

      await transaction.commit();

      logger.info(`Removed staff member ${userId} from rescue ${rescueId}`);
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
              [Op.in]: [
                'submitted',
                'under_review',
                'pending_references',
                'reference_check',
                'interview_scheduled',
                'interview_completed',
                'home_visit_scheduled',
                'home_visit_completed',
              ],
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

      const whereConditions: any = { rescueId };

      if (search) {
        whereConditions[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (role) {
        whereConditions.role = role;
      }

      const { rows: staff, count: total } = await User.findAndCountAll({
        where: whereConditions,
        include: ['Roles'],
        order: [['firstName', 'ASC']],
        limit,
        offset,
      });

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
