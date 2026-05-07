import { Op, Order, WhereOptions } from 'sequelize';
import EmailService from './email.service';
import { EmailType, EmailPriority } from '../models/EmailQueue';
import { Application, Pet, Rescue, StaffMember, User, Role, UserRole } from '../models';
import { logger, loggerHelpers } from '../utils/logger';
import { invalidateAuthCache } from '../lib/auth-cache';
import { AuditLogService } from './auditLog.service';
import { validateSortField } from '../utils/sort-validation';
import { verifyCompaniesHouseNumber } from './companies-house.service';
import { verifyCharityRegistrationNumber } from './charity-commission.service';

const RESCUE_PET_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
import sequelize from '../sequelize';
import { AdoptionPolicy } from '../types/rescue';

export type BulkRescueAction = 'approve' | 'suspend' | 'verify';

export type BulkRescueResult = {
  successCount: number;
  failedCount: number;
  errors: Array<{ rescueId: string; error: string }>;
};

export interface RescueSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'verified' | 'suspended' | 'inactive' | 'rejected';
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
  county: string;
  postcode: string;
  country: string;
  website?: string;
  description?: string;
  mission?: string;
  companiesHouseNumber?: string;
  charityRegistrationNumber?: string;
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
  county?: string;
  postcode?: string;
  country?: string;
  website?: string;
  description?: string;
  mission?: string;
  companiesHouseNumber?: string;
  charityRegistrationNumber?: string;
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

export type RescueWithStatistics = ReturnType<Rescue['toJSON']> & {
  statistics: RescueStatsResponse;
};

// ADS-373: `searchRescues` maps each row through `toJSON()` before
// returning, so the array contains plain objects — Sequelize-instance
// methods (`.update()`, association accessors) are not present.
// Mirrors the pattern already used by `getRescueById` and
// `RescueWithStatistics`.
export type RescuePlain = ReturnType<Rescue['toJSON']>;

