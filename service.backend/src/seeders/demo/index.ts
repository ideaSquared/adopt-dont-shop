/**
 * Demo data — Faker-generated, env-guarded, dev/staging/test only.
 *
 * runDemoSeeders is the single entry point. New demo seeders register
 * themselves in DEMO_SEEDERS in dependency order. Each seeder is responsible
 * for being idempotent on its own keys (bulkCreate ignoreDuplicates).
 *
 * Volume targets (per design doc §7) reachable with default env:
 *   adopters 200, rescues 20, staff 60, pets 800, applications 1500,
 *   chats 600, messages 8000, ratings 400, notifications 3000.
 *
 * Each individual count is overridable via env (DEMO_<ENTITY>_COUNT).
 */

import { assertSeedAllowed } from '../lib/env-guard';
import { seedDemoApplications } from './applications-faker';
import { seedDemoChats } from './chats-faker';
import { seedDemoMessages } from './messages-faker';
import { seedDemoNotifications } from './notifications-faker';
import { seedDemoPets } from './pets-faker';
import { seedDemoRatings } from './ratings-faker';
import { seedDemoRescues } from './rescues-faker';
import { seedDemoStaff } from './staff-faker';
import { seedDemoUsers } from './users-faker';

type DemoSeeder = { name: string; seeder: () => Promise<void> };

// Order: users + rescues → staff (needs both) → pets (needs rescues) →
// applications (needs adopters + pets) → chats (needs apps + staff) →
// messages (needs chats) → ratings + notifications (need users + rescues).
const DEMO_SEEDERS: DemoSeeder[] = [
  { name: 'Demo Users (Faker)', seeder: seedDemoUsers },
  { name: 'Demo Rescues (Faker)', seeder: seedDemoRescues },
  { name: 'Demo Staff (Faker)', seeder: seedDemoStaff },
  { name: 'Demo Pets (Faker)', seeder: seedDemoPets },
  { name: 'Demo Applications (Faker)', seeder: seedDemoApplications },
  { name: 'Demo Chats (Faker)', seeder: seedDemoChats },
  { name: 'Demo Messages (Faker)', seeder: seedDemoMessages },
  { name: 'Demo Ratings (Faker)', seeder: seedDemoRatings },
  { name: 'Demo Notifications (Faker)', seeder: seedDemoNotifications },
];

export async function runDemoSeeders(): Promise<void> {
  assertSeedAllowed('demo');

  for (let i = 0; i < DEMO_SEEDERS.length; i++) {
    const { name, seeder } = DEMO_SEEDERS[i];

    console.log(`🎭 [${i + 1}/${DEMO_SEEDERS.length}] Demo: ${name}...`);
    const start = Date.now();
    await seeder();

    console.log(`✅ ${name} ready (${Date.now() - start}ms)`);
  }
}

export {
  seedDemoUsers,
  seedDemoRescues,
  seedDemoStaff,
  seedDemoPets,
  seedDemoApplications,
  seedDemoChats,
  seedDemoMessages,
  seedDemoRatings,
  seedDemoNotifications,
};
