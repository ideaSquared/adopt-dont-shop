import Chat from '../../models/Chat';
import { ChatParticipant } from '../../models/ChatParticipant';
import { Message } from '../../models/Message';
import { MessageContentFormat } from '../../types/chat';
import { ukFaker } from '../lib/faker-rng';
import { bulkInsert } from '../lib/bulk-insert';

const DEFAULT_MESSAGE_COUNT = 8000;

const targetCount = (): number => {
  const raw = process.env.DEMO_MESSAGE_COUNT;
  if (raw === undefined) {
    return DEFAULT_MESSAGE_COUNT;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MESSAGE_COUNT;
};

// Geometric draw — realistic conversations are bursty: many chats have a
// handful of messages, a few chats have many. p=0.15 gives mean ~6.7,
// variance fat enough to push some chats well into double digits.
const geometricSample = (p: number): number => {
  const u = ukFaker.number.float({ min: 0.0001, max: 0.9999 });
  return Math.max(1, Math.ceil(Math.log(1 - u) / Math.log(1 - p)));
};

export async function seedDemoMessages(): Promise<void> {
  const target = targetCount();
  if (target === 0) {
    return;
  }

  const chats = await Chat.findAll({ attributes: ['chat_id', 'createdAt'], limit: 5000 });
  if (chats.length === 0) {
    console.log('⚠️  No chats — skipping messages');
    return;
  }

  // Map chat → participant ids so each message has a real sender.
  const participants = await ChatParticipant.findAll({
    attributes: ['chat_id', 'participant_id'],
  });
  const senderMap = new Map<string, string[]>();
  for (const p of participants) {
    const list = senderMap.get(p.chat_id) ?? [];
    list.push(p.participant_id);
    senderMap.set(p.chat_id, list);
  }

  const existing = await Message.count();
  let remaining = Math.max(0, target - existing);
  if (remaining === 0) {
    return;
  }

  const rows: Array<{
    message_id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    content_format: MessageContentFormat;
    created_at: Date;
    updated_at: Date;
  }> = [];

  // Distribute messages across chats geometrically until we hit target.
  for (const chat of chats) {
    if (remaining === 0) {
      break;
    }
    const senders = senderMap.get(chat.chat_id);
    if (!senders || senders.length === 0) {
      continue;
    }

    const burst = Math.min(remaining, geometricSample(0.15));
    const start = chat.createdAt;
    for (let i = 0; i < burst; i++) {
      const created = ukFaker.date.between({ from: start, to: new Date() });
      rows.push({
        message_id: ukFaker.string.uuid(),
        chat_id: chat.chat_id,
        sender_id: ukFaker.helpers.arrayElement(senders),
        content: ukFaker.lorem.sentence({ min: 3, max: 24 }),
        content_format: MessageContentFormat.PLAIN,
        created_at: created,
        updated_at: created,
      });
      remaining -= 1;
    }
  }

  await bulkInsert(Message, rows, { chunkSize: 1000 });

  console.log(
    `✅ Inserted ${rows.length} faker-generated messages across ${chats.length} chats (target ${target})`
  );
}
