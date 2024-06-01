// src/types/rescue.d.ts

export interface Rescue {
	rescue_id: string;
	rescueName: string;
	rescueType: string;
	referenceNumber?: string;
	referenceNumberVerified?: boolean;
	country?: string;
	staff: StaffMember[];
}

export interface StaffMember {
	user_id: string;
	firstName: string;
	lastName?: string;
	email: string;
	password?: string;
	permissions?: string[];
	verified_by_rescue?: boolean;
}
