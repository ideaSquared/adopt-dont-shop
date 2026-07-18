// gRPC handler implementations for ChatService.
//
// Discipline matches the other extracted services:
//   - State-changing handlers run the DB write + event publish inside
//     @adopt-dont-shop/events.withTransaction so events fire only after
//     commit (publish-after-commit, CAD pattern).
//   - Permission gating uses @adopt-dont-shop/authz against the
//     principal in gRPC metadata. super_admin short-circuits.
//   - List + send/react/markRead enforce participant-scope: callers can
//     only operate on chats they're a participant of. super_admin
//     bypasses via hasPermission.
//   - Reactions: (message_id, user_id, emoji) UNIQUE — add is idempotent;
//     remove is idempotent (no row → no-op).
//   - MarkRead: idempotent — repeated calls just re-stamp read_at.
//
// Cross-schema reads (auth.users for sender name lookups) live in the
// gateway / consumers. Everything else validates participant membership
// inside its own schema only — EXCEPT OpenChat (ADS-918), which resolves
// the applicationId → {adopterId, rescueId} relationship via a
// service.applications gRPC call (+ service.rescue for the
// adopter-initiates-chat direction) before creating a chat, because
// nothing in this schema can otherwise confirm the caller and
// other_user_id actually belong together.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction, type WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import { principalToMetadata } from '@adopt-dont-shop/service-bootstrap';
import type { ApplicationsClient } from './applications-client.js';
import type { RescueClient } from './rescue-client.js';
import type {
  Chat,
  DeleteChatRequest,
  DeleteChatResponse,
  DeleteMessageRequest,
  DeleteMessageResponse,
  GetChatRequest,
  GetChatResponse,
  GetChatUnreadCountRequest,
  GetChatUnreadCountResponse,
  ListChatsRequest,
  ListChatsResponse,
  ListMessagesRequest,
  ListMessagesResponse,
  MarkReadRequest,
  MarkReadResponse,
  Message,
  MessageReaction,
  OpenChatRequest,
  OpenChatResponse,
  ReactRequest,
  ReactResponse,
  SearchChatHit,
  SearchChatsRequest,
  SearchChatsResponse,
  SendMessageRequest,
  SendMessageResponse,
} from '@adopt-dont-shop/proto';

export type HandlerDeps = WithTransactionDeps;

export type HandlerErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'FAILED_PRECONDITION'
  | 'INTERNAL';

export class HandlerError extends Error {
  constructor(
    public readonly code: HandlerErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HandlerError';
  }
}

// --- Permissions -----------------------------------------------------

// Canonical permission names from lib.types (rescue-permissions.ts): the RBAC
// matrix (auth migration 016) grants adopters + rescue staff `chats.*` /
// `messages.*`, so the chat service MUST gate on those same strings. It
// previously used ad-hoc `chat.read` / `chat.create` / `chat.send`, which no
// role was ever granted — so every non-super_admin chat op 403'd.
const CHAT_CREATE: Permission = 'chats.create' as Permission;
const CHAT_READ: Permission = 'chats.read' as Permission;
const CHAT_SEND: Permission = 'messages.create' as Permission;

// --- Row shapes ------------------------------------------------------

type ChatRow = {
  chat_id: string;
  application_id: string | null;
  rescue_id: string;
  pet_id: string | null;
  status: 'active' | 'locked' | 'archived';
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  message_id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
};

type ReactionRow = {
  reaction_id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: Date;
};

// --- Helpers ---------------------------------------------------------

const isParticipantOrAdmin = async (
  deps: HandlerDeps,
  principal: Principal,
  chatId: string
): Promise<boolean> => {
  if (hasPermission(principal, CHAT_READ) && principal.roles.includes('super_admin')) {
    return true;
  }
  const res = await deps.pool.query<{ chat_participant_id: string }>(
    `SELECT chat_participant_id FROM chat_participants
     WHERE chat_id = $1 AND participant_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [chatId, principal.userId]
  );
  return res.rows.length > 0;
};

// A chat accepts new content only while it exists and is `active`.
// `locked`/`archived` chats are read-only and a soft-deleted chat is gone
// — but isParticipantOrAdmin only checks membership, so without this guard
// messages and reactions silently accrue to chats that the read side
// (getChat/listChats/searchChats) already treats as closed.
const ensureChatWritable = async (deps: HandlerDeps, chatId: string): Promise<void> => {
  const res = await deps.pool.query<{ status: string; deleted_at: Date | null }>(
    `SELECT status, deleted_at FROM chats WHERE chat_id = $1 LIMIT 1`,
    [chatId]
  );
  const row = res.rows[0];
  if (!row || row.deleted_at !== null) {
    throw new HandlerError('NOT_FOUND', `chat '${chatId}' not found`);
  }
  if (row.status !== 'active') {
    throw new HandlerError(
      'FAILED_PRECONDITION',
      `chat '${chatId}' is ${row.status} and cannot accept new messages`
    );
  }
};

const loadChatParticipants = async (deps: HandlerDeps, chatId: string): Promise<string[]> => {
  const res = await deps.pool.query<{ participant_id: string }>(
    `SELECT participant_id FROM chat_participants
     WHERE chat_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [chatId]
  );
  return res.rows.map(r => r.participant_id);
};

