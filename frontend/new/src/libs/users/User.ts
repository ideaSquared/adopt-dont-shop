export interface User {
	user_id: string;
	email: string;
	password?: string;
	confirm_password?: string;
	first_name: string;
	last_name: string;
	city?: string;
	country?: string;
	description?: string;
	reset_token_force_flag?: boolean;
	is_admin?: boolean;
}

// Using type aliases and Pick to create specific subsets
export type LoginUser = Pick<User, 'email' | 'password'>;
export type ResetPasswordUser = Pick<User, 'email'>;
