// gRPC handler implementations for ApplicationService — batch 2.
//
// Phase 5.3b — the review / home-visit / decision lifecycle:
// StartReview, ScheduleHomeVisit, CompleteHomeVisit, Approve, Reject,
// Withdraw, MarkAdopted. Draft handlers shipped in #930 (and share the
// runCommand machinery from command-runner.ts).
//
// State machine (from the pure domain in #879):
//   submitted → under_review → home_visit_scheduled →
//   home_visit_completed → approved | rejected | withdrawn → adopted
//
// Authz:
//   - The review/visit/decision actions are rescue-staff operations —
//     gate on APPLICATIONS_PROCESS (review/visit) /
//     APPLICATIONS_APPROVE / APPLICATIONS_REJECT.
//   - Withdraw is adopter-OR-staff (an adopter withdraws their own
//     application; staff can withdraw on their behalf). Gated on
//     APPLICATIONS_UPDATE.
//   - MarkAdopted is a staff action (the pet was collected) — gate on
//     APPLICATIONS_APPROVE.
//
// Every handler is `(deps, principal, request) → Promise<response>`
// and routes through runCommand: load → handle → append → project →
// publish-after-commit.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import {
  APPLICATIONS_APPROVE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_REJECT,
  APPLICATIONS_UPDATE,
  type Permission,
} from '@adopt-dont-shop/lib.types';
import {
  ApplicationsV1,
  type ApproveRequest,
  type ApproveResponse,
  type CompleteHomeVisitRequest,
  type CompleteHomeVisitResponse,
  type MarkAdoptedRequest,
  type MarkAdoptedResponse,
  type RejectRequest,
  type RejectResponse,
  type ScheduleHomeVisitRequest,
  type ScheduleHomeVisitResponse,
  type StartReviewRequest,
  type StartReviewResponse,
  type WithdrawRequest,
  type WithdrawResponse,
} from '@adopt-dont-shop/proto';

import type { ApplicationCommand, HomeVisitOutcome } from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { requireOwnerOrRescueScope, requireRescueScope, runCommand } from './command-runner.js';
import { homeVisitOutcomeToDb } from './enum-map.js';
import { stateToProto } from './state-mapper.js';

function ensure(principal: Principal, permission: Permission): void {
  if (!requirePermission(principal, permission)) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

function requireApplicationId(applicationId: string | undefined): string {
  if (applicationId === undefined || applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }
  return applicationId;
}

// --- StartReview -----------------------------------------------------

export async function startReview(
  deps: HandlerDeps,
  principal: Principal,
  req: StartReviewRequest
): Promise<StartReviewResponse> {
  ensure(principal, APPLICATIONS_PROCESS);
  const id = requireApplicationId(req.applicationId);

  const command: ApplicationCommand = {
    type: 'startReview',
    actorUserId: principal.userId,
    note: req.note ?? null,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.reviewStarted',
      id,
      payload: { applicationId: id, reviewerId: principal.userId, rescueId: s.rescueId },
    }),
    s => requireRescueScope(principal, APPLICATIONS_PROCESS, s)
  );

  return { application: stateToProto(state) };
}

// --- ScheduleHomeVisit -----------------------------------------------

export async function scheduleHomeVisit(
  deps: HandlerDeps,
  principal: Principal,
  req: ScheduleHomeVisitRequest
): Promise<ScheduleHomeVisitResponse> {
  ensure(principal, APPLICATIONS_PROCESS);
  const id = requireApplicationId(req.applicationId);
  if (req.scheduledAt === undefined || req.scheduledAt === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'scheduled_at is required');
  }

  const command: ApplicationCommand = {
    type: 'scheduleHomeVisit',
    scheduledAt: req.scheduledAt,
    actorUserId: principal.userId,
    note: req.note ?? null,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.homeVisitScheduled',
      id,
      payload: {
        applicationId: id,
        adopterId: s.adopterId,
        rescueId: s.rescueId,
        scheduledAt: req.scheduledAt,
      },
    }),
    s => requireRescueScope(principal, APPLICATIONS_PROCESS, s)
  );

  return { application: stateToProto(state) };
}

// --- CompleteHomeVisit -----------------------------------------------

