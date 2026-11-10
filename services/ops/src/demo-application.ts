import { z } from 'zod';

import {
  ADMIN_USERS_DEACTIVATE,
  ADMIN_USERS_READ,
  ADMIN_USERS_SEARCH,
  ADMIN_USERS_UPDATE,
  APPLICATIONS_APPROVE,
  APPLICATIONS_CREATE,
  APPLICATIONS_PROCESS,
  APPLICATIONS_REJECT,
  APPLICATIONS_UPDATE,
  APPLICATIONS_VIEW,
  PETS_VIEW,
  type Permission,
} from '@adopt-dont-shop/lib.types';

import {
  ALPHANUMERIC,
  arrayAt,
  DEMO_EMAIL_PATTERN,
  generatePassword,
  objectAt,
  randomString,
  str,
} from './demo-rescue.js';
import { OpsError } from './errors.js';
import type { CallDownstream, DownstreamStep, JsonObject } from './registry.js';
import { createDemoAdopter } from './demo-accounts.js';

// `pnpm ops demo create-application` / `delete-application`: a demo adopter and
// an adoption application from them, for testing the rescue review flow in dev
// and staging. The adopter's own steps (start, answer, submit) run as that
// adopter, because the applications handlers only accept a draft from its
// owner; every later step runs as rescue staff scoped to the rescue, with only
// the permission that handler checks. Nothing rolls back across services: a
// failure names what was already created.

const STAGES = [
  'submitted',
  'under_review',
  'home_visit_scheduled',
  'home_visit_completed',
  'approved',
  'rejected',
] as const;
type Stage = (typeof STAGES)[number];

const HOME_VISIT_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

const CreateRequestSchema = z.object({
  rescueId: z.uuid(),
  petId: z.uuid().optional(),
  stage: z.enum(STAGES).optional(),
});

const DeleteRequestSchema = z.object({ applicationId: z.uuid(), rescueId: z.uuid() });

const parseRequest = <T>(schema: z.ZodType<T>, request: JsonObject): T => {
  const parsed = schema.safeParse(request);
  if (!parsed.success) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Invalid request: ${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      `rescueId, petId and applicationId are UUIDs; stage is one of ${STAGES.join(', ')}.`
    );
  }
  return parsed.data;
};

export const validateCreateApplicationRequest = (request: JsonObject): void => {
  parseRequest(CreateRequestSchema, request);
};

export const validateDeleteApplicationRequest = (request: JsonObject): void => {
  parseRequest(DeleteRequestSchema, request);
};

// Re-throw a step failure with a cleanup hint for what was already created.
const withCleanup = async <T>(cleanup: string, step: () => Promise<T>): Promise<T> => {
  try {
    return await step();
  } catch (err) {
    const base =
      err instanceof OpsError
        ? err
        : new OpsError('INTERNAL', 'Unexpected failure', 'Check the service.ops logs.');
    throw new OpsError(base.code, base.message, cleanup);
  }
};

// A plausible answer for one question definition. File questions get none: a
// file cannot be faked without storing one.
const answerFor = (question: JsonObject, email: string): unknown => {
  const options = Array.isArray(question.options)
    ? question.options.filter((o): o is string => typeof o === 'string')
    : [];
  switch (str(question.questionType)) {
    case 'email':
      return email;
    case 'phone':
      return '07700 900123';
    case 'number':
      return 2;
    case 'boolean':
      return true;
    case 'select':
      return options[0] ?? 'Yes';
    case 'multi_select':
      return options.slice(0, 1);
    case 'address':
      return '1 Demo Street, London, SW1A 1AA';
    case 'date':
      return '1990-01-01';
    case 'file':
      return undefined;
    default:
      return 'A demo answer for testing.';
  }
};

const buildAnswers = (questions: readonly JsonObject[], email: string): JsonObject =>
  Object.fromEntries(
    questions
      .filter(q => q.isEnabled === true)
      .flatMap(q => {
        const key = str(q.questionKey);
        const answer = answerFor(q, email);
        return key === undefined || answer === undefined ? [] : [[key, answer]];
      })
  );

type StaffStep = { rpc: string; request: JsonObject; permission: Permission };

