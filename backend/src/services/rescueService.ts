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
import { sendInvitationEmail } from './emailService'

export const getAllRescuesService = async (): Promise<{
  rescues: Rescue[]
}> => {
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
        staff: [staffMembers[0]], // Only one staff member for IndividualRescue
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

  return { rescues: formattedRescues }
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

  // Format staff members for the response
  const staffMembers: StaffMember[] =
    rescue.StaffMembers?.map((staff: any) => ({
      user_id: staff.user_id,
      first_name: staff.user.first_name,
      email: staff.user.email,
      role: staff.role,
      verified_by_rescue: staff.verified_by_rescue,
    })) || []

  // Check if the requesting user is a staff member of the rescue
  const isStaff = staffMembers.some((staff) => staff.user_id === user.user_id)

  if (!isStaff) {
    // Return limited data if the user is not a staff member
    return {
      rescue_id: rescue.rescue_id,
      rescue_name: rescue.rescue_name,
      rescue_type: rescue.rescue_type,
      city: rescue.city,
      country: rescue.country,
    } as LimitedRescue
  }

  // Return full data if the user is a staff member
  if (rescue.rescue_type === 'Individual') {
    return {
      rescue_id: rescue.rescue_id,
      rescue_name: rescue.rescue_name,
      rescue_type: 'Individual',
      city: rescue.city,
      country: rescue.country,
      staff: [staffMembers[0]], // Only one staff member for IndividualRescue
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
  try {
    // Fetch staff members with roles
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

    // Map staff members to match the expected frontend structure
    const mappedStaffMembers = staffMembers.map((staff) => ({
      user_id: staff.user_id,
      first_name: (staff as any).user?.first_name || '',
      last_name: (staff as any).user?.last_name || '',
      email: (staff as any).user?.email || '',
      role: (staff as any).user?.Roles || [],
      verified_by_rescue: staff.verified_by_rescue,
      isInvite: false, // Mark as non-invite entries
    }))

    // Fetch invitations related to the rescue
    const invitations = await InvitationModel.findAll({
      where: { rescue_id: rescueId },
      attributes: ['email', 'created_at', 'expiration', 'used'], // Fetch relevant attributes
    })

    // Map invitations to match the frontend structure, adding a derived 'status'
    const mappedInvitations = invitations.map((invite) => {
      // Calculate the status based on 'used' and 'expiration'
      const status = invite.used
        ? 'Accepted'
        : invite.expiration < new Date()
        ? 'Expired'
        : 'Pending'

      return {
        user_id: '', // No user_id for invitations
        first_name: '',
        last_name: '',
        email: invite.email,
        role: [], // No roles for invitations
        verified_by_rescue: false,
        isInvite: true,
        invited_on: invite.created_at,
        status, // Dynamically add status based on conditions
      }
    })

    // Return the combined response with both staff members and invitations
    return {
      staffMembers: mappedStaffMembers,
      invitations: mappedInvitations,
    }
  } catch (error) {
    console.error(
      'Error fetching staff members with roles and invitations:',
      error,
    )
    throw new Error('Failed to fetch staff members and invitations')
  }
}

export const deleteStaffService = async (userId: string): Promise<void> => {
  const staffMember = await StaffMemberModel.findOne({
    where: { user_id: userId },
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

  // Check if user already exists
  const existingUser = await UserModel.findOne({ where: { email } })
  const user_id = existingUser ? existingUser.user_id : null

  // Save the invitation in the database
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

// Add a role to a specific user
export const addRoleToUserService = async (
  userId: string,
  role: string,
): Promise<void> => {
  // Find the role to get the role_id
  const roleRecord = await RoleModel.findOne({ where: { role_name: role } })
  if (!roleRecord) {
    throw new Error(`Role '${role}' does not exist`)
  }

  // Check if the user exists
  const user = await UserModel.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // Add the role by creating a record in UserRole
  await UserRoleModel.create({
    user_id: userId,
    role_id: roleRecord.role_id,
  })
}

export const removeRoleFromUserService = async (
  userId: string,
  roleName: string,
): Promise<void> => {
  // Find the role to get the role_id
  const roleRecord = await RoleModel.findOne({ where: { role_name: roleName } })
  if (!roleRecord) {
    throw new Error(`Role '${roleName}' does not exist`)
  }

  // Check if the user exists
  const user = await UserModel.findByPk(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // Remove the role by deleting the record in UserRole
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
