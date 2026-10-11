import type { Metadata } from '@grpc/grpc-js';
import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import {
  CHAT_CREATE,
  CHAT_VIEW,
  MESSAGES_SEND,
  type RescueId,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import { PetsV1 } from '@adopt-dont-shop/proto';

import type { HandlerDeps } from './handlers.js';
import { makeOpenPetEnquiry } from './pet-enquiry-handlers.js';
import type { PetsClient } from './pets-client.js';

const PET_RESCUE_ID = '11111111-1111-1111-1111-111111111111';

const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [CHAT_CREATE, CHAT_VIEW, MESSAGES_SEND],
};

const NO_CHAT_CREATE: Principal = {
  userId: 'usr-reader' as UserId,
  roles: ['adopter'],
  permissions: [CHAT_VIEW],
};

const STAFF_OF_PET_RESCUE: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [CHAT_CREATE, CHAT_VIEW, MESSAGES_SEND],
  rescueId: PET_RESCUE_ID as RescueId,
};

const enquiryRow = (overrides: Record<string, unknown> = {}) => ({
  chat_id: 'chat-enquiry',
  application_id: null,
  rescue_id: PET_RESCUE_ID,
  pet_id: 'pet-1',
  status: 'active' as const,
  created_at: new Date('2026-06-01T00:00:00Z'),
  updated_at: new Date('2026-06-01T00:00:00Z'),
  ...overrides,
});

function makeMocks() {
  const clientScript: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK' || /event_outbox/i.test(sql)) {
        return { rows: [] };
      }
      const next = clientScript.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const poolScript: Array<{ rows: unknown[] }> = [];
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
    query: vi.fn(async () => poolScript.shift() ?? { rows: [] }),
  };
  const publish = vi.fn();
  const nats = { publish, jetstream: () => ({ publish }) };
  const getPet = vi.fn().mockResolvedValue({
    pet: PetsV1.Pet.fromPartial({ petId: 'pet-1', rescueId: PET_RESCUE_ID }),
  });
  const petsClient: PetsClient = { getPet, close: vi.fn() };
  const deps: HandlerDeps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  };
  return {
    deps,
    pool,
    client: client as unknown as PoolClient,
    clientMock: client,
    clientScript,
    poolScript,
    publish,
    getPet,
    petsClient,
  };
}

const businessClientQueries = (mocks: ReturnType<typeof makeMocks>): string[] =>
  (mocks.clientMock.query.mock.calls as Array<[string]>)
    .map(([sql]) => sql)
    .filter(sql => !/event_outbox/i.test(sql))
    .map(sql => sql.trim().split(/\s+/)[0].toUpperCase())
    .filter(op => op !== 'BEGIN' && op !== 'COMMIT' && op !== 'ROLLBACK');

describe('openPetEnquiry', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let openPetEnquiry: ReturnType<typeof makeOpenPetEnquiry>;

  beforeEach(() => {
    mocks = makeMocks();
    openPetEnquiry = makeOpenPetEnquiry(mocks.petsClient);
  });

  it("opens an enquiry owned by the pet's rescue, with the adopter as its participant", async () => {
    // no existing enquiry
    mocks.poolScript.push({ rows: [] });
    // INSERT chat, INSERT participant
    mocks.clientScript.push({ rows: [enquiryRow()] });
    mocks.clientScript.push({ rows: [] });
    // chatRowToProto: participants, last message
    mocks.poolScript.push({ rows: [{ participant_id: 'usr-adopter' }] });
    mocks.poolScript.push({ rows: [] });

    const res = await openPetEnquiry(mocks.deps, ADOPTER, { petId: 'pet-1' });

    expect(res.created).toBe(true);
    expect(res.chat).toMatchObject({
      chatId: 'chat-enquiry',
      petId: 'pet-1',
      rescueId: PET_RESCUE_ID,
      participantUserIds: ['usr-adopter'],
    });
    const [insertSql, insertParams] = mocks.clientMock.query.mock.calls.find(([sql]) =>
      /INSERT INTO chats/.test(sql as string)
    ) as [string, unknown[]];
    expect(insertSql).toContain('ON CONFLICT');
    expect(insertParams).toEqual(expect.arrayContaining([PET_RESCUE_ID, 'pet-1', 'usr-adopter']));
    expect(mocks.publish.mock.calls[0][0]).toBe('chat.created');
  });

  it("takes the rescue from the pets service under the caller's own principal", async () => {
    mocks.poolScript.push({ rows: [enquiryRow()] });

    await openPetEnquiry(mocks.deps, ADOPTER, { petId: 'pet-1' });

    const [req, metadata] = mocks.getPet.mock.calls[0] as [unknown, Metadata];
    expect(req).toEqual({ petId: 'pet-1' });
    expect(metadata.get('x-user-id')).toEqual(['usr-adopter']);
  });

  it('returns the existing enquiry when the adopter asks about the same pet again', async () => {
    mocks.poolScript.push({ rows: [enquiryRow()] });

    const res = await openPetEnquiry(mocks.deps, ADOPTER, { petId: 'pet-1' });

    expect(res.created).toBe(false);
    expect(res.chat?.chatId).toBe('chat-enquiry');
    expect(businessClientQueries(mocks)).toEqual([]);
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('returns the winning enquiry when a concurrent request created it first', async () => {
    mocks.poolScript.push({ rows: [] });
    // INSERT ... ON CONFLICT DO NOTHING inserts nothing
    mocks.clientScript.push({ rows: [] });
    // re-read finds the other request's row
    mocks.poolScript.push({ rows: [enquiryRow({ chat_id: 'chat-winner' })] });

    const res = await openPetEnquiry(mocks.deps, ADOPTER, { petId: 'pet-1' });

    expect(res.created).toBe(false);
    expect(res.chat?.chatId).toBe('chat-winner');
    expect(businessClientQueries(mocks)).toEqual(['INSERT']);
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it("refuses staff enquiring about their own rescue's pet", async () => {
    await expect(
      openPetEnquiry(mocks.deps, STAFF_OF_PET_RESCUE, { petId: 'pet-1' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  it('requires chats.create', async () => {
    await expect(
      openPetEnquiry(mocks.deps, NO_CHAT_CREATE, { petId: 'pet-1' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.getPet).not.toHaveBeenCalled();
  });

  it('requires a pet id', async () => {
    await expect(openPetEnquiry(mocks.deps, ADOPTER, { petId: '' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('returns NOT_FOUND for a pet the caller cannot see', async () => {
    mocks.getPet.mockRejectedValueOnce({ code: 5 });

    await expect(openPetEnquiry(mocks.deps, ADOPTER, { petId: 'gone' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('returns INTERNAL when the pets service is unreachable', async () => {
    mocks.getPet.mockRejectedValueOnce({ code: 14 });

    await expect(openPetEnquiry(mocks.deps, ADOPTER, { petId: 'pet-1' })).rejects.toMatchObject({
      code: 'INTERNAL',
    });
  });
});