export async function completeHomeVisit(
  deps: HandlerDeps,
  principal: Principal,
  req: CompleteHomeVisitRequest
): Promise<CompleteHomeVisitResponse> {
  ensure(principal, APPLICATIONS_PROCESS);
  const id = requireApplicationId(req.applicationId);
  if (req.outcome === undefined || req.outcome === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'outcome is required');
  }

  // Map the proto HomeVisitOutcome → the domain string. The enum-map
  // homeVisitOutcomeToDb gives the DB form, which is the same string
  // the domain uses.
  const outcome = homeVisitOutcomeToDb(req.outcome) as HomeVisitOutcome;

  const command: ApplicationCommand = {
    type: 'completeHomeVisit',
    outcome,
    actorUserId: principal.userId,
    notes: req.notes ?? null,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.homeVisitCompleted',
      id,
      payload: { applicationId: id, adopterId: s.adopterId, rescueId: s.rescueId, outcome },
    }),
    s => requireRescueScope(principal, APPLICATIONS_PROCESS, s)
  );

  return { application: stateToProto(state) };
}

// --- Approve ---------------------------------------------------------

export async function approve(
  deps: HandlerDeps,
  principal: Principal,
  req: ApproveRequest
): Promise<ApproveResponse> {
  ensure(principal, APPLICATIONS_APPROVE);
  const id = requireApplicationId(req.applicationId);

  const command: ApplicationCommand = {
    type: 'approve',
    actorUserId: principal.userId,
    notes: req.notes ?? null,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.approved',
      id,
      payload: {
        applicationId: id,
        adopterId: s.adopterId,
        petId: s.petId,
        rescueId: s.rescueId,
        approvedBy: principal.userId,
      },
    }),
    s => requireRescueScope(principal, APPLICATIONS_APPROVE, s)
  );

  return { application: stateToProto(state) };
}

// --- Reject ----------------------------------------------------------

export async function reject(
  deps: HandlerDeps,
  principal: Principal,
  req: RejectRequest
): Promise<RejectResponse> {
  ensure(principal, APPLICATIONS_REJECT);
  const id = requireApplicationId(req.applicationId);
  if (req.reason === undefined || req.reason === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'reason is required');
  }

  const command: ApplicationCommand = {
    type: 'reject',
    actorUserId: principal.userId,
    reason: req.reason,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.rejected',
      id,
      payload: {
        applicationId: id,
        adopterId: s.adopterId,
        petId: s.petId,
        rescueId: s.rescueId,
        rejectedBy: principal.userId,
        reason: req.reason,
      },
    }),
    s => requireRescueScope(principal, APPLICATIONS_REJECT, s)
  );

  return { application: stateToProto(state) };
}

// --- Withdraw --------------------------------------------------------

export async function withdraw(
  deps: HandlerDeps,
  principal: Principal,
  req: WithdrawRequest
): Promise<WithdrawResponse> {
  // Adopter-or-staff. An adopter withdraws their own application; staff
  // can withdraw on their behalf. The base APPLICATIONS_UPDATE gate is the
  // cheap upfront check; the runCommand authorize hook then enforces that
  // the principal is the owning adopter OR scoped to the owning rescue
  // (the loaded aggregate carries both).
  ensure(principal, APPLICATIONS_UPDATE);
  const id = requireApplicationId(req.applicationId);

  const command: ApplicationCommand = {
    type: 'withdraw',
    actorUserId: principal.userId,
    reason: req.reason ?? null,
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.withdrawn',
      id,
      payload: {
        applicationId: id,
        adopterId: s.adopterId,
        rescueId: s.rescueId,
        withdrawnBy: principal.userId,
      },
    }),
    s => requireOwnerOrRescueScope(principal, APPLICATIONS_UPDATE, s)
  );

  return { application: stateToProto(state) };
}

// --- MarkAdopted -----------------------------------------------------

export async function markAdopted(
  deps: HandlerDeps,
  principal: Principal,
  req: MarkAdoptedRequest
): Promise<MarkAdoptedResponse> {
  ensure(principal, APPLICATIONS_APPROVE);
  const id = requireApplicationId(req.applicationId);

  const command: ApplicationCommand = {
    type: 'markAdopted',
    at: new Date().toISOString(),
  };

  const state = await runCommand(
    deps,
    id,
    command,
    principal.userId,
    s => ({
      type: 'applications.adopted',
      id,
      payload: { applicationId: id, adopterId: s.adopterId, petId: s.petId, rescueId: s.rescueId },
    }),
    s => requireRescueScope(principal, APPLICATIONS_APPROVE, s)
  );

  return { application: stateToProto(state) };
}

// Re-export so the gRPC server boot can register the proto enum
// helper without a deep import (keeps the server's import surface
// small).
export { ApplicationsV1 };
