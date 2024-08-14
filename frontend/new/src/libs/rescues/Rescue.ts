import { Role } from 'contexts/Permission';

export type RescueType = 'Individual' | 'Charity' | 'Company';

export interface StaffMember {
	user_id: string;
	first_name: string;
	last_name?: string;
	email: string;
	password?: string;
	role: Role[];
	verified_by_rescue?: boolean;
}

export interface Rescue {
	rescue_id: string;
	rescue_name?: string;
	rescue_type: RescueType;
	rescue_city: string;
	rescue_country: string;
	reference_number?: string;
	reference_number_verified?: boolean;
	staff: StaffMember[];
}
