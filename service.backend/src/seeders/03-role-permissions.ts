import Permission from '../models/Permission';
import Role from '../models/Role';
import RolePermission from '../models/RolePermission';

const rolePermissionMappings = {
  super_admin: [
    // Full access to everything
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'users.list',
    'users.profile.update',
    'pets.create',
    'pets.read',
    'pets.update',
    'pets.delete',
    'pets.list',
    'pets.archive',
    'pets.feature',
    'pets.publish',
    'applications.create',
    'applications.read',
    'applications.update',
    'applications.delete',
    'applications.list',
    'applications.approve',
    'applications.reject',
    'applications.review',
    'rescues.create',
    'rescues.read',
    'rescues.update',
    'rescues.delete',
    'rescues.list',
    'rescues.verify',
    'rescues.suspend',
    'chats.create',
    'chats.read',
    'chats.update',
    'chats.delete',
    'chats.moderate',
    'messages.create',
    'messages.read',
    'messages.update',
    'messages.delete',
    'messages.moderate',
    'ratings.create',
    'ratings.read',
    'ratings.update',
    'ratings.delete',
    'ratings.moderate',
    'admin.dashboard',
    'admin.reports',
    'admin.audit_logs',
    'admin.system_settings',
    'admin.feature_flags',
    'moderation.reports.review',
    'moderation.users.suspend',
    'moderation.content.moderate',
    'emails.templates.create',
    'emails.templates.update',
    'emails.templates.delete',
    'emails.send',
    'emails.queue.manage',
    'notifications.create',
    'notifications.read',
    'notifications.update',
    'notifications.delete',
  ],

  admin: [
    // Most admin permissions except super admin functions
    'users.read',
    'users.update',
    'users.list',
    'users.profile.update',
    'pets.create',
    'pets.read',
    'pets.update',
    'pets.delete',
    'pets.list',
    'pets.archive',
    'pets.feature',
    'pets.publish',
    'applications.read',
    'applications.update',
    'applications.list',
    'applications.approve',
    'applications.reject',
    'applications.review',
    'rescues.read',
    'rescues.update',
    'rescues.list',
    'rescues.verify',
    'rescues.suspend',
    'chats.read',
    'chats.moderate',
    'messages.read',
    'messages.moderate',
    'ratings.read',
    'ratings.moderate',
    'admin.dashboard',
    'admin.reports',
    'admin.audit_logs',
    'moderation.reports.review',
    'moderation.users.suspend',
    'moderation.content.moderate',
    'emails.templates.create',
    'emails.templates.update',
    'emails.send',
    'notifications.create',
    'notifications.read',
    'notifications.update',
  ],

  moderator: [
    'users.read',
    'users.list',
    'pets.read',
    'pets.list',
    'applications.read',
    'applications.list',
    'rescues.read',
    'rescues.list',
    'chats.read',
    'chats.moderate',
    'messages.read',
    'messages.moderate',
    'ratings.read',
    'ratings.moderate',
    'moderation.reports.review',
    'moderation.users.suspend',
    'moderation.content.moderate',
  ],

  rescue_admin: [
    // Staff Management for rescue team
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.delete',
    'staff.list',
    'staff.suspend',
    'users.profile.update',
    // Pet Management - full control
    'pets.create',
    'pets.read',
    'pets.update',
    'pets.delete',
    'pets.list',
    'pets.archive',
    'pets.feature',
    'pets.publish',
    // Application Management - full control
    'applications.read',
    'applications.update',
    'applications.list',
    'applications.approve',
    'applications.reject',
    'applications.review',
    // Rescue Management
    'rescues.read',
    'rescues.update',
    // Communication
    'chats.create',
    'chats.read',
    'chats.update',
    'messages.create',
    'messages.read',
    'messages.update',
    // Ratings
    'ratings.create',
    'ratings.read',
    // Admin functions needed for rescue management
    'admin.dashboard',
    'admin.reports',
    'admin.system_settings',
    // Email capabilities
    'emails.send',
    // Notifications
    'notifications.create',
    'notifications.read',
    'notifications.update',
  ],

  rescue_staff: [
    'staff.read',
    'staff.list',
    'users.profile.update',
    'pets.create',
    'pets.read',
    'pets.update',
    'pets.delete',
    'pets.list',
    'applications.read',
    'applications.update',
    'applications.list',
    'applications.review',
    'rescues.read',
    'chats.create',
    'chats.read',
    'chats.update',
    'messages.create',
    'messages.read',
    'messages.update',
    'ratings.create',
    'ratings.read',
    'notifications.read',
  ],

  rescue_volunteer: [
    'users.read',
    'users.profile.update',
    'pets.read',
    'pets.list',
    'applications.read',
    'applications.list',
    'rescues.read',
    'chats.read',
    'messages.read',
    'ratings.read',
    'notifications.read',
  ],

  adopter: [
    'users.profile.update',
    'pets.read',
    'pets.list',
    'applications.create',
    'applications.read',
    'applications.update',
    'chats.create',
    'chats.read',
    'chats.update',
    'messages.create',
    'messages.read',
    'messages.update',
    'ratings.create',
    'ratings.read',
    'notifications.read',
  ],

  verified_adopter: [
    'users.profile.update',
    'pets.read',
    'pets.list',
    'applications.create',
    'applications.read',
    'applications.update',
    'chats.create',
    'chats.read',
    'chats.update',
    'messages.create',
    'messages.read',
    'messages.update',
    'ratings.create',
    'ratings.read',
    'ratings.update',
    'notifications.read',
  ],
};

export async function seedRolePermissions() {
  let assignmentCount = 0;

  for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      console.warn(`⚠️  Role ${roleName} not found, skipping permission assignments`);
      continue;
    }

    for (const permissionName of permissionNames) {
      const permission = await Permission.findOne({ where: { permissionName: permissionName } });
      if (!permission) {
        console.warn(`⚠️  Permission ${permissionName} not found, skipping`);
        continue;
      }

      await RolePermission.findOrCreate({
        where: {
          roleId: role.roleId,
          permissionId: permission.permissionId,
        },
        defaults: {
          roleId: role.roleId,
          permissionId: permission.permissionId,
        },
      });
      assignmentCount++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${assignmentCount} role-permission assignments`);
}
