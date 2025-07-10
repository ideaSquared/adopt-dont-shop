import sequelize from '../sequelize';
import { seedPermissions } from './01-permissions';
import { seedRoles } from './02-roles';
import { seedRolePermissions } from './03-role-permissions';
import { seedUsers } from './04-users';
import { seedUserRoles } from './05-user-roles';
import { seedRescues } from './06-rescues';
import { seedStaffMembers } from './06.5-staff-members';
import { seedFeatureFlags } from './07-feature-flags';
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

const seeders = [
  { name: 'Permissions', seeder: seedPermissions },
  { name: 'Roles', seeder: seedRoles },
  { name: 'Role Permissions', seeder: seedRolePermissions },
  { name: 'Users', seeder: seedUsers },
  { name: 'User Roles', seeder: seedUserRoles },
  { name: 'Rescues', seeder: seedRescues },
  { name: 'Staff Members', seeder: seedStaffMembers },
  { name: 'Feature Flags', seeder: seedFeatureFlags },
  { name: 'Pets', seeder: seedPets },
  { name: 'Applications', seeder: seedApplications },
  { name: 'Chats', seeder: seedChats },
  { name: 'Messages', seeder: seedMessages },
  { name: 'Notifications', seeder: seedNotifications },
  { name: 'Ratings', seeder: seedRatings },
  { name: 'Email Templates', seeder: seedEmailTemplates },
  { name: 'Emily Conversation', seeder: seedEmilyConversation },
  { name: 'Swipe Sessions', seeder: () => seedSwipeSessions(sequelize.getQueryInterface()) },
  { name: 'Swipe Actions', seeder: () => seedSwipeActions(sequelize.getQueryInterface()) },
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
      'swipe_actions',
      'swipe_sessions',
      'messages',
      'chat_participants',
      'chats',
      'notifications',
      'ratings',
      'applications',
      'pets',
      'user_roles',
      'role_permissions',
      'users',
      'rescues',
      'roles',
      'permissions',
      'feature_flags',
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
