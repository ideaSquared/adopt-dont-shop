// src/types/rescue.d.ts

export interface StaffMember {
	userId: string;
	firstName: string;
	lastName?: string;
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
	referenceNumber?: string;
	referenceNumberVerified?: boolean;
	country?: string;
	staff: StaffMember[];
}
