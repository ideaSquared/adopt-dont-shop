// Dev bulk-data seeder for the notifications.* schema.
//
// Floods notifications.notifications with in-app notifications addressed to the
// spam adopters, so the bell/inbox UI has volume. Gated via assertSpamAllowed.
//
// Idempotent: notification_id is deterministic (seededUuid) and the INSERT is
// ON CONFLICT DO NOTHING, so a re-run converges instead of piling on. Reads the
// (now deterministic) spam users cross-schema; run after the auth seeder via
// the `pnpm db:seed:dev` orchestrator.
//
// Volume: SPAM_NOTIFICATIONS (default 800).

import { createDbClient } from '@adopt-dont-shop/db';
import { createLogger } from '@adopt-dont-shop/observability';
import {
  assertSpamAllowed,
  bulkInsert,
  createSpamFaker,
  seededUuid,
  spamCount,
} from '@adopt-dont-shop/seed-faker';

import { loadConfig } from '../config.js';

type Faker = ReturnType<typeof createSpamFaker>;
export type QueryFn = (text: string, values: readonly unknown[]) => Promise<unknown>;

// Realistic in-app notification copy per type (title + message).
const CONTENT: Record<string, { title: string; message: string }> = {
  application_status: {
    title: 'Your application has an update',
    message: 'A rescue has moved your adoption application to the next stage.',
  },
  message_received: {
    title: 'New message',
    message: 'You have a new message from a rescue about a pet you enquired about.',
  },
  pet_available: {
    title: 'A pet matching your search is available',
    message: 'A new pet matching your preferences has just been listed for adoption.',
  },
  adoption_approved: {
    title: 'Adoption approved!',
    message: 'Congratulations — your adoption application has been approved.',
  },
  system_announcement: {
    title: 'Welcome to Adopt Don’t Shop',
    message: 'Complete your profile to get better matches with pets near you.',
  },
  reminder: {
    title: 'Reminder',
    message: 'You have a pending action on one of your adoption applications.',
  },
};
const TYPES = Object.keys(CONTENT);
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

const row = (faker: Faker, index: number, userId: string, now: Date): readonly unknown[] => {
  const status = faker.helpers.arrayElement(STATUS_BAG);
  const type = faker.helpers.arrayElement(TYPES);
  const { title, message } = CONTENT[type];
  return [
    seededUuid(`notification-${index}`),
    userId,
    type,
    'in_app',
    status,
    title,
    message,
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
  const rows = Array.from({ length: deps.notifications }, (_, i) =>
    row(deps.faker, i, deps.faker.helpers.arrayElement(deps.userIds), now)
  );
  await bulkInsert(
    { query: deps.query },
    'notifications.notifications',
    COLUMNS,
    rows,
    500,
    'ON CONFLICT (notification_id) DO NOTHING'
  );
  return { notifications: deps.notifications };
};

// Orchestration over injected seams so the cross-schema read + count logic is
// testable without a real pool.
export const runSpam = async (deps: {
  query: QueryFn;
  faker: Faker;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}): Promise<{ notifications: number }> => {
  const users = (await deps.query(
    `SELECT user_id FROM auth.users WHERE email LIKE '%@example.test'`,
    []
  )) as { rows: { user_id: string }[] };
  const userIds = users.rows.map(r => r.user_id);
  if (userIds.length === 0) {
    throw new Error('no spam users found — run the auth spam first');
  }
  const notifications = spamCount('NOTIFICATIONS', 800);
  deps.log?.('spamming notifications', { notifications, users: userIds.length });
  return spamNotifications({ query: deps.query, faker: deps.faker, notifications, userIds });
};

const main = async (): Promise<void> => {
  const logger = createLogger({ serviceName: 'service.notifications.spam' });
  assertSpamAllowed();
  const config = loadConfig();
  const pool = createDbClient({ connectionString: config.databaseUrl, schema: config.schema });
  try {
    const result = await runSpam({
      query: (text, values) => pool.query(text, values as unknown[]),
      faker: createSpamFaker(),
      log: (message, meta) => logger.info(message, meta),
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