// The staff steps that take a submitted application to each later stage.
const staffStepsFor = (stage: Stage, applicationId: string): readonly StaffStep[] => {
  const startReview: StaffStep = {
    rpc: 'applications.StartReview',
    request: { applicationId, note: 'Demo review started.' },
    permission: APPLICATIONS_PROCESS,
  };
  const scheduleVisit: StaffStep = {
    rpc: 'applications.ScheduleHomeVisit',
    request: {
      applicationId,
      scheduledAt: new Date(Date.now() + HOME_VISIT_DELAY_MS).toISOString(),
      note: 'Demo home visit.',
    },
    permission: APPLICATIONS_PROCESS,
  };
  const completeVisit: StaffStep = {
    rpc: 'applications.CompleteHomeVisit',
    request: { applicationId, outcome: 'HOME_VISIT_OUTCOME_PASSED', notes: 'Demo visit passed.' },
    permission: APPLICATIONS_PROCESS,
  };
  const approve: StaffStep = {
    rpc: 'applications.Approve',
    request: { applicationId, notes: 'Demo approval.' },
    permission: APPLICATIONS_APPROVE,
  };
  const reject: StaffStep = {
    rpc: 'applications.Reject',
    request: { applicationId, reason: 'Demo rejection.' },
    permission: APPLICATIONS_REJECT,
  };
  const byStage: Record<Stage, readonly StaffStep[]> = {
    submitted: [],
    under_review: [startReview],
    home_visit_scheduled: [startReview, scheduleVisit],
    home_visit_completed: [startReview, scheduleVisit, completeVisit],
    approved: [startReview, approve],
    rejected: [startReview, reject],
  };
  return byStage[stage];
};

const pickPet = async (
  call: CallDownstream,
  rescueId: string,
  petId: string | undefined
): Promise<string> => {
  const step: DownstreamStep = { permissions: [PETS_VIEW], rescueId };
  if (petId === undefined) {
    const listed = await call(
      'pets.List',
      { rescueIdFilter: rescueId, statusFilter: 'PET_STATUS_AVAILABLE', limit: 1 },
      step
    );
    const first = str(arrayAt(listed, 'pets')[0]?.petId);
    if (first === undefined) {
      throw new OpsError(
        'INVALID_ARGUMENT',
        `Rescue ${rescueId} has no available pet`,
        'Add one with `pnpm ops demo create-rescue`, or pass --pet-id for an available pet.'
      );
    }
    return first;
  }
  const pet = objectAt(await call('pets.Get', { petId }, step), 'pet');
  if (str(pet.rescueId) !== rescueId) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Pet ${petId} does not belong to rescue ${rescueId}`,
      'Pass a pet of that rescue, or leave --pet-id out to use its first available pet.'
    );
  }
  if (str(pet.status) !== 'PET_STATUS_AVAILABLE') {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Pet ${petId} is not available for adoption`,
      'Pass an available pet, or leave --pet-id out to use the first available one.'
    );
  }
  return petId;
};

const versionOf = (res: JsonObject): number => {
  const version = objectAt(res, 'application').version;
  return typeof version === 'number' ? version : 0;
};

