import {
  Rescue as RescueModel,
  StaffMember as StaffMemberModel,
  User as UserModel,
} from '../Models'
import {
  IndividualRescue,
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
