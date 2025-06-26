import sequelize from '../sequelize';
import { seedPermissions } from './01-permissions';
import { seedRoles } from './02-roles';
import { seedRolePermissions } from './03-role-permissions';
import { seedUsers } from './04-users';
import { seedUserRoles } from './05-user-roles';
import { seedRescues } from './06-rescues';
import { seedFeatureFlags } from './07-feature-flags';
import { seedPets } from './08-pets';
import { seedApplications } from './09-applications';
import { seedChats } from './10-chats';
import { seedMessages } from './11-messages';
import { seedNotifications } from './12-notifications';
import { seedRatings } from './13-ratings';
import { seedEmailTemplates } from './14-email-templates';

const seeders = [
  { name: 'Permissions', seeder: seedPermissions },
  { name: 'Roles', seeder: seedRoles },
  { name: 'Role Permissions', seeder: seedRolePermissions },
  { name: 'Users', seeder: seedUsers },
  { name: 'User Roles', seeder: seedUserRoles },
  { name: 'Rescues', seeder: seedRescues },
  { name: 'Feature Flags', seeder: seedFeatureFlags },
  { name: 'Pets', seeder: seedPets },
  { name: 'Applications', seeder: seedApplications },
  { name: 'Chats', seeder: seedChats },
  { name: 'Messages', seeder: seedMessages },
  { name: 'Notifications', seeder: seedNotifications },
  { name: 'Ratings', seeder: seedRatings },
  { name: 'Email Templates', seeder: seedEmailTemplates },
];

export async function runAllSeeders() {
  try {
    console.log('🌱 Starting database seeding...');
    console.log(`📊 Running ${seeders.length} seeders in sequence...`);

    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    for (let i = 0; i < seeders.length; i++) {
      const { name, seeder } = seeders[i];
      console.log(`📦 [${i + 1}/${seeders.length}] Seeding ${name}...`);
      const startTime = Date.now();

      await seeder();

      const duration = Date.now() - startTime;
      console.log(`✅ ${name} seeded successfully (${duration}ms)`);
    }

    console.log('🎉 All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

export async function clearAllData() {
  try {
    console.log('🧹 Clearing all seeded data...');

    // Clear in reverse order to handle foreign key constraints
    const clearOrder = [
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
      console.log(`✅ Cleared ${tableName}`);
    }

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
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    runAllSeeders()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}
