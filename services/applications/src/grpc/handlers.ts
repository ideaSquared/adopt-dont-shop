// gRPC handler implementations for ApplicationService — batch 1.
//
// Draft handlers: StartDraft, SaveDraftAnswers, SubmitDraft.
// StartDraft (Phase 5.5) is the create-flow — it resolves pet → rescue
// via the service.pets gRPC client before commanding the domain (the
// cross-schema FK the proto request can't carry), then mints a fresh
// aggregate via runCreateCommand. SaveDraftAnswers + SubmitDraft
// (Phase 5.3b) operate on an existing aggregate with optimistic
// concurrency. The review/visit/decision RPCs live in
// review-handlers.ts and the read RPCs in read-handlers.ts.
//
// This is the EVENT-SOURCED vertical. Each write handler:
//   1. loadAggregate — fold the event stream into current state
//   2. domain.handle(state, command) — pure, produces new events
//   3. appendEvents — INSERT with optimistic-concurrency versions
//   4. projectReadModel — UPSERT the read-model row
//   5. publish after commit
// All inside one withTransaction so the event append + projection
// commit atomically.
//
// Optimistic concurrency: SaveDraftAnswers + SubmitDraft carry an
// expected_version; a mismatch (or a concurrent writer racing the
// INSERT) surfaces as a CONCURRENCY HandlerError the gateway maps to
// a 409.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { APPLICATIONS_CREATE, APPLICATIONS_UPDATE, type UserId } from '@adopt-dont-shop/lib.types';
import type {
  SaveDraftAnswersRequest,
  SaveDraftAnswersResponse,
  StartDraftRequest,
  StartDraftResponse,
  SubmitDraftRequest,
  SubmitDraftResponse,
} from '@adopt-dont-shop/proto';

import type { ApplicationCommand, Reference } from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { runCommand, runCreateCommand } from './command-runner.js';
import type { PetsClient } from './pets-client.js';
import { principalToMetadata } from './principal.js';
import { stateToProto } from './state-mapper.js';

// --- StartDraft ------------------------------------------------------
//
// The only command on a fresh aggregate, and the only one needing a
// cross-vertical lookup: StartDraftRequest carries pet_id but not the
// rescue that owns it, and the pure domain requires the rescueId. So
// the handler resolves pet → rescue via service.pets before commanding
// the domain. It's a factory closing over the PetsClient so the gRPC
// server boot injects the real client and tests inject a stub.
//
// The grpc-js status codes service.pets can return are mapped onto our
// HandlerError codes: a missing pet is the caller's bad pet_id (400),
// not our 404; a denied pets read propagates as PERMISSION_DENIED.

const PETS_GRPC_NOT_FOUND = 5;
const PETS_GRPC_PERMISSION_DENIED = 7;

export function makeStartDraft(
  petsClient: PetsClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: StartDraftRequest
) => Promise<StartDraftResponse> {
  return async (deps, principal, req) => {
    if (req.adopterId === undefined || req.adopterId === '') {
      throw new HandlerError('INVALID_ARGUMENT', 'adopter_id is required');
    }
    if (req.petId === undefined || req.petId === '') {
      throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
    }
    // Adopters mint their own drafts; super_admin can mint for anyone.
    if (!requirePermission(principal, APPLICATIONS_CREATE, { userId: req.adopterId as UserId })) {
      throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_CREATE}' required`);
    }

    const rescueId = await resolveRescueId(petsClient, principal, req.petId);

    const command: ApplicationCommand = {
      type: 'startDraft',
      adopterId: req.adopterId,
      petId: req.petId,
      rescueId,
      at: new Date().toISOString(),
    };

    const state = await runCreateCommand(deps, command, principal.userId, s => ({
      type: 'applications.draftCreated',
      id: s.applicationId,
      payload: {
        applicationId: s.applicationId,
        adopterId: s.adopterId,
        petId: s.petId,
        rescueId: s.rescueId,
      },
    }));

    return { application: stateToProto(state) };
  };
}

async function resolveRescueId(
  petsClient: PetsClient,
  principal: Principal,
  petId: string
): Promise<string> {
  let res;
  try {
    res = await petsClient.getPet({ petId }, principalToMetadata(principal));
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === PETS_GRPC_NOT_FOUND) {
      throw new HandlerError('INVALID_ARGUMENT', `pet ${petId} not found`);
    }
    if (code === PETS_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not allowed to read the pet');
    }
    throw new HandlerError('INTERNAL', 'failed to resolve pet rescue');
  }

  const rescueId = res.pet?.rescueId;
  if (rescueId === undefined || rescueId === '') {
    throw new HandlerError('INVALID_ARGUMENT', `pet ${petId} has no owning rescue`);
  }
  return rescueId;
}

// --- SaveDraftAnswers ------------------------------------------------

export async function saveDraftAnswers(
  deps: HandlerDeps,
  principal: Principal,
  req: SaveDraftAnswersRequest
): Promise<SaveDraftAnswersResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  const answersPatch = parseJsonObject(req.answersPatchJson, 'answers_patch_json');
  // references_json absent/empty = leave unchanged (null tells the
  // domain not to replace the references list).
  const references = parseReferences(req.referencesJson);

  // Pre-check expected_version against the loaded aggregate so a stale
  // client gets a clean CONCURRENCY without even running the command.
  const command: ApplicationCommand = {
    type: 'saveDraftAnswers',
    expectedVersion: req.expectedVersion,
    answersPatch,
    references,
    at: new Date().toISOString(),
  };

  const state = await runCommand(deps, req.applicationId, command, principal.userId, () => ({
    type: 'applications.draftUpdated',
    id: req.applicationId,
    payload: { applicationId: req.applicationId },
  }));

  return { application: stateToProto(state) };
}

// --- SubmitDraft -----------------------------------------------------

export async function submitDraft(
  deps: HandlerDeps,
  principal: Principal,
  req: SubmitDraftRequest
): Promise<SubmitDraftResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  const command: ApplicationCommand = {
    type: 'submitDraft',
    expectedVersion: req.expectedVersion,
    at: new Date().toISOString(),
  };

  const state = await runCommand(deps, req.applicationId, command, principal.userId, s => ({
    type: 'applications.submitted',
    id: req.applicationId,
    payload: {
      applicationId: req.applicationId,
      adopterId: s.adopterId,
      petId: s.petId,
      rescueId: s.rescueId,
      submittedAt: s.submittedAt,
    },
  }));

  return { application: stateToProto(state) };
}

// --- Helpers ---------------------------------------------------------

function parseJsonObject(raw: string | undefined, field: string): Record<string, unknown> {
  if (raw === undefined || raw === '') {
    return {};
  }
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new Error(`${field} must encode a JSON object`);
    }
    return obj as Record<string, unknown>;
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `${field} invalid: ${(err as Error).message}`);
  }
}

// references_json is an optional wholesale replacement. Empty / absent
// = null (the domain leaves references unchanged). A present value must
// be a JSON array of {name, email, relationship}.
function parseReferences(raw: string | undefined): ReadonlyArray<Reference> | null {
  if (raw === undefined || raw === '') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `references_json invalid: ${(err as Error).message}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'references_json must encode a JSON array');
  }
  return parsed.map((r, i) => {
    const ref = r as Record<string, unknown>;
    if (
      typeof ref.name !== 'string' ||
      typeof ref.email !== 'string' ||
      typeof ref.relationship !== 'string'
    ) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `references_json[${i}] must have name, email, relationship strings`
      );
    }
    return { name: ref.name, email: ref.email, relationship: ref.relationship };
  });
}