// Same lookup but on an open transactional client — used by SendMessage /
// MarkRead / React to include the participant list in their NATS event
// payloads so the gateway can fan to every member of the chat without
// calling back into this service.
const loadChatParticipantsTx = async (
  client: Parameters<Parameters<typeof withTransaction>[1]>[0]['client'],
  chatId: string
): Promise<string[]> => {
  const res = await client.query<{ participant_id: string }>(
    `SELECT participant_id FROM chat_participants
     WHERE chat_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [chatId]
  );
  return res.rows.map(r => r.participant_id);
};

const loadLastMessagePreview = async (
  deps: HandlerDeps,
  chatId: string
): Promise<{ preview: string | null; at: Date | null; senderId: string | null }> => {
  const res = await deps.pool.query<{
    content: string;
    sender_id: string;
    created_at: Date;
  }>(
    `SELECT content, sender_id, created_at FROM messages
     WHERE chat_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [chatId]
  );
  const row = res.rows[0];
  if (!row) {
    return { preview: null, at: null, senderId: null };
  }
  // Cap preview at 140 chars — same heuristic the monolith uses.
  const preview = row.content.length > 140 ? row.content.slice(0, 140) : row.content;
  return { preview, at: row.created_at, senderId: row.sender_id };
};

const chatRowToProto = async (deps: HandlerDeps, row: ChatRow): Promise<Chat> => {
  const participants = await loadChatParticipants(deps, row.chat_id);
  const last = await loadLastMessagePreview(deps, row.chat_id);
  return {
    chatId: row.chat_id,
    applicationId: row.application_id ?? '',
    participantUserIds: participants,
    lastMessagePreview: last.preview ?? undefined,
    lastMessageAt: last.at?.toISOString(),
    lastMessageSenderId: last.senderId ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

const loadMessageReactions = async (
  deps: HandlerDeps,
  messageIds: string[]
): Promise<Map<string, MessageReaction[]>> => {
  if (messageIds.length === 0) {
    return new Map();
  }
  const res = await deps.pool.query<ReactionRow>(
    `SELECT * FROM message_reactions WHERE message_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
    [messageIds]
  );
  const byMessage = new Map<string, Map<string, string[]>>();
  for (const row of res.rows) {
    let perEmoji = byMessage.get(row.message_id);
    if (!perEmoji) {
      perEmoji = new Map();
      byMessage.set(row.message_id, perEmoji);
    }
    let list = perEmoji.get(row.emoji);
    if (!list) {
      list = [];
      perEmoji.set(row.emoji, list);
    }
    list.push(row.user_id);
  }
  const out = new Map<string, MessageReaction[]>();
  for (const [messageId, perEmoji] of byMessage) {
    const grouped: MessageReaction[] = [];
    for (const [emoji, userIds] of perEmoji) {
      grouped.push({ emoji, userIds });
    }
    out.set(messageId, grouped);
  }
  return out;
};

const messageRowToProto = (row: MessageRow, reactions: MessageReaction[]): Message => ({
  messageId: row.message_id,
  chatId: row.chat_id,
  senderUserId: row.sender_id,
  body: row.content,
  reactions,
  editedAt: row.edited_at?.toISOString(),
  deletedAt: row.deleted_at?.toISOString(),
  createdAt: row.created_at.toISOString(),
});

// --- OpenChat --------------------------------------------------------

// gRPC numeric status codes surfaced by the cross-service calls below —
// mapped onto our own HandlerError codes the same way
// services/applications/src/grpc/handlers.ts maps service.pets errors.
const CROSS_SERVICE_GRPC_NOT_FOUND = 5;
const CROSS_SERVICE_GRPC_PERMISSION_DENIED = 7;

export function makeOpenChat(
  applicationsClient: ApplicationsClient,
  rescueClient: RescueClient
): (deps: HandlerDeps, principal: Principal, req: OpenChatRequest) => Promise<OpenChatResponse> {
  return async (deps, principal, req) => {
    if (!req.applicationId) {
      throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
    }
    if (!req.otherUserId) {
      throw new HandlerError('INVALID_ARGUMENT', 'other_user_id is required');
    }
    if (req.otherUserId === principal.userId) {
      throw new HandlerError('INVALID_ARGUMENT', 'cannot open a chat with yourself');
    }
    if (!hasPermission(principal, CHAT_CREATE)) {
      throw new HandlerError('PERMISSION_DENIED', `'${CHAT_CREATE}' required`);
    }

    // ADS-918: never trust applicationId/otherUserId/rescueId verbatim.
    // Resolve the real application and derive rescue_id from it —
    // req.rescueId is ignored entirely — and verify other_user_id is the
    // legitimate other party (rescue staff for an adopter caller, the
    // adopter for a rescue-staff caller).
    const rescueId = await resolveOpenChatRescueId(
      applicationsClient,
      rescueClient,
      principal,
      req.applicationId,
      req.otherUserId
    );

    // Idempotency: look up an existing chat for this application + pair.
    const existing = await deps.pool.query<ChatRow>(
      `
      SELECT c.*
      FROM chats c
      WHERE c.application_id = $1
        AND c.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM chat_participants p1
          WHERE p1.chat_id = c.chat_id AND p1.participant_id = $2 AND p1.deleted_at IS NULL
        )
        AND EXISTS (
          SELECT 1 FROM chat_participants p2
          WHERE p2.chat_id = c.chat_id AND p2.participant_id = $3 AND p2.deleted_at IS NULL
        )
      LIMIT 1
      `,
      [req.applicationId, principal.userId, req.otherUserId]
    );
    if (existing.rows[0]) {
      const chat = await chatRowToProto(deps, existing.rows[0]);
      return { chat, created: false };
    }

    const chatId = randomUUID();
    let inserted: ChatRow | undefined;
    await withTransaction(deps, async ({ client, publish }) => {
      const inserted0 = await client.query<ChatRow>(
        `
        INSERT INTO chats (chat_id, application_id, rescue_id, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
        RETURNING *
        `,
        [chatId, req.applicationId, rescueId]
      );
      inserted = inserted0.rows[0];

      // Two participant rows. Roles default to 'member' — the gateway/
      // service.rescue can promote a rescue-staff participant via a
      // future update.
      await client.query(
        `
        INSERT INTO chat_participants (chat_participant_id, chat_id, participant_id, role)
        VALUES ($1, $2, $3, 'member'), ($4, $2, $5, 'member')
        `,
        [randomUUID(), chatId, principal.userId, randomUUID(), req.otherUserId]
      );

      publish({
        type: 'chat.created',
        id: `chat.created.${chatId}`,
        payload: {
          chatId,
          applicationId: req.applicationId,
          participantUserIds: [principal.userId, req.otherUserId],
        },
      });
    });

    if (!inserted) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }
    const chat = await chatRowToProto(deps, inserted);
    return { chat, created: true };
  };
}

// Resolves the application referenced by OpenChatRequest and validates
// that other_user_id is the legitimate other party:
//   - Caller is the application's adopter → other_user_id MUST be a
//     staff member of the application's rescue.
//   - Caller is staff of the application's rescue → other_user_id MUST
//     be the application's adopter.
//   - Caller is super_admin → trusted bypass (still pins rescue_id).
// GetApplication's own authz (adopter-owns OR rescue-staff-of-rescue OR
// super_admin) rejects everyone else before we get here, so the final
// throw below is defence in depth, not the primary gate.
async function resolveOpenChatRescueId(
  applicationsClient: ApplicationsClient,
  rescueClient: RescueClient,
  principal: Principal,
  applicationId: string,
  otherUserId: string
): Promise<string> {
  let res;
  try {
    res = await applicationsClient.getApplication(
      { applicationId, includeTimeline: false },
      principalToMetadata(principal)
    );
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === CROSS_SERVICE_GRPC_NOT_FOUND) {
      throw new HandlerError('INVALID_ARGUMENT', `application ${applicationId} not found`);
    }
    if (code === CROSS_SERVICE_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not authorized for this application');
    }
    throw new HandlerError('INTERNAL', 'failed to resolve application');
  }

  const app = res.application;
  if (!app) {
    throw new HandlerError('INVALID_ARGUMENT', `application ${applicationId} not found`);
  }

  if (principal.userId === app.adopterId) {
    let staff;
    try {
      staff = await rescueClient.listStaffMembers({ rescueId: app.rescueId });
    } catch (err) {
      // ADS-978: mirror the getApplication mapping above — an unmapped
      // failure here (DEADLINE_EXCEEDED under load, UNAVAILABLE, a
      // signing-key-rotation PERMISSION_DENIED on svc-chat's system
      // principal) would otherwise surface as an opaque INTERNAL with the
      // raw @grpc/grpc-js message attached. Both branches stay INTERNAL —
      // this is an infra fault, not a user-input error — but the message
      // is stable and distinguishes an auth-token rejection from a plain
      // availability blip for on-call.
      const code = (err as { code?: number }).code;
      if (code === CROSS_SERVICE_GRPC_PERMISSION_DENIED) {
        throw new HandlerError('INTERNAL', 'failed to resolve rescue staff (auth)');
      }
      throw new HandlerError('INTERNAL', 'failed to resolve rescue staff');
    }
    const isStaff = staff.staffMembers.some(member => member.userId === otherUserId);
    if (!isStaff) {
      throw new HandlerError('INVALID_ARGUMENT', 'other_user_id must be rescue staff');
    }
    return app.rescueId;
  }

  if (principal.rescueId !== undefined && principal.rescueId === app.rescueId) {
    if (otherUserId !== app.adopterId) {
      throw new HandlerError('INVALID_ARGUMENT', 'other_user_id must be the application adopter');
    }
    return app.rescueId;
  }

  if (principal.roles.includes('super_admin')) {
    return app.rescueId;
  }

  throw new HandlerError('PERMISSION_DENIED', 'not authorized to open a chat for this application');
}

// --- SendMessage -----------------------------------------------------

const MAX_MESSAGE_LENGTH = 10_000;

export async function sendMessage(
  deps: HandlerDeps,
  principal: Principal,
  req: SendMessageRequest
): Promise<SendMessageResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!req.body || req.body.trim().length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'body is required');
  }
  if (req.body.length > MAX_MESSAGE_LENGTH) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `body exceeds ${MAX_MESSAGE_LENGTH} character limit`
    );
  }
  if (!hasPermission(principal, CHAT_SEND)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_SEND}' required`);
  }
  if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
    throw new HandlerError('PERMISSION_DENIED', 'only chat participants may send messages');
  }
  await ensureChatWritable(deps, req.chatId);

  const messageId = randomUUID();
  let inserted: MessageRow | undefined;

  await withTransaction(deps, async ({ client, publish }) => {
    const res = await client.query<MessageRow>(
      `
      INSERT INTO messages (
        message_id, chat_id, sender_id, content, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, now(), now())
      RETURNING *
      `,
      [messageId, req.chatId, principal.userId, req.body]
    );
    inserted = res.rows[0];

    // Bump the chat's updated_at so ListChats's most-recent ordering
    // surfaces it. messages_chat_created_idx handles the actual sort.
    await client.query(`UPDATE chats SET updated_at = now() WHERE chat_id = $1`, [req.chatId]);

    const participantUserIds = await loadChatParticipantsTx(client, req.chatId);
    publish({
      type: 'chat.messageCreated',
      id: `chat.messageCreated.${messageId}`,
      payload: {
        messageId,
        chatId: req.chatId,
        senderUserId: principal.userId,
        body: req.body,
        participantUserIds,
      },
    });
  });

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'insert returned no rows');
  }
  return { message: messageRowToProto(inserted, []) };
}

