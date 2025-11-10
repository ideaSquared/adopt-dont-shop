import sequelize from '../sequelize';
import { seedPermissions } from './01-permissions';
import { seedRoles } from './02-roles';
import { seedRolePermissions } from './03-role-permissions';
import { seedUsers } from './04-users';
import { seedUserRoles } from './05-user-roles';
import { seedRescues } from './06-rescues';
import { seedStaffMembers } from './06.5-staff-members';
import { seedPets } from './08-pets';
import { seedApplications } from './09-applications';
import { seedChats } from './10-chats';
import { seedMessages } from './11-messages';
import { seedNotifications } from './12-notifications';
import { seedRatings } from './13-ratings';
import { seedEmailTemplates } from './14-email-templates';
import { up as seedSwipeSessions } from './15-swipe-sessions';
import { up as seedSwipeActions } from './16-swipe-actions';
import { seedEmilyConversation } from './17-emily-conversation';
import { seedEmilyConversation2 } from './19-emily-conversation-2';
import { seedEmilyAttachmentTest } from './20-emily-attachment-test';
import { seedEmilyConversation3 } from './20-emily-conversation-3';
import { seedFileUploads } from './20250111-file-uploads-seeder';
import { seedEmilyConversation4 } from './21-emily-conversation-4';
import { seedHomeVisits } from './22-home-visits';
import { seedApplicationTimeline } from './23-application-timeline';
import { seedInvitations } from './24-invitations';
import { seedSupportTickets } from './25-support-tickets';
import { seedReports } from './26-reports';
import { seedModeratorActions } from './27-moderator-actions';
import { seedUserSanctions } from './28-user-sanctions';
import { up as seedAuditLogs } from './29-audit-logs';

const seeders = [
  { name: 'Permissions', seeder: seedPermissions },
  { name: 'Roles', seeder: seedRoles },
  { name: 'Role Permissions', seeder: seedRolePermissions },
  { name: 'Users', seeder: seedUsers },
  { name: 'User Roles', seeder: seedUserRoles },
  { name: 'Rescues', seeder: seedRescues },
  { name: 'Staff Members', seeder: seedStaffMembers },
  { name: 'Invitations', seeder: seedInvitations },
  { name: 'Support Tickets', seeder: seedSupportTickets },
  { name: 'Reports', seeder: seedReports },
  { name: 'Moderator Actions', seeder: seedModeratorActions },
  { name: 'User Sanctions', seeder: seedUserSanctions },
  { name: 'Pets', seeder: seedPets },
  { name: 'Applications', seeder: seedApplications },
  { name: 'Home Visits', seeder: seedHomeVisits },
  { name: 'Application Timeline', seeder: seedApplicationTimeline },
  { name: 'Chats', seeder: seedChats },
  { name: 'Messages', seeder: seedMessages },
  { name: 'File Uploads', seeder: seedFileUploads },
  { name: 'Notifications', seeder: seedNotifications },
  { name: 'Ratings', seeder: seedRatings },
  { name: 'Email Templates', seeder: seedEmailTemplates },
  { name: 'Emily Conversation', seeder: seedEmilyConversation },
  { name: 'Emily Conversation 2', seeder: seedEmilyConversation2 },
  { name: 'Emily Conversation 3', seeder: seedEmilyConversation3 },
  { name: 'Emily Conversation 4', seeder: seedEmilyConversation4 },
  { name: 'Emily Attachment Test', seeder: seedEmilyAttachmentTest },
  { name: 'Swipe Sessions', seeder: () => seedSwipeSessions(sequelize.getQueryInterface()) },
  { name: 'Swipe Actions', seeder: () => seedSwipeActions(sequelize.getQueryInterface()) },
  { name: 'Audit Logs', seeder: seedAuditLogs },
];

export async function runAllSeeders() {
  try {
    // eslint-disable-next-line no-console
    console.log('🌱 Starting database seeding...');
    // eslint-disable-next-line no-console
    console.log(`📊 Running ${seeders.length} seeders in sequence...`);

    // Ensure database connection
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('✅ Database connection established');

    for (let i = 0; i < seeders.length; i++) {
      const { name, seeder } = seeders[i];
      // eslint-disable-next-line no-console
      console.log(`📦 [${i + 1}/${seeders.length}] Seeding ${name}...`);
      const startTime = Date.now();

      await seeder();

      const duration = Date.now() - startTime;
      // eslint-disable-next-line no-console
      console.log(`✅ ${name} seeded successfully (${duration}ms)`);
    }

    // eslint-disable-next-line no-console
    console.log('🎉 All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

export async function clearAllData() {
  try {
    // eslint-disable-next-line no-console
    console.log('🧹 Clearing all seeded data...');

    // Clear in reverse order to handle foreign key constraints
    const clearOrder = [
      'audit_logs',
      'swipe_actions',
      'swipe_sessions',
      'messages',
      'chat_participants',
      'chats',
      'notifications',
      'ratings',
      'home_visits',
      'user_sanctions',
      'moderator_actions',
      'reports',
      'support_tickets',
      'invitations',
      'staff_members',
      'applications',
      'pets',
      'user_roles',
      'role_permissions',
      'users',
      'rescues',
      'roles',
      'permissions',
      'email_templates',
      'email_queue',
      'email_preferences',
    ];

    for (const tableName of clearOrder) {
      await sequelize.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE;`);
      // eslint-disable-next-line no-console
      console.log(`✅ Cleared ${tableName}`);
    }

    // eslint-disable-next-line no-console
    console.log('🎉 All data cleared successfully!');
  } catch (error) {
    console.error('❌ Error during data clearing:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'clear') {
    clearAllData()
      // eslint-disable-next-line no-process-exit
      .then(() => process.exit(0))
      // eslint-disable-next-line no-process-exit
      .catch(() => process.exit(1));
  } else {
    runAllSeeders()
      // eslint-disable-next-line no-process-exit
      .then(() => process.exit(0))
      // eslint-disable-next-line no-process-exit
      .catch(() => process.exit(1));
  }
}
