export interface StaffMember {
  id: string;
  userId: string;
  rescueId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  isVerified: boolean;
  addedAt: string;
}

export interface NewStaffMember {
  userId: string;
  title?: string;
}

export interface StaffRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface StaffActivity {
  id: string;
  staffId: string;
  action: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Permission constants
export const STAFF_PERMISSIONS = {
  // Pet Management
  VIEW_PETS: 'view_pets',
  CREATE_PETS: 'create_pets',
  UPDATE_PETS: 'update_pets',
  DELETE_PETS: 'delete_pets',

  // Application Management
  VIEW_APPLICATIONS: 'view_applications',
  REVIEW_APPLICATIONS: 'review_applications',
  APPROVE_APPLICATIONS: 'approve_applications',
  REJECT_APPLICATIONS: 'reject_applications',

  // Staff Management
  VIEW_STAFF: 'view_staff',
  INVITE_STAFF: 'invite_staff',
  REMOVE_STAFF: 'remove_staff',
  MANAGE_ROLES: 'manage_roles',

  // Communication
  VIEW_MESSAGES: 'view_messages',
  SEND_MESSAGES: 'send_messages',
  MANAGE_TEMPLATES: 'manage_templates',

  // Analytics & Reports
  VIEW_ANALYTICS: 'view_analytics',
  EXPORT_DATA: 'export_data',

  // Rescue Settings
  MANAGE_RESCUE_SETTINGS: 'manage_rescue_settings',
  MANAGE_ADOPTION_POLICIES: 'manage_adoption_policies',
} as const;

export type StaffPermission = typeof STAFF_PERMISSIONS[keyof typeof STAFF_PERMISSIONS];

// Default roles
export const DEFAULT_ROLES: StaffRole[] = [
  {
    id: 'volunteer',
    name: 'Volunteer',
    description: 'Basic volunteer with limited access',
    permissions: [
      STAFF_PERMISSIONS.VIEW_PETS,
      STAFF_PERMISSIONS.VIEW_APPLICATIONS,
      STAFF_PERMISSIONS.VIEW_MESSAGES,
    ],
  },
  {
    id: 'staff',
    name: 'Staff Member',
    description: 'Regular staff member with pet and application management',
    permissions: [
      STAFF_PERMISSIONS.VIEW_PETS,
      STAFF_PERMISSIONS.CREATE_PETS,
      STAFF_PERMISSIONS.UPDATE_PETS,
      STAFF_PERMISSIONS.VIEW_APPLICATIONS,
      STAFF_PERMISSIONS.REVIEW_APPLICATIONS,
      STAFF_PERMISSIONS.VIEW_MESSAGES,
      STAFF_PERMISSIONS.SEND_MESSAGES,
      STAFF_PERMISSIONS.VIEW_STAFF,
    ],
  },
  {
    id: 'coordinator',
    name: 'Coordinator',
    description: 'Senior staff with approval and management capabilities',
    permissions: [
      STAFF_PERMISSIONS.VIEW_PETS,
      STAFF_PERMISSIONS.CREATE_PETS,
      STAFF_PERMISSIONS.UPDATE_PETS,
      STAFF_PERMISSIONS.DELETE_PETS,
      STAFF_PERMISSIONS.VIEW_APPLICATIONS,
      STAFF_PERMISSIONS.REVIEW_APPLICATIONS,
      STAFF_PERMISSIONS.APPROVE_APPLICATIONS,
      STAFF_PERMISSIONS.REJECT_APPLICATIONS,
      STAFF_PERMISSIONS.VIEW_MESSAGES,
      STAFF_PERMISSIONS.SEND_MESSAGES,
      STAFF_PERMISSIONS.MANAGE_TEMPLATES,
      STAFF_PERMISSIONS.VIEW_STAFF,
      STAFF_PERMISSIONS.INVITE_STAFF,
      STAFF_PERMISSIONS.VIEW_ANALYTICS,
    ],
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full administrative access to all features',
    permissions: Object.values(STAFF_PERMISSIONS),
  },
];
