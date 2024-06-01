// src/types/rescue.d.ts

export interface Rescue {
	rescueId: string;
	rescueName: string;
	rescueType: string;
	referenceNumber?: string;
	referenceNumberVerified?: boolean;
	country?: string;
	staff: StaffMember[];
}

export interface StaffMember {
	userId: string;
	firstName: string;
	lastName?: string;
	email: string;
	password?: string;
	permissions?: string[];
	verifiedByRescue?: boolean;
}