// --- ListMessages ----------------------------------------------------

type MessageCursor = { createdAt: string; messageId: string };

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 200;

const decodeCursor = <T>(raw: string): T => {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'cursor is not a valid keyset cursor');
  }
};

const encodeCursor = <T>(cursor: T): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const clampLimit = (requested: number, def: number, max: number): number => {
  if (requested <= 0) {
    return def;
  }
  if (requested > max) {
    throw new HandlerError('INVALID_ARGUMENT', `limit exceeds max of ${max}`);
  }
  return requested;
};

export async function listMessages(
  deps: HandlerDeps,
  principal: Principal,
  req: ListMessagesRequest
): Promise<ListMessagesResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }
  if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
    throw new HandlerError('PERMISSION_DENIED', 'only chat participants may list messages');
  }

  const limit = clampLimit(req.limit, DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);
  const cursor = req.cursor ? decodeCursor<MessageCursor>(req.cursor) : null;

  // Newest-first keyset pagination: (created_at, message_id) DESC.
  // Cursor encodes the LAST item we returned; the next page picks up
  // strictly older items.
  const res = await deps.pool.query<MessageRow>(
    cursor
      ? `
        SELECT * FROM messages
        WHERE chat_id = $1
          AND deleted_at IS NULL
          AND (created_at, message_id) < ($2::timestamptz, $3::uuid)
        ORDER BY created_at DESC, message_id DESC
        LIMIT $4
        `
      : `
        SELECT * FROM messages
        WHERE chat_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC, message_id DESC
        LIMIT $2
        `,
    cursor ? [req.chatId, cursor.createdAt, cursor.messageId, limit] : [req.chatId, limit]
  );

  const reactions = await loadMessageReactions(
    deps,
    res.rows.map(r => r.message_id)
  );
  const messages = res.rows.map(row => messageRowToProto(row, reactions.get(row.message_id) ?? []));

  let nextCursor: string | undefined;
  if (res.rows.length === limit) {
    const last = res.rows[res.rows.length - 1];
    nextCursor = encodeCursor<MessageCursor>({
      createdAt: last.created_at.toISOString(),
      messageId: last.message_id,
    });
  }

  return { messages, nextCursor };
}

