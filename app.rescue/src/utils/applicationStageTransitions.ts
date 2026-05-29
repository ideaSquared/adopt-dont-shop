/**
 * ADS-642: stage-aware bulk actions on the rescue applications queue.
 *
 * Backend status state-machine is intentionally simple — `submitted →
 * {approved, rejected, withdrawn}` is the only resolution path. The
 * five "stages" (PENDING → REVIEWING → VISITING → DECIDING → RESOLVED)
 * are a richer workflow layered on top via the `stage` column. This
 * module is the single source of truth for which bulk action can apply
 * to a row given its current stage and supporting data, so the queue's
 * "Move to next stage" button and per-stage Reject/Approve/Withdraw
 * buttons stay honest about which rows are eligible.
 *
 * Preconditions are evaluated client-side for UX (so we can tell the
 * user which rows blocked the action before any HTTP traffic). The
 * authoritative state still lives in the backend — failed rows surface
 * via the bulk-update response's `failures` array.
 */
import type { ApplicationListItem } from '../types/applications';
import type { ApplicationStage } from '../types/applicationStages';

export type BulkStageAction = 'advance' | 'approve' | 'reject' | 'withdraw';

export type NextStageMap = Partial<Record<ApplicationStage, ApplicationStage>>;

/**
 * Linear forward progression between non-terminal stages. RESOLVED is
 * terminal — there is no "next" so advance is blocked for resolved
 * rows. From DECIDING, "advance" resolves the application (which we
 * gate behind explicit Approve, not the generic advance button — see
 * canApplyBulkAction).
 */
export const NEXT_STAGE: NextStageMap = {
  PENDING: 'REVIEWING',
  REVIEWING: 'VISITING',
  VISITING: 'DECIDING',
};

export type BlockedReason =
  | 'already-resolved'
  | 'home-visit-not-completed'
  | 'not-in-deciding-stage'
  | 'no-next-stage';

export type ActionEligibility =
  | { eligible: true }
  | { eligible: false; reason: BlockedReason; message: string };

const RESOLVED_STAGE: ApplicationStage = 'RESOLVED';

const isResolved = (app: Pick<ApplicationListItem, 'stage'>): boolean =>
  app.stage === RESOLVED_STAGE;

/**
 * Whether the given bulk action can apply to this row right now. The
 * caller uses this to split the selection into "will run" vs
 * "blocked" so the UI can report what was skipped and why.
 */
export const canApplyBulkAction = (
  action: BulkStageAction,
  app: ApplicationListItem
): ActionEligibility => {
  if (isResolved(app)) {
    return {
      eligible: false,
      reason: 'already-resolved',
      message: 'Application is already resolved',
    };
  }

  if (action === 'advance') {
    const next = NEXT_STAGE[app.stage];
    if (!next) {
      return {
        eligible: false,
        reason: 'no-next-stage',
        message: 'No next stage from DECIDING — use Approve or Reject to resolve',
      };
    }
    return { eligible: true };
  }

  if (action === 'approve') {
    if (app.stage !== 'DECIDING') {
      return {
        eligible: false,
        reason: 'not-in-deciding-stage',
        message: 'Approve only applies to DECIDING applications',
      };
    }
    if (app.homeVisitStatus !== 'completed') {
      return {
        eligible: false,
        reason: 'home-visit-not-completed',
        message: 'Home visit must be completed before approval',
      };
    }
    return { eligible: true };
  }

  // 'reject' and 'withdraw' apply to any non-resolved application.
  return { eligible: true };
};

/**
 * The update payload to send to the backend bulk-update endpoint for a
 * given action. Stage advances write `stage`; resolutions write
 * `status` + `stage` + `finalOutcome` (+ optional reason) so the row
 * lands in a consistent state.
 */
export type BulkUpdatePayload = {
  status?: 'approved' | 'rejected' | 'withdrawn';
  stage?: 'pending' | 'reviewing' | 'visiting' | 'deciding' | 'resolved' | 'withdrawn';
  finalOutcome?: 'approved' | 'rejected' | 'withdrawn';
  rejectionReason?: string;
  withdrawalReason?: string;
};

export const buildBulkUpdatePayload = (
  action: BulkStageAction,
  app: ApplicationListItem,
  reason?: string
): BulkUpdatePayload => {
  if (action === 'advance') {
    const next = NEXT_STAGE[app.stage];
    if (!next) {
      throw new Error('buildBulkUpdatePayload called for advance on a row with no next stage');
    }
    return { stage: next.toLowerCase() as BulkUpdatePayload['stage'] };
  }
  if (action === 'approve') {
    return { status: 'approved', stage: 'resolved', finalOutcome: 'approved' };
  }
  if (action === 'reject') {
    return {
      status: 'rejected',
      stage: 'resolved',
      finalOutcome: 'rejected',
      rejectionReason: reason,
    };
  }
  // withdraw
  return {
    status: 'withdrawn',
    stage: 'withdrawn',
    finalOutcome: 'withdrawn',
    withdrawalReason: reason,
  };
};

/**
 * Per-stage counts derived from a list of applications. Pure function
 * so the queue's count summary and any other consumer can share the
 * same accounting rules.
 */
export type StageCounts = Record<ApplicationStage, number>;

export const countByStage = (
  apps: ReadonlyArray<Pick<ApplicationListItem, 'stage'>>
): StageCounts => {
  const counts: StageCounts = {
    PENDING: 0,
    REVIEWING: 0,
    VISITING: 0,
    DECIDING: 0,
    RESOLVED: 0,
  };
  for (const app of apps) {
    if (app.stage in counts) {
      counts[app.stage] += 1;
    }
  }
  return counts;
};
