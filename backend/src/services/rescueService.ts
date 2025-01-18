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
import CharityService from './charityRegisterService'
import CompanyHouseService from './companyHouseService'
import { sendInvitationEmail } from './emailService'

export const getAllRescuesService = async (): Promise<Rescue[]> => {
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

  return formattedRescues
}

export const getSingleRescueService = async (
  rescueId: string,
  user: User,
): Promise<Rescue | LimitedRescue | null> => {
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
      reference_number: rescue.reference_number,
      reference_number_verified: rescue.reference_number_verified,
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
}

export const updateRescueService = async (
  id: string,
  updatedData: Partial<Rescue>,
) => {
  const rescue = await RescueModel.findByPk(id)
  if (!rescue) {
    throw new Error('Rescue not found')
  }

  await rescue.update(updatedData)

  return {
    rescue_id: rescue.rescue_id,
    ...updatedData,
  }
}

export const getRescueStaffWithRoles = async (
  rescueId: string,
): Promise<{
  staffMembers: StaffMember[]
  invitations: Array<Partial<InvitationModel> & { status: string }>
}> => {
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

  return {
    staffMembers: mappedStaffMembers,
    invitations: mappedInvitations,
  }
}

export const deleteStaffService = async (
  userId: string,
  rescueId: string,
): Promise<void> => {
  const staffMember = await StaffMemberModel.findOne({
    where: {
      user_id: userId,
      rescue_id: rescueId,
    },
  })

  if (!staffMember) {
    throw new Error('Staff member not found')
  }

  await staffMember.destroy()
}

export const inviteUserService = async (email: string, rescue_id: string) => {
  const secretKey = process.env.SECRET_KEY as string
  const token = jwt.sign({ email, rescue_id }, secretKey, {
    expiresIn: '48h',
  })

  const existingUser = await UserModel.findOne({ where: { email } })
  const user_id = existingUser ? existingUser.user_id : null

  await InvitationModel.create({ email, token, rescue_id, user_id })
  await sendInvitationEmail(email, token)
}

export const cancelInvitationService = async (
  email: string,
  rescueId: string,
): Promise<void> => {
  const invitation = await InvitationModel.findOne({
    where: { email, rescue_id: rescueId, used: false },
  })

  if (!invitation) {
    throw new Error('Invitation not found or already used')
  }

  await invitation.destroy()
}

export const addRoleToUserService = async (
  userId: string,
  role: string,
): Promise<void> => {
  const roleRecord = await RoleModel.findOne({ where: { role_name: role } })
  if (!roleRecord) {
    throw new Error(`Role '${role}' does not exist`)
  }

  const user = await UserModel.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }

  await UserRoleModel.create({
    user_id: userId,
    role_id: roleRecord.role_id,
  })
}

export const removeRoleFromUserService = async (
  userId: string,
  roleName: string,
): Promise<void> => {
  const roleRecord = await RoleModel.findOne({
    where: { role_name: roleName },
  })
  if (!roleRecord) {
    throw new Error(`Role '${roleName}' does not exist`)
  }

  const user = await UserModel.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const deletionCount = await UserRoleModel.destroy({
    where: {
      user_id: userId,
      role_id: roleRecord.role_id,
    },
  })

  if (deletionCount === 0) {
    throw new Error(`Role '${roleName}' not assigned to user`)
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
    // Check StaffMember model for rescue_id
    const staffMember = await StaffMemberModel.findOne({
      where: { user_id: userId },
      attributes: ['rescue_id'],
    })

    return staffMember?.rescue_id || null
  } catch (error) {
    console.error(`Error fetching rescue_id for user ID ${userId}:`, error)
    throw new Error('Failed to fetch rescue_id')
  }
}

export const verifyRescueOwnership = async (
  userId: string,
  targetRescueId: string,
): Promise<boolean> => {
  try {
    const staffMember = await StaffMemberModel.findOne({
      where: {
        user_id: userId,
        rescue_id: targetRescueId,
      },
    })

    return !!staffMember
  } catch (error) {
    console.error(`Error verifying rescue ownership for user ${userId}:`, error)
    return false
  }
}

export const deleteRescueService = async (rescueId: string): Promise<void> => {
  const rescue = await RescueModel.findByPk(rescueId)
  if (!rescue) {
    throw new Error('Rescue not found')
  }

  await rescue.destroy()
}

export const verifyReferenceNumberService = async (
  rescueId: string,
  referenceNumber: string,
): Promise<{ isVerified: boolean }> => {
  // Get the rescue to determine its type
  const rescue = await RescueModel.findByPk(rescueId)
  if (!rescue) {
    throw new Error('Rescue not found')
  }

  let isValid = false

  // Verify based on rescue type
  if (rescue.rescue_type.toLowerCase() === 'charity') {
    isValid = await CharityService.fetchAndValidateCharity(referenceNumber)
  } else if (rescue.rescue_type.toLowerCase() === 'company') {
    isValid = await CompanyHouseService.fetchAndValidateCompany(referenceNumber)
  } else {
    throw new Error('Invalid rescue type for reference number verification')
  }

  // Update the rescue with verification result
  await rescue.update({
    reference_number: referenceNumber,
    reference_number_verified: isValid,
  })

  return { isVerified: isValid }
}
