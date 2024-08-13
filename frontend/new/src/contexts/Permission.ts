export enum Permission {
	VIEW_RESCUE_INFO = 'view_rescue_info',
	EDIT_RESCUE_INFO = 'edit_rescue_info',
	DELETE_RESCUE = 'delete_rescue',
	VIEW_STAFF = 'view_staff',
	ADD_STAFF = 'add_staff',
	EDIT_STAFF = 'edit_staff',
	VERIFY_STAFF = 'verify_staff',
	DELETE_STAFF = 'delete_staff',
	VIEW_PET = 'view_pet',
	ADD_PET = 'add_pet',
	EDIT_PET = 'edit_pet',
	DELETE_PET = 'delete_pet',
	CREATE_MESSAGES = 'create_messages',
	VIEW_MESSAGES = 'view_messages',
	VIEW_APPLICATIONS = 'view_applications',
	ACTION_APPLICATIONS = 'action_applications',
}

export enum Role {
	ADMIN = 'admin',
	STAFF_MANAGER = 'staff_manager',
	PET_MANAGER = 'pet_manager',
	COMMUNICATIONS_MANAGER = 'communications_manager',
	APPLICATION_MANAGER = 'application_manager',
}

export const rolePermissions: Record<Role, Permission[]> = {
	[Role.ADMIN]: [
		Permission.VIEW_RESCUE_INFO,
		Permission.EDIT_RESCUE_INFO,
		Permission.DELETE_RESCUE,
		Permission.VIEW_STAFF,
		Permission.ADD_STAFF,
		Permission.EDIT_STAFF,
		Permission.VERIFY_STAFF,
		Permission.DELETE_STAFF,
		Permission.VIEW_PET,
		Permission.ADD_PET,
		Permission.EDIT_PET,
		Permission.DELETE_PET,
		Permission.CREATE_MESSAGES,
		Permission.VIEW_MESSAGES,
		Permission.VIEW_APPLICATIONS,
		Permission.ACTION_APPLICATIONS,
	],
	[Role.STAFF_MANAGER]: [
		Permission.VIEW_STAFF,
		Permission.ADD_STAFF,
		Permission.EDIT_STAFF,
		Permission.VERIFY_STAFF,
		Permission.DELETE_STAFF,
	],
	[Role.PET_MANAGER]: [
		Permission.VIEW_PET,
		Permission.ADD_PET,
		Permission.EDIT_PET,
		Permission.DELETE_PET,
	],
	[Role.COMMUNICATIONS_MANAGER]: [
		Permission.CREATE_MESSAGES,
		Permission.VIEW_MESSAGES,
	],
	[Role.APPLICATION_MANAGER]: [
		Permission.VIEW_APPLICATIONS,
		Permission.ACTION_APPLICATIONS,
	],
};
