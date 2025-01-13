import { User } from '@adoptdontshop/libs/users'

type RoleDisplay = {
  role_id: string
  role_name: string
}

export type RescueType = 'Individual' | 'Charity' | 'Company'

export interface StaffMember extends User {
  user_id: string
  role: RoleDisplay[]
  verified_by_rescue: boolean
}

export interface IndividualRescue {
  rescue_id: string
  rescue_name?: string
  rescue_type: 'Individual'
  city: string
  country: string
  staff: [StaffMember] // Only one staff member, themselves
}

export interface OrganizationRescue {
  rescue_id: string
  rescue_name: string
  rescue_type: 'Charity' | 'Company'
  city: string
  country: string
  reference_number?: string
  reference_number_verified?: boolean
  staff: StaffMember[]
}

export type Rescue = IndividualRescue | OrganizationRescue
