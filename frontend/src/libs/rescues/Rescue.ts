import { Role } from '@adoptdontshop/permissions'
import { User } from '@adoptdontshop/libs/users'

export type RescueType = 'Individual' | 'Charity' | 'Company'

export interface StaffMember extends User {
  user_id: string
  role: Role[]
  verified_by_rescue: boolean
}

export interface IndividualRescue {
  rescue_id: string
  rescue_name?: string
  rescue_type: 'Individual'
  rescue_city: string
  rescue_country: string
  staff: [StaffMember] // Only one staff member, themselves
}

export interface OrganizationRescue {
  rescue_id: string
  rescue_name: string
  rescue_type: 'Charity' | 'Company'
  rescue_city: string
  rescue_country: string
  reference_number?: string
  reference_number_verified?: boolean
  staff: StaffMember[]
}

export type Rescue = IndividualRescue | OrganizationRescue
