export interface StaffMember {
	user_id: string;
	first_name: string;
	last_name?: string;
	email: string;
	password?: string;
	permissions?: string[];
	verified_by_rescue?: boolean;
}

export interface Rescue {
	rescue_id: string;
	rescue_name: string;
	rescue_type: string;
	rescue_city: string;
	rescue_country: string;
	reference_number?: string;
	reference_number_verified?: boolean;
	country?: string;
	staff: StaffMember[];
}