export class RescueService {
  /**
   * Search and filter rescues with pagination
   */
  static async searchRescues(options: RescueSearchOptions = {}): Promise<{
    rescues: RescuePlain[];
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
            { county: { [Op.iLike]: `%${location}%` } },
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
                { county: { [Op.iLike]: `%${location}%` } },
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
        order: orderClause as Order,
        limit,
        offset,
        distinct: true,
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
   * Get rescue by ID with full details.
   *
   * When `includeStats` is true the return is a plain object (rescue
   * attributes + statistics) rather than a Sequelize model instance — this
   * avoids mutating the model with a non-column property and keeps the
   * return type honest without any `as any` cast.
   */
  static async getRescueById(rescueId: string): Promise<Rescue>;
  static async getRescueById(rescueId: string, includeStats: false): Promise<Rescue>;
  static async getRescueById(rescueId: string, includeStats: true): Promise<RescueWithStatistics>;
  static async getRescueById(
    rescueId: string,
    includeStats?: boolean
  ): Promise<Rescue | RescueWithStatistics>;
  static async getRescueById(
    rescueId: string,
    includeStats = false
  ): Promise<Rescue | RescueWithStatistics> {
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

      if (includeStats) {
        const statistics = await this.getRescueStatistics(rescueId);
        return { ...rescue.toJSON(), statistics };
      }

      return rescue;
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

    // Phase 1: persist the rescue inside a transaction. Duplicate-checks plus
    // the create-in-pending-state. External verification HTTP is deliberately
    // NOT called here — it would hold a DB connection during arbitrary network
    // I/O and exhaust the pool under load. See ADS-365.
    const transaction = await Rescue.sequelize!.transaction();

    let rescue: Rescue;
    try {
      // Check for duplicate email
      const existingByEmail = await Rescue.findOne({
        where: { email: rescueData.email },
        transaction,
      });
      if (existingByEmail) {
        throw new Error('A rescue organization with this email already exists');
      }

      // Check for duplicate registration numbers
      if (rescueData.companiesHouseNumber) {
        const existingByCH = await Rescue.findOne({
          where: { companiesHouseNumber: rescueData.companiesHouseNumber },
          transaction,
        });
        if (existingByCH) {
          throw new Error('A rescue is already registered with this Companies House number');
        }
      }
      if (rescueData.charityRegistrationNumber) {
        const existingByCharity = await Rescue.findOne({
          where: { charityRegistrationNumber: rescueData.charityRegistrationNumber },
          transaction,
        });
        if (existingByCharity) {
          throw new Error('A rescue is already registered with this charity registration number');
        }
      }

      // Create the rescue in pending state — verification runs after commit.
      rescue = await Rescue.create(
        {
          ...rescueData,
          status: 'pending',
        },
        { transaction }
      );

      await transaction.commit();
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

    // Phase 2: verification runs AFTER commit, so the upstream API latency
    // never holds a DB connection. The rescue already exists in the database
    // with status='pending'; this update transitions it to verified or
    // routes it to manual review. If anything in this phase fails, the
    // rescue is still safely created and an admin can re-run verification.
    let verificationUpdate: Awaited<ReturnType<typeof RescueService.attemptExternalVerification>> =
      {};
    try {
      verificationUpdate = await RescueService.attemptExternalVerification(
        rescue.rescueId,
        rescueData.companiesHouseNumber,
        rescueData.charityRegistrationNumber
      );

      if (Object.keys(verificationUpdate).length > 0) {
        await rescue.update(verificationUpdate);
      }
    } catch (err) {
      logger.error('External verification step failed (rescue already created)', {
        err,
        rescueId: rescue.rescueId,
      });
      // Don't throw — the rescue exists in pending state and can be
      // verified manually by an admin.
    }

    try {
      await AuditLogService.log({
        userId: createdBy,
        action: 'create',
        entity: 'rescue',
        entityId: rescue.rescueId,
        details: {
          rescueId: rescue.rescueId,
          name: rescue.name,
          email: rescue.email,
          verificationStatus: verificationUpdate.status ?? 'pending',
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log for rescue create', {
        err,
        rescueId: rescue.rescueId,
      });
    }

    loggerHelpers.logBusiness(
      'Rescue Created',
      {
        rescueId: rescue.rescueId,
        name: rescue.name,
        createdBy,
        verificationStatus: verificationUpdate.status ?? 'pending',
        duration: Date.now() - startTime,
      },
      createdBy
    );

    if (verificationUpdate.manualVerificationRequestedAt) {
      await RescueService.sendManualVerificationEmail(rescue.name, rescue.email).catch(err =>
        logger.error('Failed to send manual verification email', {
          err,
          rescueId: rescue.rescueId,
        })
      );
    }

    logger.info(`Created new rescue: ${rescue.rescueId}`);
    return rescue;
  }

  /**
   * Update rescue information
   */
  static async updateRescue(
    rescueId: string,
    updateData: UpdateRescueRequest,
    updatedBy: string
  ): Promise<ReturnType<typeof Rescue.prototype.toJSON>> {
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
  static async verifyRescue(
    rescueId: string,
    verifiedBy: string,
    notes?: string,
    verificationSource: 'companies_house' | 'charity_commission' | 'manual' = 'manual',
    /**
     * Operator intent verb recorded in the audit log. Defaults to `'verify'`.
     * `bulkUpdateRescues` passes the caller's original action ('approve' or
     * 'verify') so audit entries preserve the chosen verb — see ADS-378.
     */
    auditAction: 'verify' | 'approve' = 'verify'
  ): Promise<Rescue> {
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
          verificationSource,
          verificationFailureReason: null,
          manualVerificationRequestedAt: null,
        },
        { transaction }
      );

      // Log the action — `auditAction` lets bulk callers preserve their
      // original verb ('approve' vs 'verify') rather than collapsing them.
      await AuditLogService.log({
        userId: verifiedBy,
        action: auditAction,
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
      return rescue;
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
   * Reject a rescue organization
   */
  static async rejectRescue(
    rescueId: string,
    rejectedBy: string,
    reason?: string,
    notes?: string
  ): Promise<Rescue> {
    const startTime = Date.now();

    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      if (rescue.status === 'verified') {
        throw new Error('Cannot reject an already verified rescue');
      }

      if (rescue.status === 'rejected') {
        throw new Error('Rescue is already rejected');
      }

      await rescue.update(
        {
          status: 'rejected',
          verificationFailureReason: reason ?? null,
        },
        { transaction }
      );

      // Log the action
      await AuditLogService.log({
        userId: rejectedBy,
        action: 'reject',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          name: rescue.name,
          rejectionReason: reason || null,
          rejectionNotes: notes || null,
        },
      });

      loggerHelpers.logBusiness(
        'Rescue Rejected',
        {
          rescueId,
          rejectedBy,
          reason: reason || 'No reason provided',
          duration: Date.now() - startTime,
        },
        rejectedBy
      );

      await transaction.commit();

      logger.info(`Rejected rescue: ${rescueId}`);
      return rescue;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error rejecting rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        rejectedBy,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to reject rescue');
    }
  }

  /**
   * Suspend a rescue organisation
   */
  static async suspendRescue(
    rescueId: string,
    suspendedBy: string,
    reason?: string
  ): Promise<Rescue> {
    const startTime = Date.now();
    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      if (rescue.status === 'suspended') {
        throw new Error('Rescue is already suspended');
      }

      await rescue.update({ status: 'suspended' }, { transaction });

      await AuditLogService.log({
        userId: suspendedBy,
        action: 'suspend',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          name: rescue.name,
          reason: reason ?? null,
        },
      });

      loggerHelpers.logBusiness(
        'Rescue Suspended',
        {
          rescueId,
          suspendedBy,
          reason: reason ?? 'No reason provided',
          duration: Date.now() - startTime,
        },
        suspendedBy
      );

      await transaction.commit();

      logger.info(`Suspended rescue: ${rescueId}`);
      return rescue;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error suspending rescue:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        suspendedBy,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to suspend rescue');
    }
  }

  /**
   * Attempt external verification via Companies House or Charity Commission.
   * Returns a partial Rescue update object — empty if no registration numbers supplied.
   */
  private static async attemptExternalVerification(
    rescueId: string,
    companiesHouseNumber?: string,
    charityRegistrationNumber?: string
  ): Promise<
    Partial<{
      status: 'verified' | 'pending';
      verifiedAt: Date;
      verificationSource: 'companies_house' | 'charity_commission';
      verificationFailureReason: string;
      manualVerificationRequestedAt: Date;
    }>
  > {
    if (companiesHouseNumber) {
      const result = await verifyCompaniesHouseNumber(companiesHouseNumber);
      if (result.verified) {
        logger.info('Rescue auto-verified via Companies House', { rescueId });
        return {
          status: 'verified',
          verifiedAt: new Date(),
          verificationSource: 'companies_house',
        };
      }
      logger.info('Companies House verification failed', { rescueId, reason: result.reason });
      return {
        verificationFailureReason: result.reason,
        manualVerificationRequestedAt: new Date(),
      };
    }

    if (charityRegistrationNumber) {
      const result = await verifyCharityRegistrationNumber(charityRegistrationNumber);
      if (result.verified) {
        logger.info('Rescue auto-verified via Charity Commission', { rescueId });
        return {
          status: 'verified',
          verifiedAt: new Date(),
          verificationSource: 'charity_commission',
        };
      }
      logger.info('Charity Commission verification failed', { rescueId, reason: result.reason });
      return {
        verificationFailureReason: result.reason,
        manualVerificationRequestedAt: new Date(),
      };
    }

    // No registration number provided — route straight to manual review
    return { manualVerificationRequestedAt: new Date() };
  }

  /**
   * Send the manual verification fallback email to a rescue.
   */
  private static async sendManualVerificationEmail(
    rescueName: string,
    rescueEmail: string
  ): Promise<void> {
    await EmailService.sendEmail({
      toEmail: rescueEmail,
      toName: rescueName,
      subject: 'Your rescue registration — next steps for verification',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4C6EF5; color: white; padding: 20px; text-align: center;">
            <h1>Verification Required</h1>
          </div>
          <div style="padding: 30px;">
            <p>Hello ${rescueName},</p>
            <p>Thank you for registering with Adopt Don't Shop. We were unable to automatically verify
            your organisation using the registration number provided.</p>
            <p>To complete verification and receive your <strong>Verified Rescue</strong> badge, please
            email us at <a href="mailto:verify@adoptdontshop.app">verify@adoptdontshop.app</a> with:</p>
            <ul>
              <li>Your organisation name and registration number</li>
              <li>A brief description of your rescue activities</li>
              <li>Any supporting documents (charity certificate, Companies House filing, etc.)</li>
            </ul>
            <p>We aim to review manual verifications within 3–5 working days.</p>
            <p>The Adopt Don't Shop Team</p>
          </div>
        </div>
      `,
      type: EmailType.TRANSACTIONAL,
      priority: EmailPriority.NORMAL,
    });
  }

  /**
   * Add staff member to rescue
   */
  static async addStaffMember(
    rescueId: string,
    userId: string,
    title: string | undefined,
    addedBy: string
  ): Promise<ReturnType<typeof StaffMember.prototype.toJSON>> {
    logger.info(
      `addStaffMember called with: rescueId=${rescueId}, userId=${userId}, title=${title}, addedBy=${addedBy}`
    );

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

      // Check if user is already an active staff member. paranoid scope
      // hides soft-deleted rows by default.
      const existingActiveStaff = await StaffMember.findOne({
        where: { rescueId, userId },
        transaction,
      });

      if (existingActiveStaff) {
        throw new Error('User is already a staff member of this rescue');
      }

      // Check if user was previously a staff member (soft deleted) — opt
      // in to including paranoid rows.
      const existingSoftDeletedStaff = await StaffMember.findOne({
        where: { rescueId, userId },
        paranoid: false,
        transaction,
      });

      let staffMember;
      if (existingSoftDeletedStaff && existingSoftDeletedStaff.deletedAt) {
        // Restore the soft-deleted staff member, preserving verification.
        const wasVerified = existingSoftDeletedStaff.isVerified;

        await existingSoftDeletedStaff.restore({ transaction });
        await existingSoftDeletedStaff.update(
          {
            title,
            addedBy,
            addedAt: new Date(),
            isVerified: wasVerified,
          },
          { transaction }
        );

        staffMember = existingSoftDeletedStaff;
        logger.info(
          `Restored soft-deleted staff member ${userId} in rescue ${rescueId} (verified: ${wasVerified})`
        );
      } else {
        // Create new staff member
        staffMember = await StaffMember.create(
          {
            rescueId,
            userId,
            title,
            addedBy,
            isVerified: false,
            addedAt: new Date(),
          },
          { transaction }
        );

        logger.info(`Created new staff member ${userId} in rescue ${rescueId}`);
      }

      // Ensure user has rescue_staff role (only assign if they don't have it)
      const rescueStaffRole = await Role.findOne({
        where: { name: 'rescue_staff' },
        transaction,
      });

      if (rescueStaffRole) {
        const existingUserRole = await UserRole.findOne({
          where: {
            userId: userId,
            roleId: rescueStaffRole.roleId,
          },
          transaction,
        });

        if (!existingUserRole) {
          await UserRole.create(
            {
              userId: userId,
              roleId: rescueStaffRole.roleId,
            },
            { transaction }
          );
          // ADS-253: bust the auth cache so the new role takes effect on
          // the next request without waiting for the TTL.
          invalidateAuthCache(userId);

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

      // paranoid soft-delete; the audit log captures who removed.
      await staffMember.destroy({ transaction });

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
  ): Promise<ReturnType<typeof StaffMember.prototype.toJSON>> {
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
        Pet.count({ where: { rescueId } }),
        Pet.count({ where: { rescueId, status: 'available' } }),
        Pet.count({ where: { rescueId, status: 'adopted' } }),
      ]);

      // Get application statistics
      const [totalApplications, pendingApplications] = await Promise.all([
        Application.count({
          include: [{ model: Pet, as: 'Pet', where: { rescueId } }],
        }),
        Application.count({
          where: {
            status: {
              [Op.in]: ['submitted'],
            },
          },
          include: [{ model: Pet, as: 'Pet', where: { rescueId } }],
        }),
      ]);

      // Get staff count
      const staffCount = await StaffMember.count({ where: { rescueId } });

      // Get monthly adoptions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const monthlyAdoptions = await Pet.count({
        where: {
          rescueId,
          status: 'adopted',
          updatedAt: { [Op.gte]: thirtyDaysAgo },
        },
      });

      // Calculate average time to adoption (simplified)
      const recentAdoptions = await Pet.findAll({
        where: {
          rescueId,
          status: 'adopted',
          adoptedDate: { [Op.ne]: null },
        },
        attributes: ['createdAt', 'adoptedDate'],
        limit: 50,
        order: [['adoptedDate', 'DESC']],
      });

      let averageTimeToAdoption = 0;
      if (recentAdoptions.length > 0) {
        const totalDays = recentAdoptions.reduce((sum, pet) => {
          const createdAt = new Date(pet.createdAt);
          const adoptedAt = new Date(pet.adoptedDate!);
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
      const safeSortBy = validateSortField(sortBy, RESCUE_PET_SORT_FIELDS, 'createdAt');

      const whereClause: WhereOptions = { rescue_id: rescueId };
      if (status) {
        whereClause.status = status;
      }

      const orderClause =
        safeSortBy === 'createdAt' ? [['created_at', sortOrder]] : [[safeSortBy, sortOrder]];

      const { count, rows: pets } = await Pet.findAndCountAll({
        where: whereClause,
        order: orderClause as Order,
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
      // paranoid scope hides already-soft-deleted rows by default;
      // opt in so we can throw a clearer error if it's already gone.
      const rescue = await Rescue.findByPk(rescueId, {
        paranoid: false,
        transaction,
      });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      if (rescue.deletedAt) {
        throw new Error('Rescue organization is already deleted');
      }

      // paranoid soft-delete sets deletedAt; the audit log captures who.
      await rescue.destroy({ transaction });

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

      // paranoid scope hides soft-deleted rows automatically.
      const whereConditions: WhereOptions = {
        rescueId,
      };

      // Build user search conditions for the included User model
      const userWhereConditions: WhereOptions = {};
      if (search) {
        // Type assertion needed: Sequelize's types don't support Op.or as index signature
        // This is a valid runtime pattern - Op.or is a symbol used for OR queries
        const orConditions = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
        Object.assign(userWhereConditions, { [Op.or]: orConditions });
      }

      const { rows: staffMembers, count: total } = await StaffMember.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'user',
            where: Object.keys(userWhereConditions).length > 0 ? userWhereConditions : undefined,
            attributes: ['userId', 'firstName', 'lastName', 'email', 'userType'],
          },
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

  /**
   * Update adoption policies for a rescue
   */
  static async updateAdoptionPolicies(
    rescueId: string,
    adoptionPolicies: AdoptionPolicy,
    updatedBy: string
  ): Promise<AdoptionPolicy> {
    const startTime = Date.now();
    const transaction = await Rescue.sequelize!.transaction();

    try {
      const rescue = await Rescue.findByPk(rescueId, { transaction });

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      // Get current settings or initialize empty object
      const currentSettings = (rescue.settings as unknown) || {};

      // Update settings with new adoption policies
      const updatedSettings = {
        ...currentSettings,
        adoptionPolicies,
      };

      await rescue.update({ settings: updatedSettings }, { transaction });

      // Log the action
      await AuditLogService.log({
        userId: updatedBy,
        action: 'update',
        entity: 'rescue',
        entityId: rescueId,
        details: {
          rescueId,
          field: 'adoptionPolicies',
          action: 'updated',
        },
      });

      loggerHelpers.logBusiness(
        'Adoption Policies Updated',
        {
          rescueId,
          updatedBy,
          duration: Date.now() - startTime,
        },
        updatedBy
      );

      await transaction.commit();

      logger.info(`Updated adoption policies for rescue: ${rescueId}`);
      return adoptionPolicies;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating adoption policies:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        updatedBy,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update adoption policies');
    }
  }

  /**
   * Get adoption policies for a rescue
   */
  static async getAdoptionPolicies(rescueId: string): Promise<AdoptionPolicy | null> {
    const startTime = Date.now();

    try {
      const rescue = await Rescue.findByPk(rescueId);

      if (!rescue) {
        throw new Error('Rescue not found');
      }

      type RescueSettings = { adoptionPolicies?: AdoptionPolicy | null };
      const settings = (rescue.settings as RescueSettings) || {};
      const adoptionPolicies = settings.adoptionPolicies || null;

      loggerHelpers.logDatabase('READ', {
        rescueId,
        field: 'adoptionPolicies',
        duration: Date.now() - startTime,
        found: !!adoptionPolicies,
      });

      return adoptionPolicies;
    } catch (error) {
      logger.error('Error getting adoption policies:', {
        error: error instanceof Error ? error.message : String(error),
        rescueId,
        duration: Date.now() - startTime,
      });
      if (error instanceof Error && error.message === 'Rescue not found') {
        throw error;
      }
      throw new Error('Failed to retrieve adoption policies');
    }
  }

  static async bulkUpdateRescues(
    rescueIds: string[],
    action: BulkRescueAction,
    performedBy: string,
    reason?: string
  ): Promise<BulkRescueResult> {
    const result: BulkRescueResult = { successCount: 0, failedCount: 0, errors: [] };

    for (const rescueId of rescueIds) {
      try {
        if (action === 'approve' || action === 'verify') {
          // Both actions perform identical state transitions, but operator
          // intent must be preserved in the audit log. Pass the original
          // action verb through so the audit entry records 'approve' vs
          // 'verify' rather than collapsing them — see ADS-378.
          await RescueService.verifyRescue(rescueId, performedBy, reason, 'manual', action);
        } else if (action === 'suspend') {
          await RescueService.suspendRescue(rescueId, performedBy, reason);
        }
        result.successCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          rescueId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Bulk rescue operation completed', {
      action,
      total: rescueIds.length,
      successCount: result.successCount,
      failedCount: result.failedCount,
      performedBy,
    });

    return result;
  }
}
