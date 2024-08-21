import { Role } from './Role'
import { User } from './User'

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
  city: string
  country: string
  staff: [StaffMember]
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
