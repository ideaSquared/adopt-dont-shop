import Permission from '../models/Permission';

const permissions = [
  // User Management
  'users.create',
  'users.read',
  'users.update',
  'users.delete',
  'users.list',
  'users.profile.update',

  // Staff Management (rescue-specific)
  'staff.create',
  'staff.read',
  'staff.update',
  'staff.delete',
  'staff.list',
  'staff.suspend',

  // Pet Management
  'pets.create',
  'pets.read',
  'pets.update',
  'pets.delete',
  'pets.list',
  'pets.archive',
  'pets.feature',
  'pets.publish',

  // Application Management
  'applications.create',
  'applications.read',
  'applications.update',
  'applications.delete',
  'applications.list',
  'applications.approve',
  'applications.reject',
  'applications.review',

  // Rescue Management
  'rescues.create',
  'rescues.read',
  'rescues.update',
  'rescues.delete',
  'rescues.list',
  'rescues.verify',
  'rescues.suspend',

  // Chat Management
  'chats.create',
  'chats.read',
  'chats.update',
  'chats.delete',
  'chats.moderate',

  // Message Management
  'messages.create',
  'messages.read',
  'messages.update',
  'messages.delete',
  'messages.moderate',

  // Rating Management
  'ratings.create',
  'ratings.read',
  'ratings.update',
  'ratings.delete',
  'ratings.moderate',

  // Admin Functions
  'admin.dashboard',
  'admin.reports',
  'admin.audit_logs',
  'admin.system_settings',
  'admin.feature_flags',

  // Moderation
  'moderation.reports.review',
  'moderation.users.suspend',
  'moderation.content.moderate',

  // Email Management
  'emails.templates.create',
  'emails.templates.update',
  'emails.templates.delete',
  'emails.send',
  'emails.queue.manage',

  // Notifications
  'notifications.create',
  'notifications.read',
  'notifications.update',
  'notifications.delete',

  // Support Ticket Management
  'support_tickets.create',
  'support_tickets.read',
  'support_tickets.update',
  'support_tickets.delete',
  'support_tickets.list',
  'support_tickets.assign',
  'support_tickets.escalate',
  'support_tickets.reply',
  'support_tickets.manage_own',

  // Admin Management (expanded)
  'admin.metrics.read',
  'admin.analytics.read',
  'admin.system.health.read',
  'admin.config.read',
  'admin.config.update',
  'admin.users.search',
  'admin.users.read',
  'admin.users.update',
  'admin.users.role.update',
  'admin.users.deactivate',
  'admin.users.reactivate',
  'admin.users.bulk_update',
  'admin.rescues.manage',
  'admin.audit.read',
  'admin.data.export',

  // Moderation (expanded)
  'moderation.reports.read',
  'moderation.reports.create',
  'moderation.reports.update',
  'moderation.reports.assign',
  'moderation.reports.escalate',
  'moderation.reports.bulk_update',
  'moderation.actions.create',
  'moderation.actions.read',
  'moderation.metrics.read',

  // Chat Analytics
  'chat.analytics.read',

  // Notifications (expanded)
  'notifications.bulk_create',
  'notifications.cleanup',
];

export async function seedPermissions() {
  for (const permissionName of permissions) {
    await Permission.findOrCreate({
      where: { permissionName: permissionName },
      defaults: {
        permissionName: permissionName,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Created ${permissions.length} permissions`);
}