// --- ListChats -------------------------------------------------------

type ChatCursor = { updatedAt: string; chatId: string };

const DEFAULT_CHAT_LIMIT = 20;
const MAX_CHAT_LIMIT = 100;

export async function listChats(
  deps: HandlerDeps,
  principal: Principal,
  req: ListChatsRequest
): Promise<ListChatsResponse> {
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }
  const limit = clampLimit(req.limit, DEFAULT_CHAT_LIMIT, MAX_CHAT_LIMIT);
  const cursor = req.cursor ? decodeCursor<ChatCursor>(req.cursor) : null;

  // Always self-scoped by participant_id. super_admin still goes
  // through the participant filter — staff-tooling that needs to see
  // all chats should call a different RPC (not exposed today).
  const baseSql = `
    SELECT DISTINCT c.*
    FROM chats c
    JOIN chat_participants p ON p.chat_id = c.chat_id
    WHERE p.participant_id = $1 AND p.deleted_at IS NULL AND c.deleted_at IS NULL
    ${cursor ? 'AND (c.updated_at, c.chat_id) < ($2::timestamptz, $3::uuid)' : ''}
    ORDER BY c.updated_at DESC, c.chat_id DESC
    LIMIT $${cursor ? 4 : 2}
  `;
  const params = cursor
    ? [principal.userId, cursor.updatedAt, cursor.chatId, limit]
    : [principal.userId, limit];
  const res = await deps.pool.query<ChatRow>(baseSql, params);

  // unread_only filter is a follow-on — requires aggregating reads vs
  // messages per chat. For now, return rows and let the caller filter
  // (the SPA already does this via the unread badge calculation).
  const chats = await Promise.all(res.rows.map(row => chatRowToProto(deps, row)));

  let nextCursor: string | undefined;
  if (res.rows.length === limit) {
    const last = res.rows[res.rows.length - 1];
    nextCursor = encodeCursor<ChatCursor>({
      updatedAt: last.updated_at.toISOString(),
      chatId: last.chat_id,
    });
  }

  return { chats, nextCursor };
}

