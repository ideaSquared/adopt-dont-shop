/**
 * Deterministic test fixtures (e2e accounts, scripted Emily conversations,
 * attachment-test data, test notifications).
 *
 * Properties:
 *   - Stable IDs / @e2e.test domains so tests can address records directly.
 *   - Composable — runFixtureSeeders can be called from test setup, the new
 *     CLI, or via the legacy runAllSeeders entry point.
 *   - Env-gated via assertSeedAllowed('fixtures').
 *
 * Fixtures depend on reference data and (for Emily conversations) on the
 * canonical demo users / rescues — load reference + demo first when running
 * fixtures alongside them.
 */

import { assertSeedAllowed } from '../lib/env-guard';
import { seedEmilyConversation } from './emily-conversation';
import { seedEmilyConversation2 } from './emily-conversation-2';
import { seedEmilyConversation3 } from './emily-conversation-3';
import { seedEmilyConversation4 } from './emily-conversation-4';
import { seedEmilyAttachmentTest } from './emily-attachment-test';
import { seedEmilyTestNotifications } from './emily-test-notifications';
import { seedE2EFixtures } from './e2e-fixtures';

type Fixture = { name: string; seeder: () => Promise<unknown> };

const FIXTURES: Fixture[] = [
  { name: 'Emily Conversation', seeder: seedEmilyConversation },
  { name: 'Emily Conversation 2', seeder: seedEmilyConversation2 },
  { name: 'Emily Conversation 3', seeder: seedEmilyConversation3 },
  { name: 'Emily Conversation 4', seeder: seedEmilyConversation4 },
  { name: 'Emily Attachment Test', seeder: seedEmilyAttachmentTest },
  { name: 'Emily Test Notifications', seeder: seedEmilyTestNotifications },
  { name: 'E2E Fixtures', seeder: seedE2EFixtures },
];

export async function runFixtureSeeders(): Promise<void> {
  assertSeedAllowed('fixtures');

  for (let i = 0; i < FIXTURES.length; i++) {
    const { name, seeder } = FIXTURES[i];

    console.log(`📦 [${i + 1}/${FIXTURES.length}] Loading fixture: ${name}...`);
    const start = Date.now();
    await seeder();

    console.log(`✅ ${name} loaded (${Date.now() - start}ms)`);
  }
}

export {
  seedEmilyConversation,
  seedEmilyConversation2,
  seedEmilyConversation3,
  seedEmilyConversation4,
  seedEmilyAttachmentTest,
  seedEmilyTestNotifications,
  seedE2EFixtures,
};
