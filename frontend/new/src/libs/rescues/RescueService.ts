import { Rescue, StaffMember } from './Rescue'
import { Role } from '@adoptdontshop/permissions'

const rescues: Rescue[] = [
  {
    rescue_id: '1',
    rescue_name: 'Animal Rescue A',
    rescue_type: 'Charity',
    rescue_city: 'New York',
    rescue_country: 'USA',
    reference_number: 'AR1234',
    reference_number_verified: true,
    staff: [
      {
        user_id: '1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: [
          Role.RESCUE_MANAGER,
          Role.APPLICATION_MANAGER,
          Role.COMMUNICATIONS_MANAGER,
          Role.PET_MANAGER,
          Role.STAFF_MANAGER,
        ],
        verified_by_rescue: true,
      },
      {
        user_id: '2',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        role: [Role.STAFF_MANAGER],
        verified_by_rescue: false,
      },
    ],
  },
  {
    rescue_id: '2',
    rescue_name: 'Wildlife Rescue B',
    rescue_type: 'Company',
    rescue_city: 'Los Angeles',
    rescue_country: 'USA',
    staff: [
      {
        user_id: '3',
        first_name: 'Alice',
        last_name: 'Smith',
        email: 'alice@example.com',
        role: [Role.PET_MANAGER],
        verified_by_rescue: true,
      },
      {
        user_id: '4',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob@example.com',
        role: [Role.COMMUNICATIONS_MANAGER],
        verified_by_rescue: true,
      },
    ],
  },
  {
    rescue_id: '3',
    rescue_type: 'Individual',
    rescue_city: 'New York',
    rescue_country: 'USA',
    staff: [
      {
        user_id: '1',
        first_name: 'Mike',
        last_name: 'Doss',
        email: 'mike.doss@example.com',
        role: [
          Role.RESCUE_MANAGER,
          Role.APPLICATION_MANAGER,
          Role.COMMUNICATIONS_MANAGER,
          Role.PET_MANAGER,
          Role.STAFF_MANAGER,
        ],
        verified_by_rescue: true,
      },
    ],
  },
]

const getRescues = (): Rescue[] => rescues

const getRescueById = (id: string): Rescue | undefined =>
  rescues.find((rescue) => rescue.rescue_id === id)

const getStaffMembersByRescueId = (
  rescue_id: string,
): StaffMember[] | undefined => {
  const rescue = getRescueById(rescue_id)
  return rescue?.staff
}

const getStaffMemberById = (
  rescue_id: string,
  staff_id: string,
): StaffMember | undefined => {
  const staff = getStaffMembersByRescueId(rescue_id)
  return staff?.find((member) => member.user_id === staff_id)
}

export default {
  getRescues,
  getRescueById,
  getStaffMembersByRescueId,
  getStaffMemberById,
}