// --- MarkRead --------------------------------------------------------

export async function markRead(
  deps: HandlerDeps,
  principal: Principal,
  req: MarkReadRequest
): Promise<MarkReadResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!req.upToMessageId) {
    throw new HandlerError('INVALID_ARGUMENT', 'up_to_message_id is required');
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }
  if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
    throw new HandlerError('PERMISSION_DENIED', 'only chat participants may mark messages read');
  }

  // Verify the message belongs to the chat (caller bug or stale UI
  // shouldn't allow drifting reads onto an unrelated chat).
  const target = await deps.pool.query<{ created_at: Date }>(
    `SELECT created_at FROM messages WHERE message_id = $1 AND chat_id = $2 LIMIT 1`,
    [req.upToMessageId, req.chatId]
  );
  if (!target.rows[0]) {
    throw new HandlerError(
      'NOT_FOUND',
      `message '${req.upToMessageId}' not found in chat '${req.chatId}'`
    );
  }

  await withTransaction(deps, async ({ client, publish }) => {
    // Insert read receipts for every message in the chat created at or
    // before the target's timestamp that the user hasn't already read.
    // ON CONFLICT DO NOTHING preserves idempotency without serialising.
    await client.query(
      `
      INSERT INTO message_reads (read_id, message_id, user_id, read_at)
      SELECT gen_random_uuid(), m.message_id, $1, now()
      FROM messages m
      WHERE m.chat_id = $2
        AND m.deleted_at IS NULL
        AND m.created_at <= $3
      ON CONFLICT (message_id, user_id) DO NOTHING
      `,
      [principal.userId, req.chatId, target.rows[0].created_at]
    );

    // Advance the participant's last_read_at watermark to the TARGET
    // message's timestamp — not now(). now() would swallow any message that
    // arrives between the target lookup and this write (its created_at falls
    // in (target, now()] yet would read as "below the watermark"). GREATEST
    // keeps the watermark monotonic so out-of-order marks never rewind it.
    await client.query(
      `
      UPDATE chat_participants
      SET last_read_at = GREATEST(last_read_at, $3), updated_at = now()
      WHERE chat_id = $1 AND participant_id = $2
      `,
      [req.chatId, principal.userId, target.rows[0].created_at]
    );

    const participantUserIds = await loadChatParticipantsTx(client, req.chatId);
    publish({
      type: 'chat.messageRead',
      id: `chat.messageRead.${req.chatId}.${principal.userId}.${req.upToMessageId}`,
      payload: {
        chatId: req.chatId,
        userId: principal.userId,
        upToMessageId: req.upToMessageId,
        participantUserIds,
      },
    });
  });

  return { upToMessageId: req.upToMessageId };
}

// --- React -----------------------------------------------------------

// The emoji column is varchar(32). Postgres counts code points; JS string
// length counts UTF-16 code units (>= code points), so a length <= 32 here
// can never overflow the column. Guarding in the handler turns a would-be
// DB 22001 (surfaced as INTERNAL) into a clean INVALID_ARGUMENT.
const MAX_EMOJI_LENGTH = 32;

