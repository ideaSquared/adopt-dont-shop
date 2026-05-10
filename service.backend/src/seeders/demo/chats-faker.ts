import Chat from '../../models/Chat';
import { ChatParticipant } from '../../models/ChatParticipant';
import StaffMember from '../../models/StaffMember';
import User, { UserType } from '../../models/User';
import Application from '../../models/Application';
import { ChatStatus, ParticipantRole } from '../../types/chat';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_CHAT_COUNT = 600;

const targetCount = (): number => {
  const raw = process.env.DEMO_CHAT_COUNT;
  if (raw === undefined) {
    return DEFAULT_CHAT_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CHAT_COUNT;
};

export async function seedDemoChats(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  // Each chat needs an adopter (the requester) and a rescue staff member
  // representing the rescue. We anchor chats to demo applications when
  // possible so chats have realistic context.
  const applications = await Application.findAll({
    paranoid: false,
    attributes: ['applicationId', 'userId', 'rescueId', 'petId'],
    limit: 2000,
  });
  const staff = await StaffMember.findAll({ paranoid: false, attributes: ['userId', 'rescueId'] });
  const adopters = await User.findAll({
    paranoid: false,
    where: { userType: UserType.ADOPTER },
    attributes: ['userId'],
    limit: 500,
  });

  if (applications.length === 0 || staff.length === 0 || adopters.length === 0) {
    console.log('⚠️  Need applications + staff + adopters for chats — skipping');
    return;
  }

  const staffByRescue = new Map<string, string[]>();
  for (const s of staff) {
    const list = staffByRescue.get(s.rescueId) ?? [];
    list.push(s.userId);
    staffByRescue.set(s.rescueId, list);
  }

  const existing = await Chat.count();
  const toCreate = Math.max(0, target - existing);
  if (toCreate === 0) {
    return;
  }

  const chatRows: Array<{
    chat_id: string;
    application_id: string;
    rescue_id: string;
    pet_id: string;
    status: ChatStatus;
    created_at: Date;
    updated_at: Date;
  }> = [];
  const participantRows: Array<{
    chat_participant_id: string;
    chat_id: string;
    participant_id: string;
    role: ParticipantRole;
    rescue_id?: string | null;
    last_read_at: Date;
  }> = [];

  for (let i = 0; i < toCreate; i++) {
    const app = ukFaker.helpers.arrayElement(applications);
    const staffPool = staffByRescue.get(app.rescueId);
    if (!staffPool || staffPool.length === 0) {
      // No staff for this rescue — skip; we only build chats we can fully wire
      continue;
    }
    const rescueUserId = ukFaker.helpers.arrayElement(staffPool);
    const created = ukFaker.date.past({ years: 1 });
    const chatId = ukFaker.string.uuid();
    const status = ukFaker.helpers.arrayElement([
      ChatStatus.ACTIVE,
      ChatStatus.ACTIVE,
      ChatStatus.ACTIVE,
      ChatStatus.LOCKED,
      ChatStatus.ARCHIVED,
    ]);

    chatRows.push({
      chat_id: chatId,
      application_id: app.applicationId,
      rescue_id: app.rescueId,
      pet_id: app.petId,
      status,
      created_at: created,
      updated_at: created,
    });

    participantRows.push({
      chat_participant_id: ukFaker.string.uuid(),
      chat_id: chatId,
      participant_id: app.userId,
      role: ParticipantRole.USER,
      last_read_at: created,
    });
    participantRows.push({
      chat_participant_id: ukFaker.string.uuid(),
      chat_id: chatId,
      participant_id: rescueUserId,
      role: ParticipantRole.RESCUE,
      rescue_id: app.rescueId,
      last_read_at: created,
    });
  }

  await bulkInsert(Chat, chatRows);
  await bulkInsert(ChatParticipant, participantRows);

  console.log(
    `✅ Inserted ${chatRows.length} faker-generated chats with ${participantRows.length} participants`
  );
}
