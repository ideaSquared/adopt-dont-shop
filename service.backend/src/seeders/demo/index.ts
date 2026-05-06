/**
 * Demo data — Faker-generated, env-guarded, dev/staging/test only.
 *
 * runDemoSeeders is the single entry point. New demo seeders register
 * themselves in DEMO_SEEDERS in dependency order. Each seeder is responsible
 * for being idempotent on its own keys (bulkCreate ignoreDuplicates).
 *
 * Step 5 lands the foundational seeder (Faker adopters, default volume 200);
 * pets / applications / chats / messages will migrate in follow-up commits.
 */

import { assertSeedAllowed } from '../lib/env-guard';
import { seedDemoUsers } from './users-faker';

type DemoSeeder = { name: string; seeder: () => Promise<void> };

const DEMO_SEEDERS: DemoSeeder[] = [{ name: 'Demo Users (Faker)', seeder: seedDemoUsers }];

export async function runDemoSeeders(): Promise<void> {
  assertSeedAllowed('demo');

  for (let i = 0; i < DEMO_SEEDERS.length; i++) {
    const { name, seeder } = DEMO_SEEDERS[i];
    // eslint-disable-next-line no-console
    console.log(`🎭 [${i + 1}/${DEMO_SEEDERS.length}] Demo: ${name}...`);
    const start = Date.now();
    await seeder();
    // eslint-disable-next-line no-console
    console.log(`✅ ${name} ready (${Date.now() - start}ms)`);
  }
}

export { seedDemoUsers };