export async function react(
  deps: HandlerDeps,
  principal: Principal,
  req: ReactRequest
): Promise<ReactResponse> {
  if (!req.messageId) {
    throw new HandlerError('INVALID_ARGUMENT', 'message_id is required');
  }
  if (!req.emoji) {
    throw new HandlerError('INVALID_ARGUMENT', 'emoji is required');
  }
  if (req.emoji.length > MAX_EMOJI_LENGTH) {
    throw new HandlerError('INVALID_ARGUMENT', `emoji exceeds ${MAX_EMOJI_LENGTH} character limit`);
  }
  if (!hasPermission(principal, CHAT_SEND)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_SEND}' required`);
  }

  // Load the message to find its chat, so we can enforce participant
  // scope (you can only react inside chats you're a member of).
  const msg = await deps.pool.query<{ chat_id: string }>(
    `SELECT chat_id FROM messages WHERE message_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.messageId]
  );
  if (!msg.rows[0]) {
    throw new HandlerError('NOT_FOUND', `message '${req.messageId}' not found`);
  }
  const chatId = msg.rows[0].chat_id;
  if (!(await isParticipantOrAdmin(deps, principal, chatId))) {
    throw new HandlerError('PERMISSION_DENIED', 'only chat participants may react to messages');
  }
  // Adding a reaction is new content — block it on closed chats. Removing
  // a reaction stays allowed so cleanup still works on an archived thread.
  if (!req.remove) {
    await ensureChatWritable(deps, chatId);
  }

  await withTransaction(deps, async ({ client, publish }) => {
    const participantUserIds = await loadChatParticipantsTx(client, chatId);
    if (req.remove) {
      await client.query(
        `DELETE FROM message_reactions
         WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
        [req.messageId, principal.userId, req.emoji]
      );
      publish({
        type: 'chat.reactionRemoved',
        id: `chat.reactionRemoved.${req.messageId}.${principal.userId}.${req.emoji}`,
        payload: {
          messageId: req.messageId,
          chatId,
          userId: principal.userId,
          emoji: req.emoji,
          participantUserIds,
        },
      });
    } else {
      // ON CONFLICT preserves idempotency — a repeated React with the
      // same (message, user, emoji) is a no-op.
      await client.query(
        `INSERT INTO message_reactions (reaction_id, message_id, user_id, emoji)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
        [randomUUID(), req.messageId, principal.userId, req.emoji]
      );
      publish({
        type: 'chat.reactionAdded',
        id: `chat.reactionAdded.${req.messageId}.${principal.userId}.${req.emoji}`,
        payload: {
          messageId: req.messageId,
          chatId,
          userId: principal.userId,
          emoji: req.emoji,
          participantUserIds,
        },
      });
    }
  });

  // Re-fetch the message + aggregated reactions to return the canonical
  // post-mutation shape.
  const after = await deps.pool.query<MessageRow>(
    `SELECT * FROM messages WHERE message_id = $1 LIMIT 1`,
    [req.messageId]
  );
  if (!after.rows[0]) {
    throw new HandlerError('INTERNAL', 'message disappeared mid-call');
  }
  const reactions = await loadMessageReactions(deps, [req.messageId]);
  return {
    message: messageRowToProto(after.rows[0], reactions.get(req.messageId) ?? []),
  };
}

// --- SearchChats -----------------------------------------------------

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const MAX_QUERY_LEN = 100;

export async function searchChats(
  deps: HandlerDeps,
  principal: Principal,
  req: SearchChatsRequest
): Promise<SearchChatsResponse> {
  if (!req.query || req.query.trim().length === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'query is required');
  }
  const query = req.query.trim();
  if (query.length > MAX_QUERY_LEN) {
    throw new HandlerError('INVALID_ARGUMENT', `query must be <= ${MAX_QUERY_LEN} chars`);
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }

  const limit = clampLimit(req.limit, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  // websearch_to_tsquery understands quoted phrases + "or" + leading "-"
  // exclusion the way users expect from a search box, without the strict
  // syntax to_tsquery requires. It returns no rows on an empty parse,
  // which is the right behaviour for a stray punctuation-only query.
  const tsQuery = 'websearch_to_tsquery($1, $2)';

  // Self-scope: a message-content match still has to be in a chat the
  // caller participates in. The `archived` filter mirrors the monolith.
  const baseWhere: string[] = [
    `c.status <> 'archived'`,
    `c.deleted_at IS NULL`,
    `p.participant_id = $3`,
    `p.deleted_at IS NULL`,
    `m.deleted_at IS NULL`,
    `m.search_vector @@ ${tsQuery}`,
  ];
  const params: unknown[] = ['english', query, principal.userId];
  let nextParam = 4;

  if (req.rescueId) {
    baseWhere.push(`c.rescue_id = $${nextParam}`);
    params.push(req.rescueId);
    nextParam += 1;
  }

  // Total distinct chat count — drives the SPA pagination ribbon.
  const countSql = `
    SELECT COUNT(DISTINCT c.chat_id)::text AS total
    FROM chats c
    JOIN chat_participants p ON p.chat_id = c.chat_id
    JOIN messages m ON m.chat_id = c.chat_id
    WHERE ${baseWhere.join(' AND ')}
  `;
  const countRes = await deps.pool.query<{ total: string }>(countSql, params);
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  if (total === 0) {
    return { hits: [], page, limit, total: 0 };
  }

  // For each matching chat, surface the most recent matching message
  // (DISTINCT ON ordered by chat + created_at DESC). Sort the outer
  // result by that match's recency so the SPA gets the freshest matches
  // first, then deterministic chat_id tiebreaker.
  const hitsSql = `
    SELECT DISTINCT ON (c.chat_id)
      c.chat_id AS c_chat_id, c.application_id AS c_application_id,
      c.rescue_id AS c_rescue_id, c.pet_id AS c_pet_id,
      c.status AS c_status,
      c.created_at AS c_created_at, c.updated_at AS c_updated_at,
      m.message_id AS m_message_id, m.chat_id AS m_chat_id,
      m.sender_id AS m_sender_id, m.content AS m_content,
      m.edited_at AS m_edited_at, m.deleted_at AS m_deleted_at,
      m.created_at AS m_created_at
    FROM chats c
    JOIN chat_participants p ON p.chat_id = c.chat_id
    JOIN messages m ON m.chat_id = c.chat_id
    WHERE ${baseWhere.join(' AND ')}
    ORDER BY c.chat_id, m.created_at DESC
    LIMIT $${nextParam}
    OFFSET $${nextParam + 1}
  `;
  // Wrap the DISTINCT ON in an outer SELECT so we can order by match
  // recency without violating DISTINCT ON's ordering rule.
  const orderedSql = `
    SELECT * FROM (${hitsSql.replace(/LIMIT.*$/s, '')}) hits
    ORDER BY m_created_at DESC, c_chat_id ASC
    LIMIT $${nextParam}
    OFFSET $${nextParam + 1}
  `;
  const hitsRes = await deps.pool.query<{
    c_chat_id: string;
    c_application_id: string | null;
    c_rescue_id: string;
    c_pet_id: string | null;
    c_status: ChatRow['status'];
    c_created_at: Date;
    c_updated_at: Date;
    m_message_id: string;
    m_chat_id: string;
    m_sender_id: string;
    m_content: string;
    m_edited_at: Date | null;
    m_deleted_at: Date | null;
    m_created_at: Date;
  }>(orderedSql, [...params, limit, offset]);

  // Reactions: load all matching message ids in one shot.
  const messageIds = hitsRes.rows.map(r => r.m_message_id);
  const reactionMap = await loadMessageReactions(deps, messageIds);

  const hits: SearchChatHit[] = await Promise.all(
    hitsRes.rows.map(async row => {
      const chatRow: ChatRow = {
        chat_id: row.c_chat_id,
        application_id: row.c_application_id,
        rescue_id: row.c_rescue_id,
        pet_id: row.c_pet_id,
        status: row.c_status,
        created_at: row.c_created_at,
        updated_at: row.c_updated_at,
      };
      const msgRow: MessageRow = {
        message_id: row.m_message_id,
        chat_id: row.m_chat_id,
        sender_id: row.m_sender_id,
        content: row.m_content,
        edited_at: row.m_edited_at,
        deleted_at: row.m_deleted_at,
        created_at: row.m_created_at,
      };
      return {
        chat: await chatRowToProto(deps, chatRow),
        match: messageRowToProto(msgRow, reactionMap.get(row.m_message_id) ?? []),
      };
    })
  );

  return { hits, page, limit, total };
}

// --- GetChatUnreadCount ---------------------------------------------

export async function getChatUnreadCount(
  deps: HandlerDeps,
  principal: Principal,
  req: GetChatUnreadCountRequest
): Promise<GetChatUnreadCountResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }
  if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
    // Don't enumerate — same response shape as a missing chat.
    throw new HandlerError('NOT_FOUND', `chat ${req.chatId} not found`);
  }

  // "Unread for user" = messages in the chat NOT authored by the user
  // that have no matching message_reads row for the user. The LEFT
  // JOIN-NULL pattern keeps the count in SQL without loading message
  // rows into Node memory. deleted_at is filtered out — soft-deleted
  // messages don't count toward unread.
  const result = await deps.pool.query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM messages m
    LEFT JOIN message_reads r ON r.message_id = m.message_id AND r.user_id = $2
    WHERE m.chat_id = $1
      AND m.sender_id <> $2
      AND m.deleted_at IS NULL
      AND r.read_id IS NULL
    `,
    [req.chatId, principal.userId]
  );

  return { unreadCount: Number.parseInt(result.rows[0]?.count ?? '0', 10) };
}

