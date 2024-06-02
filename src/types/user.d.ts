// src/types/user.d.ts

export interface User {
	user_id?: string;
	email: string;
	password: string;
	confirmPassword: string;
	first_name: string;
	last_name: string;
	city?: string;
	country?: string;
	description?: string;
	reset_token_force_flag?: boolean;
	is_admin?: boolean;
}