export const createDemoApplication = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const input = parseRequest(CreateRequestSchema, request);
  const { rescueId } = input;
  const stage = input.stage ?? 'submitted';

  // Read-only work first, so a bad rescue or pet creates nothing.
  const petId = await pickPet(call, rescueId, input.petId);
  const questions = await call(
    'rescue.ListApplicationQuestions',
    { rescueId },
    { permissions: [APPLICATIONS_VIEW], rescueId }
  );

  const adopter = await createDemoAdopter(call);
  const deactivate = `Already created: adopter user ${adopter.userId}. Remove it with \`pnpm ops demo delete-adopter ${adopter.userId}\`.`;
  const asAdopter = (permissions: readonly Permission[]) => ({
    permissions,
    actingUserId: adopter.userId,
  });

  const draft = await withCleanup(deactivate, () =>
    call(
      'applications.StartDraft',
      { adopterId: adopter.userId, petId },
      asAdopter([APPLICATIONS_CREATE, PETS_VIEW])
    )
  );
  const applicationId = str(objectAt(draft, 'application').applicationId);
  if (applicationId === undefined) {
    throw new OpsError(
      'INTERNAL',
      'applications.StartDraft returned no application id',
      deactivate
    );
  }
  const draftCleanup = `Already created: adopter user ${adopter.userId} and a draft application ${applicationId} (a draft cannot be withdrawn by staff). Remove the adopter with \`pnpm ops demo delete-adopter ${adopter.userId}\`.`;

  const saved = await withCleanup(draftCleanup, () =>
    call(
      'applications.SaveDraftAnswers',
      {
        applicationId,
        expectedVersion: versionOf(draft),
        answersPatchJson: JSON.stringify(
          buildAnswers(arrayAt(questions, 'questions'), adopter.email)
        ),
      },
      asAdopter([APPLICATIONS_UPDATE])
    )
  );
  await withCleanup(draftCleanup, () =>
    call(
      'applications.SubmitDraft',
      { applicationId, expectedVersion: versionOf(saved) },
      asAdopter([APPLICATIONS_UPDATE])
    )
  );

  const submittedCleanup = `Already created: adopter user ${adopter.userId} and application ${applicationId}. Remove them with \`pnpm ops demo delete-application ${applicationId} --rescue-id ${rescueId}\`.`;
  await staffStepsFor(stage, applicationId).reduce<Promise<void>>(async (prev, step) => {
    await prev;
    await withCleanup(submittedCleanup, () =>
      call(step.rpc, step.request, { permissions: [step.permission], rescueId })
    );
  }, Promise.resolve());

  return {
    applicationId,
    adopterUserId: adopter.userId,
    adopterEmail: adopter.email,
    adopterPassword: adopter.password,
    petId,
    stage,
    nextSteps: `Sign in to the client app as the adopter to see the application, or open it in the rescue app as that rescue's staff. Remove it later with \`pnpm ops demo delete-application ${applicationId} --rescue-id ${rescueId}\`.`,
  };
};

// Statuses the applications service lets a withdraw start from.
const WITHDRAWABLE = new Set([
  'APPLICATION_STATUS_SUBMITTED',
  'APPLICATION_STATUS_UNDER_REVIEW',
  'APPLICATION_STATUS_HOME_VISIT_SCHEDULED',
  'APPLICATION_STATUS_HOME_VISIT_COMPLETED',
]);

export const deleteDemoApplication = async (
  request: JsonObject,
  call: CallDownstream
): Promise<JsonObject> => {
  const { applicationId, rescueId } = parseRequest(DeleteRequestSchema, request);

  const found = await call(
    'applications.Get',
    { applicationId },
    { permissions: [APPLICATIONS_VIEW], rescueId }
  );
  const application = objectAt(found, 'application');
  const adopterId = str(application.adopterId);
  if (adopterId === undefined || str(application.rescueId) !== rescueId) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Application ${applicationId} does not belong to rescue ${rescueId}`,
      'Pass the rescue the application was made for (--rescue-id).'
    );
  }

  const adopter = objectAt(
    await call('auth.AdminGetUser', { userId: adopterId }, { permissions: [ADMIN_USERS_READ] }),
    'user'
  );
  if (!DEMO_EMAIL_PATTERN.test(str(adopter.email) ?? '')) {
    throw new OpsError(
      'INVALID_ARGUMENT',
      `Application ${applicationId} is not a demo application`,
      'delete-application only removes applications made by `pnpm ops demo create-application`.'
    );
  }

  const status = str(application.status) ?? 'APPLICATION_STATUS_UNSPECIFIED';
  const withdrawable = WITHDRAWABLE.has(status);
  if (withdrawable) {
    await call(
      'applications.Withdraw',
      { applicationId, reason: 'Demo application removed' },
      { permissions: [APPLICATIONS_UPDATE], rescueId }
    );
  }

  await call(
    'auth.DeactivateUser',
    { userId: adopterId, reason: 'Demo application removed' },
    { permissions: [ADMIN_USERS_DEACTIVATE] }
  );

  return {
    applicationId,
    action: withdrawable ? 'withdrawn' : 'left as is',
    status: withdrawable ? 'APPLICATION_STATUS_WITHDRAWN' : status,
    deactivatedUserIds: [adopterId],
  };
};