// --- DeleteMessage ---------------------------------------------------

const CHAT_MESSAGE_DELETE_ANY: Permission = 'chat.message.delete:any' as Permission;

export async function deleteMessage(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteMessageRequest
): Promise<DeleteMessageResponse> {
  if (!req.messageId) {
    throw new HandlerError('INVALID_ARGUMENT', 'message_id is required');
  }

  // Fetch the row to determine ownership + chat scope.
  const existing = await deps.pool.query<MessageRow>(
    `SELECT * FROM messages WHERE message_id = $1 LIMIT 1`,
    [req.messageId]
  );
  if (existing.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `message ${req.messageId} not found`);
  }
  const row = existing.rows[0];

  // The sender may always delete their own message. Moderators / admins
  // need chat.message.delete:any to delete someone else's.
  const isSender = row.sender_id === principal.userId;
  if (!isSender && !hasPermission(principal, CHAT_MESSAGE_DELETE_ANY)) {
    // Non-sender without admin perm. Use NOT_FOUND posture so we don't
    // confirm message existence to non-participants — but still allow
    // participants to learn it exists by hitting other RPCs they're
    // entitled to call.
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${CHAT_MESSAGE_DELETE_ANY}' required to delete another user's message`
    );
  }

  // Idempotent — return the already-deleted row without re-publishing.
  if (row.deleted_at) {
    const reactions = await loadMessageReactions(deps, [row.message_id]);
    return {
      message: messageRowToProto(row, reactions.get(row.message_id) ?? []),
    };
  }

  // A plain sender can only delete within a writable (active) chat — a
  // closed / locked / archived chat is immutable. Moderators with
  // delete:any bypass this so they can still remove content from a
  // closed chat.
  if (!hasPermission(principal, CHAT_MESSAGE_DELETE_ANY)) {
    await ensureChatWritable(deps, row.chat_id);
  }

  let updated: MessageRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<MessageRow>(
      `
      UPDATE messages
      SET deleted_at = now()
      WHERE message_id = $1
      RETURNING *
      `,
      [req.messageId]
    );
    updated = result.rows[0];

    const participantUserIds = await loadChatParticipantsTx(client, row.chat_id);

    publish({
      type: 'chat.messageDeleted',
      id: `chat.messageDeleted.${req.messageId}`,
      payload: {
        messageId: req.messageId,
        chatId: row.chat_id,
        deletedBy: principal.userId,
        reason: req.reason ?? null,
        participantUserIds,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'delete returned no rows');
  }
  const reactions = await loadMessageReactions(deps, [updated.message_id]);
  return {
    message: messageRowToProto(updated, reactions.get(updated.message_id) ?? []),
  };
}

// --- GetChat --------------------------------------------------------

export async function getChat(
  deps: HandlerDeps,
  principal: Principal,
  req: GetChatRequest
): Promise<GetChatResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }

  // Participant-or-admin gate first so non-participants get NOT_FOUND
  // posture without learning whether the row exists.
  if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
    throw new HandlerError('NOT_FOUND', `chat ${req.chatId} not found`);
  }

  const result = await deps.pool.query<ChatRow>(
    `SELECT * FROM chats WHERE chat_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [req.chatId]
  );
  if (result.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `chat ${req.chatId} not found`);
  }

  return { chat: await chatRowToProto(deps, result.rows[0]) };
}

