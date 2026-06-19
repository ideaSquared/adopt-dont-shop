// Dev-only bulk-data ('spam') seeder for the notifications.* schema.
//
// Floods notifications.notifications with faker in-app notifications addressed
// to the spam adopters, so the bell/inbox UI has volume. MANUAL + gated via
// assertSpamAllowed. Additive (fresh UUIDs per run).
//
// Cross-schema read (dev-only god-access): user_ids from auth.users restricted
// to the spam adopters.
//
// Volume: SPAM_NOTIFICATIONS (default 800).

import { randomUUID } from 'node:crypto';

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

const TYPES = [
  'application_status',
  'message_received',
  'pet_available',
  'adoption_approved',
  'system_announcement',
  'reminder',
];
// Mix of read and unread so the unread badge has something to show.
const STATUS_BAG = [...Array<string>(60).fill('read'), ...Array<string>(40).fill('delivered')];

const COLUMNS = [
  'notification_id',
  'user_id',
  'type',
  'channel',
  'status',
  'title',
  'message',
  'read_at',
  'created_at',
  'updated_at',
] as const;

const row = (faker: Faker, userId: string, now: Date): readonly unknown[] => {
  const status = faker.helpers.arrayElement(STATUS_BAG);
  return [
    randomUUID(),
    userId,
    faker.helpers.arrayElement(TYPES),
    'in_app',
    status,
    faker.lorem.sentence({ min: 3, max: 6 }),
    faker.lorem.sentence(),
    status === 'read' ? now : null,
    now,
    now,
  ];
};

export const spamNotifications = async (deps: {
  query: QueryFn;
  faker: Faker;
  notifications: number;
  userIds: readonly string[];
}): Promise<{ notifications: number }> => {
  const now = new Date();
  const rows = Array.from({ length: deps.notifications }, () =>
    row(deps.faker, deps.faker.helpers.arrayElement(deps.userIds), now)
  );
  await bulkInsert({ query: deps.query }, 'notifications.notifications', COLUMNS, rows);
  return { notifications: deps.notifications };
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.notifications.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const query: QueryFn = (text, values) => pool.query(text, values as unknown[]);
    const users = (await query(
      `SELECT user_id FROM auth.users WHERE email LIKE '%@example.test'`,
      []
    )) as { rows: { user_id: string }[] };
    const userIds = users.rows.map(r => r.user_id);
    if (userIds.length === 0) {
      throw new Error('no spam users found — run the auth spam first');
    }
    const notifications = spamCount('NOTIFICATIONS', 800);
    logger.info('spamming notifications', { notifications, users: userIds.length });
    const result = await spamNotifications({
      query,
      faker: createSpamFaker(),
      notifications,
      userIds,
    });
    logger.info('notifications spam complete', result);
  } catch (err) {
    logger.error('notifications spam failed', {
      message: (err as Error)?.message,
      stack: (err as Error)?.stack,
    });
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
