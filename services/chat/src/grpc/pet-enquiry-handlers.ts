// OpenPetEnquiry — an adopter's question about a pet, before any application.
//
// Every other chat is anchored to an application (ADS-918), so "Ask a
// question before applying" on the pet page always failed. An enquiry is a
// chat with a pet_id and no application_id, created_by the adopter, whose
// only participant is that adopter. It belongs to the pet's rescue as a
// shared inbox: handlers.ts lets any staff member of that rescue read and
// reply (isParticipantOrAdmin), lists it to them (ListChats) and fans its
// messages out to them (SendMessage).
//
// The rescue comes from service.pets, resolved under the caller's own
// principal — never from the client. One live enquiry per adopter and pet
// (unique index chats_pet_enquiry_unique, migration 008): asking again
// returns the existing chat.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { CHAT_CREATE } from '@adopt-dont-shop/lib.types';
import type {
  GetPetResponse,
  OpenChatResponse,
  OpenPetEnquiryRequest,
} from '@adopt-dont-shop/proto';
import { principalToMetadata } from '@adopt-dont-shop/service-bootstrap';

import { chatRowToProto, HandlerError, type ChatRow, type HandlerDeps } from './handlers.js';
import type { PetsClient } from './pets-client.js';

const CROSS_SERVICE_GRPC_NOT_FOUND = 5;
const CROSS_SERVICE_GRPC_PERMISSION_DENIED = 7;

export function makeOpenPetEnquiry(
  petsClient: PetsClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: OpenPetEnquiryRequest
) => Promise<OpenChatResponse> {
  return async (deps, principal, req) => {
    if (!req.petId) {
      throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
    }
    if (!hasPermission(principal, CHAT_CREATE)) {
      throw new HandlerError('PERMISSION_DENIED', `'${CHAT_CREATE}' required`);
    }

    const rescueId = await resolvePetRescueId(petsClient, principal, req.petId);
    if (principal.rescueId === rescueId) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        "rescue staff can't open an enquiry about their own rescue's pet"
      );
    }

    const existing = await findEnquiry(deps, req.petId, principal.userId);
    if (existing) {
      return { chat: await chatRowToProto(deps, existing), created: false };
    }

    const chatId = randomUUID();
    let inserted: ChatRow | undefined;
    await withTransaction(deps, async ({ client, publish }) => {
      const res = await client.query<ChatRow>(
        `
        INSERT INTO chats (chat_id, application_id, rescue_id, pet_id, created_by, created_at, updated_at)
        VALUES ($1, NULL, $2, $3, $4, now(), now())
        ON CONFLICT (pet_id, created_by)
          WHERE application_id IS NULL AND pet_id IS NOT NULL AND deleted_at IS NULL
          DO NOTHING
        RETURNING *
        `,
        [chatId, rescueId, req.petId, principal.userId]
      );
      inserted = res.rows[0];
      if (!inserted) {
        // A concurrent request for the same adopter and pet won; its row is
        // read back below.
        return;
      }
      await client.query(
        `
        INSERT INTO chat_participants (chat_participant_id, chat_id, participant_id, role)
        VALUES ($1, $2, $3, 'member')
        `,
        [randomUUID(), chatId, principal.userId]
      );
      publish({
        type: 'chat.created',
        id: `chat.created.${chatId}`,
        payload: {
          chatId,
          petId: req.petId,
          rescueId,
          participantUserIds: [principal.userId],
        },
      });
    });

    if (inserted) {
      return { chat: await chatRowToProto(deps, inserted), created: true };
    }
    const winner = await findEnquiry(deps, req.petId, principal.userId);
    if (!winner) {
      throw new HandlerError('INTERNAL', 'enquiry insert returned no row');
    }
    return { chat: await chatRowToProto(deps, winner), created: false };
  };
}

async function findEnquiry(
  deps: HandlerDeps,
  petId: string,
  userId: string
): Promise<ChatRow | undefined> {
  const { rows } = await deps.pool.query<ChatRow>(
    `
    SELECT * FROM chats
    WHERE pet_id = $1 AND created_by = $2 AND application_id IS NULL AND deleted_at IS NULL
    LIMIT 1
    `,
    [petId, userId]
  );
  return rows[0];
}

async function resolvePetRescueId(
  petsClient: PetsClient,
  principal: Principal,
  petId: string
): Promise<string> {
  let res: GetPetResponse;
  try {
    res = await petsClient.getPet({ petId }, principalToMetadata(principal));
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined;
    if (code === CROSS_SERVICE_GRPC_NOT_FOUND) {
      throw new HandlerError('NOT_FOUND', `pet ${petId} not found`);
    }
    if (code === CROSS_SERVICE_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not authorized to view this pet');
    }
    throw new HandlerError('INTERNAL', 'failed to resolve pet');
  }
  const rescueId = res.pet?.rescueId;
  if (!rescueId) {
    throw new HandlerError('NOT_FOUND', `pet ${petId} not found`);
  }
  return rescueId;
}
