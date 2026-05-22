/**
 * Behaviour tests for the socket chat authorisation hardening (ADS-708):
 *
 *  - Revocation lookup runs on every event (no 30s cache window).
 *  - `requireChatAccess` resolves BEFORE socket.join, so a slow access
 *    check cannot let a non-participant temporarily land in the room.
 *  - Attachment URLs are constrained to this server's own upload paths.
 *
 * These tests drive the public socket-handler surface through stub IO
 * and Socket objects. No network, no real Socket.IO server — we only
 * care that the handler logic enforces the invariants above.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../models/RevokedToken', () => ({
  __esModule: true,
  default: {
    findByPk: vi.fn(),
  },
}));

vi.mock('../../models/User', () => ({
  __esModule: true,
  default: { findByPk: vi.fn() },
  UserStatus: { ACTIVE: 'active' },
  UserType: { ADOPTER: 'adopter', RESCUE_STAFF: 'rescue_staff' },
}));

vi.mock('../../models/StaffMember', () => ({
  __esModule: true,
  default: { findOne: vi.fn(), findAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../models/ChatParticipant', () => ({
  __esModule: true,
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../models/Role', () => ({
  __esModule: true,
  default: {},
}));

vi.mock('../../models/MessageReaction', () => ({
  __esModule: true,
  default: { findAll: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../services/chat.service', () => ({
  ChatService: {
    getChatById: vi.fn(),
    sendMessage: vi.fn(),
    markMessagesAsRead: vi.fn(),
    addMessageReaction: vi.fn(),
    removeMessageReaction: vi.fn(),
  },
}));

vi.mock('../../services/health-check.service', () => ({
  HealthCheckService: { updateActiveConnections: vi.fn() },
}));

vi.mock('../../services/messageBroker.service', () => ({
  getMessageBroker: () => null,
}));

vi.mock('../../utils/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../controllers/chat.controller', () => ({
  toFrontendMessage: (m: unknown) => m,
}));

vi.mock('../analytics-emitter', () => ({
  setAnalyticsIo: vi.fn(),
}));

vi.mock('../socket-registry', () => ({
  setLiveIo: vi.fn(),
  getLiveIo: vi.fn(),
  disconnectAllSockets: vi.fn(),
}));

import RevokedToken from '../../models/RevokedToken';
import ChatParticipant from '../../models/ChatParticipant';
import StaffMember from '../../models/StaffMember';
import { ChatService } from '../../services/chat.service';
import { verifyAccessToken } from '../../utils/jwt';
import { SocketHandlers, SendMessageSchema } from '../../socket/socket-handlers';

type EventHandler = (data: unknown) => void | Promise<void>;
type MiddlewareFn = (event: unknown[], next: (err?: Error) => void) => void;

type FakeSocket = {
  id: string;
  userId: string;
  authJti?: string;
  handshake: { auth: { token: string }; headers: Record<string, string> };
  rooms: Set<string>;
  joined: string[];
  middlewares: MiddlewareFn[];
  handlers: Map<string, EventHandler>;
  emitted: Array<{ event: string; payload: unknown }>;
  disconnected: boolean;
  use: (fn: MiddlewareFn) => void;
  on: (event: string, fn: EventHandler) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
  emit: (event: string, payload: unknown) => void;
  disconnect: (close?: boolean) => void;
};

const createFakeSocket = (overrides: Partial<FakeSocket> = {}): FakeSocket => {
  const socket: FakeSocket = {
    id: 'socket-1',
    userId: 'user-1',
    authJti: 'jti-1',
    handshake: { auth: { token: 'tok' }, headers: {} },
    rooms: new Set<string>(),
    joined: [],
    middlewares: [],
    handlers: new Map(),
    emitted: [],
    disconnected: false,
    use(fn) {
      this.middlewares.push(fn);
    },
    on(event, fn) {
      this.handlers.set(event, fn);
    },
    join(room) {
      this.rooms.add(room);
      this.joined.push(room);
    },
    leave(room) {
      this.rooms.delete(room);
    },
    to() {
      return { emit: () => undefined };
    },
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
    disconnect() {
      this.disconnected = true;
    },
    ...overrides,
  };
  return socket;
};

type FakeIo = {
  connectionHandler: ((socket: FakeSocket) => void) | null;
  use: (fn: (socket: FakeSocket, next: (err?: Error) => void) => void) => void;
  on: (event: string, fn: (socket: FakeSocket) => void) => void;
  to: () => { emit: () => void };
};

const createFakeIo = (): FakeIo => {
  const io: FakeIo = {
    connectionHandler: null,
    use: () => undefined,
    on(event, fn) {
      if (event === 'connection') {
        this.connectionHandler = fn;
      }
    },
    to: () => ({ emit: () => undefined }),
  };
  return io;
};

/**
 * Construct a SocketHandlers wired to a fake IO, then drive the
 * connection callback with a fake socket so the test can interact with
 * the registered middlewares and event handlers directly.
 */
