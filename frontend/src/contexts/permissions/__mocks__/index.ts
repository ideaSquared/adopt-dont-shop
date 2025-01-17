export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  USER = 'USER',
}

export enum Permission {
  CREATE_PET = 'CREATE_PET',
  UPDATE_PET = 'UPDATE_PET',
  DELETE_PET = 'DELETE_PET',
  VIEW_PETS = 'VIEW_PETS',
  MANAGE_USERS = 'MANAGE_USERS',
}

export const usePermissions = jest.fn().mockReturnValue({
  hasRole: jest.fn().mockReturnValue(true),
  hasPermission: jest.fn().mockReturnValue(true),
  roles: [Role.USER],
  permissions: [Permission.VIEW_PETS],
})
