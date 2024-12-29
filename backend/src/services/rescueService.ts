import jwt from 'jsonwebtoken'
import {
  Invitation as InvitationModel,
  Rescue as RescueModel,
  Role as RoleModel,
  StaffMember as StaffMemberModel,
  User as UserModel,
  UserRole as UserRoleModel,
} from '../Models'
import { User } from '../types'
import {
  IndividualRescue,
  LimitedRescue,
  OrganizationRescue,
  Rescue,
  StaffMember,
} from '../types/Rescue'
import { AuditLogger } from './auditLogService'
import { sendInvitationEmail } from './emailService'

export const getAllRescuesService = async (): Promise<{
  rescues: Rescue[]
}> => {
  await AuditLogger.logAction('RescueService', 'Fetching all rescues', 'INFO')
  try {
    const rescues = await RescueModel.findAll({
      include: [
        {
          model: StaffMemberModel,
          as: 'staff',
          required: false,
          include: [
            {
              model: UserModel,
              as: 'user',
              attributes: ['first_name', 'email'],
            },
          ],
        },
      ],
    })

    const formattedRescues: Rescue[] = rescues.map((rescue: any) => {
      const staffMembers: StaffMember[] =
        rescue.staff?.map((staff: any) => ({
          user_id: staff.user_id,
          first_name: staff.user.first_name,
          email: staff.user.email,
          role: staff.role,
          verified_by_rescue: staff.verified_by_rescue,
        })) || []

      if (rescue.rescue_type === 'Individual') {
        return {
          rescue_id: rescue.rescue_id,
          rescue_name: rescue.rescue_name,
          rescue_type: 'Individual',
          city: rescue.city,
          country: rescue.country,
          staff: [staffMembers[0]],
        } as IndividualRescue
      } else {
        return {
          rescue_id: rescue.rescue_id,
          rescue_name: rescue.rescue_name,
          rescue_type: rescue.rescue_type,
          city: rescue.city,
          country: rescue.country,
          reference_number: rescue.reference_number,
          reference_number_verified: rescue.reference_number_verified,
          staff: staffMembers,
        } as OrganizationRescue
      }
    })

    await AuditLogger.logAction(
      'RescueService',
      'Successfully fetched all rescues',
      'INFO',
    )
    return { rescues: formattedRescues }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error fetching rescues - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch rescues: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      'Unknown error while fetching rescues',
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching rescues')
  }
}

