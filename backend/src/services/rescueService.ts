import {
  Rescue as RescueModel,
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

// export const updateRescueService = async (
//   rescueId: string,
//   updateData: Partial<Rescue>,
// ): Promise<void> => {
//   await RescueModel.update(updateData, {
//     where: { rescue_id: rescueId },
//   })
// }

// export const deleteRescueService = async (rescueId: string): Promise<void> => {
//   await RescueModel.destroy({
//     where: { rescue_id: rescueId },
//   })
// }

// export const getRescueByStaffUserIdService = async (
//   userId: string,
// ): Promise<Rescue[]> => {
//   const rescues = await RescueModel.findAll({
//     include: [
//       {
//         model: StaffMemberModel,
//         as: 'staff',
//         required: true,
//         where: { user_id: userId },
//         include: [
//           {
//             model: UserModel,
//             as: 'user',
//             attributes: ['first_name', 'email'],
//           },
//         ],
//       },
//     ],
//   })

//   return rescues.map((rescue: any) => {
//     const staffMembers: StaffMember[] =
//       rescue.staff?.map((staff: any) => ({
//         user_id: staff.user_id,
//         first_name: staff.user.first_name,
//         email: staff.user.email,
//         role: staff.role,
//         verified_by_rescue: staff.verified_by_rescue,
//       })) || []

//     if (rescue.rescue_type === 'Individual') {
//       return {
//         rescue_id: rescue.rescue_id,
//         rescue_name: rescue.rescue_name,
//         rescue_type: 'Individual',
//         city: rescue.city,
//         country: rescue.country,
//         staff: [staffMembers[0]], // Only one staff member for IndividualRescue
//       } as IndividualRescue
//     } else {
//       return {
//         rescue_id: rescue.rescue_id,
//         rescue_name: rescue.rescue_name,
//         rescue_type: rescue.rescue_type,
//         city: rescue.city,
//         country: rescue.country,
//         reference_number: rescue.reference_number,
//         reference_number_verified: rescue.reference_number_verified,
//         staff: staffMembers,
//       } as OrganizationRescue
//     }
//   })
// }
