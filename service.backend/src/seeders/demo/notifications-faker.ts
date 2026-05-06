import Notification, {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '../../models/Notification';
import User from '../../models/User';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_NOTIFICATION_COUNT = 3000;

const TYPE_TITLE: Record<NotificationType, string> = {
  [NotificationType.APPLICATION_STATUS]: 'Your application status has changed',
  [NotificationType.MESSAGE_RECEIVED]: 'You have a new message',
  [NotificationType.PET_AVAILABLE]: 'A pet you favorited is now available',
  [NotificationType.INTERVIEW_SCHEDULED]: 'Interview scheduled',
  [NotificationType.HOME_VISIT_SCHEDULED]: 'Home visit scheduled',
  [NotificationType.ADOPTION_APPROVED]: 'Your adoption was approved!',
  [NotificationType.ADOPTION_REJECTED]: 'Update on your adoption application',
  [NotificationType.REFERENCE_REQUEST]: 'A reference request',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: 'System announcement',
  [NotificationType.ACCOUNT_SECURITY]: 'Account security update',
  [NotificationType.REMINDER]: 'Reminder',
  [NotificationType.MARKETING]: 'New pets matching your preferences',
  [NotificationType.RESCUE_INVITATION]: 'Invitation to join a rescue',
  [NotificationType.STAFF_ASSIGNMENT]: 'You have been assigned a new task',
  [NotificationType.PET_UPDATE]: 'Pet profile updated',
  [NotificationType.FOLLOW_UP]: 'Follow-up check-in',
};

const TYPE_BAG: NotificationType[] = (() => {
  const bag: NotificationType[] = [];
  for (let i = 0; i < 30; i++) {
    bag.push(NotificationType.MESSAGE_RECEIVED);
  }
  for (let i = 0; i < 20; i++) {
    bag.push(NotificationType.APPLICATION_STATUS);
  }
  for (let i = 0; i < 15; i++) {
    bag.push(NotificationType.PET_AVAILABLE);
  }
  for (let i = 0; i < 10; i++) {
    bag.push(NotificationType.REMINDER);
  }
  for (let i = 0; i < 8; i++) {
    bag.push(NotificationType.MARKETING);
  }
  for (let i = 0; i < 5; i++) {
    bag.push(NotificationType.HOME_VISIT_SCHEDULED);
  }
  for (let i = 0; i < 5; i++) {
    bag.push(NotificationType.SYSTEM_ANNOUNCEMENT);
  }
  for (let i = 0; i < 4; i++) {
    bag.push(NotificationType.PET_UPDATE);
  }
  for (let i = 0; i < 3; i++) {
    bag.push(NotificationType.ADOPTION_APPROVED);
  }
  return bag;
})();

const targetCount = (): number => {
  const raw = process.env.DEMO_NOTIFICATION_COUNT;
  if (raw === undefined) {
    return DEFAULT_NOTIFICATION_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_NOTIFICATION_COUNT;
};

export async function seedDemoNotifications(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const users = await User.findAll({ paranoid: false, attributes: ['userId'] });
  if (users.length === 0) {
    // eslint-disable-next-line no-console
    console.log('⚠️  No users — skipping notifications');
    return;
  }

  const existing = await Notification.count({ paranoid: false });
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const rows = Array.from({ length: toCreate }, () => {
    const type = ukFaker.helpers.arrayElement(TYPE_BAG);
    const created = ukFaker.date.past({ years: 1 });
    const status = ukFaker.helpers.arrayElement([
      NotificationStatus.READ,
      NotificationStatus.READ,
      NotificationStatus.READ,
      NotificationStatus.DELIVERED,
      NotificationStatus.DELIVERED,
      NotificationStatus.SENT,
    ]);
    const sentAt = created;
    const readAt =
      status === NotificationStatus.READ
        ? ukFaker.date.between({ from: created, to: new Date() })
        : null;
    return {
      notification_id: ukFaker.string.uuid(),
      user_id: ukFaker.helpers.arrayElement(users).userId,
      type,
      channel: ukFaker.helpers.arrayElement([
        NotificationChannel.IN_APP,
        NotificationChannel.IN_APP,
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
      ]),
      priority: ukFaker.helpers.arrayElement([
        NotificationPriority.LOW,
        NotificationPriority.NORMAL,
        NotificationPriority.NORMAL,
        NotificationPriority.NORMAL,
        NotificationPriority.HIGH,
      ]),
      status,
      title: TYPE_TITLE[type],
      message: ukFaker.lorem.sentence({ min: 8, max: 18 }),
      sent_at: sentAt,
      delivered_at: sentAt,
      read_at: readAt,
      retry_count: 0,
      max_retries: 3,
      created_at: created,
      updated_at: readAt ?? created,
    };
  });

  await bulkInsert(Notification, rows, { chunkSize: 1000 });

  // eslint-disable-next-line no-console
  console.log(`✅ Inserted ${rows.length} faker-generated notifications (target ${target})`);
}