export const getSingleRescueService = async (
  rescueId: string,
  user: User,
): Promise<Rescue | LimitedRescue | null> => {
  await AuditLogger.logAction(
    'RescueService',
    `Fetching rescue with ID: ${rescueId}`,
    'INFO',
  )
  try {
    const rescue = await RescueModel.findByPk(rescueId, {
      include: [
        {
          model: StaffMemberModel,
          as: 'staff',
          required: false,
          include: [
            {
              model: UserModel,
              as: 'user',
              attributes: ['user_id', 'first_name', 'email'],
            },
          ],
        },
      ],
    })

    if (!rescue) {
      await AuditLogger.logAction(
        'RescueService',
        `Rescue with ID: ${rescueId} not found`,
        'WARNING',
      )
      return null
    }

    const staffMembers: StaffMember[] =
      rescue.StaffMembers?.map((staff: any) => ({
        user_id: staff.user_id,
        first_name: staff.user.first_name,
        email: staff.user.email,
        role: staff.role,
        verified_by_rescue: staff.verified_by_rescue,
      })) || []

    const isStaff = staffMembers.some((staff) => staff.user_id === user.user_id)

    if (!isStaff) {
      return {
        rescue_id: rescue.rescue_id,
        rescue_name: rescue.rescue_name,
        rescue_type: rescue.rescue_type,
        city: rescue.city,
        country: rescue.country,
      } as LimitedRescue
    }

    if (rescue.rescue_type === 'Individual') {
      return {
        rescue_id: rescue.rescue_id,
        rescue_name: rescue.rescue_name,
        rescue_type: 'Individual',
        city: rescue.city,
        country: rescue.country,
        staff: [staffMembers[0]],
      } as IndividualRescue
    } else {
      return {
        rescue_id: rescue.rescue_id,
        rescue_name: rescue.rescue_name,
        rescue_type: rescue.rescue_type,
        city: rescue.city,
        country: rescue.country,
        reference_number: rescue.reference_number,
        reference_number_verified: rescue.reference_number_verified,
        staff: staffMembers,
      } as OrganizationRescue
    }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error fetching rescue with ID: ${rescueId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch rescue: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while fetching rescue with ID: ${rescueId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while fetching the rescue')
  }
}

export const updateRescueService = async (
  id: string,
  updatedData: Partial<Rescue>,
) => {
  await AuditLogger.logAction(
    'RescueService',
    `Updating rescue with ID: ${id}`,
    'INFO',
  )
  try {
    const rescue = await RescueModel.findByPk(id)
    if (!rescue) {
      await AuditLogger.logAction(
        'RescueService',
        `Rescue with ID: ${id} not found`,
        'WARNING',
      )
      throw new Error('Rescue not found')
    }

    await rescue.update(updatedData)
    await AuditLogger.logAction(
      'RescueService',
      `Successfully updated rescue with ID: ${id}`,
      'INFO',
    )
    return {
      rescue_id: rescue.rescue_id,
      ...updatedData,
    }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error updating rescue with ID: ${id} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to update rescue: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while updating rescue with ID: ${id}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while updating the rescue')
  }
}

export const getRescueStaffWithRoles = async (
  rescueId: string,
): Promise<{
  staffMembers: StaffMember[]
  invitations: Array<Partial<InvitationModel> & { status: string }>
}> => {
  await AuditLogger.logAction(
    'RescueService',
    `Fetching staff and invitations for rescue ID: ${rescueId}`,
    'INFO',
  )
  try {
    const staffMembers = await StaffMemberModel.findAll({
      where: { rescue_id: rescueId },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['user_id', 'first_name', 'last_name', 'email'],
          include: [
            {
              model: RoleModel,
              as: 'Roles',
              through: { attributes: [] },
              attributes: ['role_id', 'role_name'],
            },
          ],
        },
      ],
    })

    const mappedStaffMembers = staffMembers.map((staff) => ({
      user_id: staff.user_id,
      first_name: (staff as any).user?.first_name || '',
      last_name: (staff as any).user?.last_name || '',
      email: (staff as any).user?.email || '',
      role: (staff as any).user?.Roles || [],
      verified_by_rescue: staff.verified_by_rescue,
      isInvite: false,
    }))

    const invitations = await InvitationModel.findAll({
      where: { rescue_id: rescueId },
      attributes: ['email', 'created_at', 'expiration', 'used'],
    })

    const mappedInvitations = invitations.map((invite) => {
      const status = invite.used
        ? 'Accepted'
        : invite.expiration < new Date()
        ? 'Expired'
        : 'Pending'

      return {
        user_id: '',
        first_name: '',
        last_name: '',
        email: invite.email,
        role: [],
        verified_by_rescue: false,
        isInvite: true,
        invited_on: invite.created_at,
        status,
      }
    })

    await AuditLogger.logAction(
      'RescueService',
      `Successfully fetched staff and invitations for rescue ID: ${rescueId}`,
      'INFO',
    )
    return {
      staffMembers: mappedStaffMembers,
      invitations: mappedInvitations,
    }
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error fetching staff and invitations for rescue ID: ${rescueId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to fetch staff and invitations: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while fetching staff and invitations for rescue ID: ${rescueId}`,
      'ERROR',
    )
    throw new Error(
      'An unknown error occurred while fetching staff and invitations',
    )
  }
}

export const deleteStaffService = async (userId: string): Promise<void> => {
  await AuditLogger.logAction(
    'RescueService',
    `Deleting staff member with user ID: ${userId}`,
    'INFO',
  )
  try {
    const staffMember = await StaffMemberModel.findOne({
      where: { user_id: userId },
    })

    if (!staffMember) {
      await AuditLogger.logAction(
        'RescueService',
        `Staff member with user ID: ${userId} not found`,
        'WARNING',
      )
      throw new Error('Staff member not found')
    }

    await staffMember.destroy()
    await AuditLogger.logAction(
      'RescueService',
      `Successfully deleted staff member with user ID: ${userId}`,
      'INFO',
    )
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error deleting staff member with user ID: ${userId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to delete staff member: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while deleting staff member with user ID: ${userId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while deleting the staff member')
  }
}

export const inviteUserService = async (email: string, rescue_id: string) => {
  await AuditLogger.logAction(
    'RescueService',
    `Inviting user with email: ${email} to rescue ID: ${rescue_id}`,
    'INFO',
  )
  try {
    const secretKey = process.env.SECRET_KEY as string
    const token = jwt.sign({ email, rescue_id }, secretKey, {
      expiresIn: '48h',
    })

    const existingUser = await UserModel.findOne({ where: { email } })
    const user_id = existingUser ? existingUser.user_id : null

    await InvitationModel.create({ email, token, rescue_id, user_id })
    await sendInvitationEmail(email, token)
    await AuditLogger.logAction(
      'RescueService',
      `Successfully invited user with email: ${email} to rescue ID: ${rescue_id}`,
      'INFO',
    )
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error inviting user with email: ${email} to rescue ID: ${rescue_id} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to invite user: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while inviting user with email: ${email} to rescue ID: ${rescue_id}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while inviting the user')
  }
}

export const cancelInvitationService = async (
  email: string,
  rescueId: string,
): Promise<void> => {
  await AuditLogger.logAction(
    'RescueService',
    `Cancelling invitation for email: ${email} in rescue ID: ${rescueId}`,
    'INFO',
  )
  try {
    const invitation = await InvitationModel.findOne({
      where: { email, rescue_id: rescueId, used: false },
    })

    if (!invitation) {
      await AuditLogger.logAction(
        'RescueService',
        `Invitation for email: ${email} in rescue ID: ${rescueId} not found or already used`,
        'WARNING',
      )
      throw new Error('Invitation not found or already used')
    }

    await invitation.destroy()
    await AuditLogger.logAction(
      'RescueService',
      `Successfully cancelled invitation for email: ${email} in rescue ID: ${rescueId}`,
      'INFO',
    )
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error cancelling invitation for email: ${email} in rescue ID: ${rescueId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to cancel invitation: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while cancelling invitation for email: ${email} in rescue ID: ${rescueId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while cancelling the invitation')
  }
}

export const addRoleToUserService = async (
  userId: string,
  role: string,
): Promise<void> => {
  await AuditLogger.logAction(
    'RescueService',
    `Adding role '${role}' to user with ID: ${userId}`,
    'INFO',
  )
  try {
    const roleRecord = await RoleModel.findOne({ where: { role_name: role } })
    if (!roleRecord) {
      await AuditLogger.logAction(
        'RescueService',
        `Role '${role}' not found`,
        'WARNING',
      )
      throw new Error(`Role '${role}' does not exist`)
    }

    const user = await UserModel.findByPk(userId)
    if (!user) {
      await AuditLogger.logAction(
        'RescueService',
        `User with ID: ${userId} not found`,
        'WARNING',
      )
      throw new Error('User not found')
    }

    await UserRoleModel.create({
      user_id: userId,
      role_id: roleRecord.role_id,
    })
    await AuditLogger.logAction(
      'RescueService',
      `Successfully added role '${role}' to user with ID: ${userId}`,
      'INFO',
    )
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error adding role '${role}' to user with ID: ${userId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to add role: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while adding role '${role}' to user with ID: ${userId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while adding the role')
  }
}

export const removeRoleFromUserService = async (
  userId: string,
  roleName: string,
): Promise<void> => {
  await AuditLogger.logAction(
    'RescueService',
    `Removing role '${roleName}' from user with ID: ${userId}`,
    'INFO',
  )
  try {
    const roleRecord = await RoleModel.findOne({
      where: { role_name: roleName },
    })
    if (!roleRecord) {
      await AuditLogger.logAction(
        'RescueService',
        `Role '${roleName}' not found`,
        'WARNING',
      )
      throw new Error(`Role '${roleName}' does not exist`)
    }

    const user = await UserModel.findByPk(userId)
    if (!user) {
      await AuditLogger.logAction(
        'RescueService',
        `User with ID: ${userId} not found`,
        'WARNING',
      )
      throw new Error('User not found')
    }

    const deletionCount = await UserRoleModel.destroy({
      where: {
        user_id: userId,
        role_id: roleRecord.role_id,
      },
    })

    if (deletionCount === 0) {
      await AuditLogger.logAction(
        'RescueService',
        `Role '${roleName}' not assigned to user with ID: ${userId}, cannot remove`,
        'WARNING',
      )
      throw new Error(`Role '${roleName}' not assigned to user`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Successfully removed role '${roleName}' from user with ID: ${userId}`,
      'INFO',
    )
  } catch (error) {
    if (error instanceof Error) {
      await AuditLogger.logAction(
        'RescueService',
        `Error removing role '${roleName}' from user with ID: ${userId} - ${error.message}`,
        'ERROR',
      )
      throw new Error(`Failed to remove role: ${error.message}`)
    }
    await AuditLogger.logAction(
      'RescueService',
      `Unknown error while removing role '${roleName}' from user with ID: ${userId}`,
      'ERROR',
    )
    throw new Error('An unknown error occurred while removing the role')
  }
}

/**
 * Retrieve the rescue_id associated with a user by their user ID.
 * @param userId - The ID of the user.
 * @returns Promise resolving to the rescue_id or null if not found.
 */
export const getRescueIdByUserId = async (
  userId: string,
): Promise<string | null> => {
  try {
    // Fetch the staff record linked to the user
    const staffMember = await StaffMemberModel.findOne({
      where: { user_id: userId },
      attributes: ['rescue_id'], // Only fetch rescue_id to reduce overhead
    })

    // Return the rescue_id if found, otherwise null
    return staffMember?.rescue_id || null
  } catch (error) {
    console.error(`Error fetching rescue_id for user ID ${userId}:`, error)
    throw new Error('Failed to fetch rescue_id')
  }
}