// --- DeleteChat -----------------------------------------------------

export async function deleteChat(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteChatRequest
): Promise<DeleteChatResponse> {
  if (!req.chatId) {
    throw new HandlerError('INVALID_ARGUMENT', 'chat_id is required');
  }
  if (!hasPermission(principal, CHAT_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${CHAT_READ}' required`);
  }

  // Fetch the row first — the rescue-staff privilege check below needs
  // its rescue_id.
  const existing = await deps.pool.query<ChatRow & { deleted_at: Date | null }>(
    `SELECT * FROM chats WHERE chat_id = $1 LIMIT 1`,
    [req.chatId]
  );
  if (existing.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `chat ${req.chatId} not found`);
  }
  const row = existing.rows[0];

  // ADS-923: chat-wide delete erases the thread for every participant —
  // a plain adopter participant could use it to destroy adoption-workflow
  // evidence the rescue relies on. Deleting is now a staff/safety-team
  // primitive: super_admin, a moderator/admin, or rescue-staff whose home
  // rescue matches this chat's rescue_id. A regular participant (e.g. the
  // adopter) is denied even though they can otherwise read the chat.
  const isPrivilegedDeleter =
    principal.roles.includes('super_admin') ||
    principal.roles.includes('moderator') ||
    principal.roles.includes('admin') ||
    (principal.roles.includes('rescue_staff') &&
      principal.rescueId !== undefined &&
      principal.rescueId === row.rescue_id);
  if (!isPrivilegedDeleter) {
    // Non-participants still get NOT_FOUND posture so the row's
    // existence isn't enumerable; a participant who simply lacks the
    // role learns the real reason.
    if (!(await isParticipantOrAdmin(deps, principal, req.chatId))) {
      throw new HandlerError('NOT_FOUND', `chat ${req.chatId} not found`);
    }
    throw new HandlerError(
      'PERMISSION_DENIED',
      'only rescue staff of this chat, or a moderator/admin, may delete a chat'
    );
  }

  // Idempotent — already deleted.
  if (row.deleted_at) {
    return { chat: await chatRowToProto(deps, row) };
  }

  let updated: ChatRow | undefined;
  await withTransaction(deps, async ({ client, publish }) => {
    const result = await client.query<ChatRow>(
      `
      UPDATE chats
      SET deleted_at = now(), updated_at = now()
      WHERE chat_id = $1
      RETURNING *
      `,
      [req.chatId]
    );
    updated = result.rows[0];

    const participantUserIds = await loadChatParticipantsTx(client, req.chatId);

    publish({
      type: 'chat.deleted',
      id: `chat.deleted.${req.chatId}`,
      payload: {
        chatId: req.chatId,
        deletedBy: principal.userId,
        reason: req.reason ?? null,
        participantUserIds,
      },
    });
  });

  if (!updated) {
    throw new HandlerError('INTERNAL', 'delete returned no rows');
  }
  return { chat: await chatRowToProto(deps, updated) };
}
