import {
  Rescue as RescueModel,
  Role as RoleModel,
  StaffMember as StaffMemberModel,
  User as UserModel,
} from '../Models'
import { User } from '../types'
import {
  IndividualRescue,
  LimitedRescue,
  OrganizationRescue,
  Rescue,
  StaffMember,
} from '../types/Rescue'

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
): Promise<StaffMember[]> => {
  try {
    // Fetch staff members for the given rescue, including roles
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

    return staffMembers.map((staff) => ({
      user_id: staff.user_id,
      first_name: (staff as any).user?.first_name || '', // Safely access nested User properties
      last_name: (staff as any).user?.last_name || '',
      email: (staff as any).user?.email || '',
      role: (staff as any).user?.Roles || [], // Role array within the User association
      verified_by_rescue: staff.verified_by_rescue,
    }))
  } catch (error) {
    console.error('Error fetching staff members with roles:', error)
    throw new Error('Failed to fetch staff members')
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