const buildHandlersWithSocket = (
  socketOverrides: Partial<FakeSocket> = {}
): { socket: FakeSocket; io: FakeIo } => {
  const io = createFakeIo();
  // Cast through unknown: the fake intentionally implements only the
  // surface SocketHandlers uses. The cast is contained to test setup.
  new SocketHandlers(io as unknown as ConstructorParameters<typeof SocketHandlers>[0]);
  const socket = createFakeSocket(socketOverrides);
  io.connectionHandler?.(socket);
  return { socket, io };
};

describe('socket-handlers attachment URL validation (ADS-708)', () => {
  const baseMessage = {
    chatId: '00000000-0000-4000-8000-000000000001',
    content: 'hello',
  };

  it('accepts a /uploads/ relative path', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [{ type: 'image/png', url: '/uploads/chat/abc.png', name: 'abc.png' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts a /uploads-signed/ path', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [
        {
          type: 'image/png',
          url: '/uploads-signed/1700000000/deadbeef/chat/abc.png',
          name: 'abc.png',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an external https URL', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [{ type: 'image/png', url: 'https://attacker.example/x.png', name: 'x.png' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a protocol-relative URL', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [{ type: 'image/png', url: '//attacker.example/x.png', name: 'x.png' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unrelated absolute path', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [{ type: 'image/png', url: '/etc/passwd', name: 'p' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a javascript: URL', () => {
    const parsed = SendMessageSchema.safeParse({
      ...baseMessage,
      attachments: [{ type: 'text/html', url: 'javascript:alert(1)', name: 'x' }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('socket-handlers per-event revocation (ADS-708)', () => {
  beforeEach(() => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: 'user-1',
      email: 'u@example.com',
      jti: 'jti-1',
    });
    vi.mocked(RevokedToken.findByPk).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const runMiddleware = (socket: FakeSocket): Promise<{ called: boolean; err?: Error }> =>
    new Promise(resolve => {
      const [mw] = socket.middlewares;
      mw([], err => resolve({ called: true, err }));
    });

  it('queries the RevokedToken table on every event (no cache window)', async () => {
    const { socket } = buildHandlersWithSocket();

    await runMiddleware(socket);
    await runMiddleware(socket);
    await runMiddleware(socket);

    expect(vi.mocked(RevokedToken.findByPk)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(RevokedToken.findByPk)).toHaveBeenCalledWith('jti-1');
    expect(socket.disconnected).toBe(false);
  });

  it('disconnects the socket the moment the token is revoked, even after prior valid events', async () => {
    const { socket } = buildHandlersWithSocket();

    // First event: token is valid.
    vi.mocked(RevokedToken.findByPk).mockResolvedValueOnce(null);
    await runMiddleware(socket);
    expect(socket.disconnected).toBe(false);

    // Revocation happens between events. The next event must see it.
    vi.mocked(RevokedToken.findByPk).mockResolvedValueOnce({
      jti: 'jti-1',
    } as unknown as Awaited<ReturnType<typeof RevokedToken.findByPk>>);
    await new Promise<void>(resolve => {
      const [mw] = socket.middlewares;
      mw([], () => resolve());
      // Allow the rejection branch to run.
      setTimeout(resolve, 50);
    });

    expect(socket.disconnected).toBe(true);
  });
});

describe('socket-handlers join_chat race (ADS-708)', () => {
  beforeEach(() => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: 'user-1',
      email: 'u@example.com',
      jti: 'jti-1',
    });
    vi.mocked(RevokedToken.findByPk).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not join the chat room until requireChatAccess resolves', async () => {
    let resolveAccess: ((value: unknown) => void) | null = null;
    vi.mocked(ChatService.getChatById).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveAccess = resolve;
        }) as unknown as ReturnType<typeof ChatService.getChatById>
    );

    const { socket } = buildHandlersWithSocket();
    const joinHandler = socket.handlers.get('join_chat');
    expect(joinHandler).toBeDefined();

    const joinPromise = joinHandler!({
      chatId: '00000000-0000-4000-8000-000000000001',
    });

    // Yield so any (incorrect) synchronous join would have executed.
    await new Promise(r => setTimeout(r, 10));
    expect(socket.rooms.has('chat:00000000-0000-4000-8000-000000000001')).toBe(false);

    // Resolve the access check; the join must run only after this.
    resolveAccess?.({ chatId: '00000000-0000-4000-8000-000000000001' });
    await joinPromise;

    expect(socket.rooms.has('chat:00000000-0000-4000-8000-000000000001')).toBe(true);
  });

  it('does not join the chat room when requireChatAccess rejects', async () => {
    vi.mocked(ChatService.getChatById).mockRejectedValue(new Error('Access denied'));

    const { socket } = buildHandlersWithSocket();
    const joinHandler = socket.handlers.get('join_chat');
    await joinHandler!({ chatId: '00000000-0000-4000-8000-000000000002' });

    expect(socket.rooms.has('chat:00000000-0000-4000-8000-000000000002')).toBe(false);
    expect(socket.emitted.some(e => e.event === 'error')).toBe(true);
  });
});

/**
 * ADS-739: get_presence cross-tenant enumeration. Prior to this fix the
 * handler accepted an arbitrary list of userIds and returned online
 * status for every one of them, so any authenticated user could
 * enumerate which users at other rescues were online. The hardened
 * handler filters the response down to userIds the requester shares
 * context with (chat participants, same-rescue staff, or any id when
 * the requester is an admin/moderator).
 */
describe('socket-handlers get_presence scoping (ADS-739)', () => {
  const requesterId = '00000000-0000-4000-8000-000000000001';
  const sharedChatPeer = '00000000-0000-4000-8000-0000000000a1';
  const sameRescuePeer = '00000000-0000-4000-8000-0000000000a2';
  const strangerId = '00000000-0000-4000-8000-0000000000a3';

  beforeEach(() => {
    vi.mocked(verifyAccessToken).mockReturnValue({
      userId: requesterId,
      email: 'u@example.com',
      jti: 'jti-1',
    });
    vi.mocked(RevokedToken.findByPk).mockResolvedValue(null);
    vi.mocked(ChatParticipant.findAll).mockResolvedValue([]);
    vi.mocked(StaffMember.findAll).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const callGetPresence = async (
    socket: FakeSocket,
    userIds: string[]
  ): Promise<Record<string, { status: string; lastSeen: Date }> | undefined> => {
    const handler = socket.handlers.get('get_presence');
    expect(handler).toBeDefined();
    await handler!({ userIds });
    const evt = socket.emitted.find(e => e.event === 'presence_update');
    return evt?.payload as Record<string, { status: string; lastSeen: Date }> | undefined;
  };

  it('rejects a payload with non-uuid userIds and emits an error', async () => {
    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    const handler = socket.handlers.get('get_presence');
    await handler!({ userIds: ['not-a-uuid'] });

    expect(socket.emitted.some(e => e.event === 'error')).toBe(true);
    expect(socket.emitted.some(e => e.event === 'presence_update')).toBe(false);
  });

  it('rejects a payload with more than 50 userIds', async () => {
    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    const tooMany = Array.from(
      { length: 51 },
      (_, i) => `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`
    );
    const handler = socket.handlers.get('get_presence');
    await handler!({ userIds: tooMany });

    expect(socket.emitted.some(e => e.event === 'error')).toBe(true);
  });

  it('returns presence only for userIds the requester shares a chat with', async () => {
    vi.mocked(ChatParticipant.findAll)
      // 1st call: requester's chat memberships
      .mockResolvedValueOnce([{ chat_id: 'chat-a' }] as never)
      // 2nd call: co-participants in those chats matching requested ids
      .mockResolvedValueOnce([{ participant_id: sharedChatPeer }] as never);

    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    const payload = await callGetPresence(socket, [sharedChatPeer, strangerId]);

    expect(payload).toBeDefined();
    expect(Object.keys(payload!)).toEqual([sharedChatPeer]);
    expect(payload![strangerId]).toBeUndefined();
  });

  it('includes same-rescue staff for rescue-staff requesters', async () => {
    // No shared chats.
    vi.mocked(ChatParticipant.findAll).mockResolvedValue([]);
    vi.mocked(StaffMember.findAll).mockResolvedValue([{ userId: sameRescuePeer }] as never);

    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    // Inject rescueId after construction — the connection handler sets
    // it from loadSocketAuthState which is stubbed away here.
    (socket as unknown as { rescueId: string }).rescueId = 'rescue-1';

    const payload = await callGetPresence(socket, [sameRescuePeer, strangerId]);

    expect(payload).toBeDefined();
    expect(Object.keys(payload!)).toContain(sameRescuePeer);
    expect(payload![strangerId]).toBeUndefined();
  });

  it('returns presence for all requested ids when requester is an admin', async () => {
    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    (socket as unknown as { role: string }).role = 'admin';

    const payload = await callGetPresence(socket, [strangerId, sameRescuePeer]);

    expect(payload).toBeDefined();
    expect(Object.keys(payload!).sort()).toEqual([strangerId, sameRescuePeer].sort());
    // Admin short-circuit skips DB lookups for participant/staff scoping.
    expect(vi.mocked(ChatParticipant.findAll)).not.toHaveBeenCalled();
    expect(vi.mocked(StaffMember.findAll)).not.toHaveBeenCalled();
  });

  it('always includes the requester in the response when they ask about themselves', async () => {
    const { socket } = buildHandlersWithSocket({ id: 'socket-1', userId: requesterId });
    const payload = await callGetPresence(socket, [requesterId]);

    expect(payload).toBeDefined();
    expect(payload![requesterId]).toBeDefined();
  });
});
