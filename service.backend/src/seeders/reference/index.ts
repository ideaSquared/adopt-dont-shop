/**
 * Reference data: permissions, roles, role-permissions, email templates,
 * application questions. Idempotent and safe in any environment, including
 * production. Each underlying seeder uses findOrCreate (or equivalent) so
 * re-running is a no-op.
 */

import { assertSeedAllowed } from '../lib/env-guard';
import { seedPermissions } from './permissions';
import { seedRoles } from './roles';
import { seedRolePermissions } from './role-permissions';
import { seedEmailTemplates } from './email-templates';
import { seedApplicationQuestions } from './application-questions';

type ReferenceSeeder = { name: string; seeder: () => Promise<unknown> };

const REFERENCE_SEEDERS: ReferenceSeeder[] = [
  { name: 'Permissions', seeder: seedPermissions },
  { name: 'Roles', seeder: seedRoles },
  { name: 'Role Permissions', seeder: seedRolePermissions },
  { name: 'Email Templates', seeder: seedEmailTemplates },
  { name: 'Application Questions', seeder: seedApplicationQuestions },
];

export async function runReferenceSeeders(): Promise<void> {
  assertSeedAllowed('reference');

  for (let i = 0; i < REFERENCE_SEEDERS.length; i++) {
    const { name, seeder } = REFERENCE_SEEDERS[i];
    // eslint-disable-next-line no-console
    console.log(`📚 [${i + 1}/${REFERENCE_SEEDERS.length}] Reference: ${name}...`);
    const start = Date.now();
    await seeder();
    // eslint-disable-next-line no-console
    console.log(`✅ ${name} ready (${Date.now() - start}ms)`);
  }
}

export {
  seedPermissions,
  seedRoles,
  seedRolePermissions,
  seedEmailTemplates,
  seedApplicationQuestions,
};
