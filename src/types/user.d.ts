// src/types/user.d.ts

export interface User {
	userId?: string;
	email: string;
	password: string;
	confirmPassword: string;
	firstName: string;
	lastName: string;
	city?: string;
	country?: string;
	description?: string;
	resetTokenForceFlag?: boolean;
	isAdmin?: boolean;
}
