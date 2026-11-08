import {
  TICKET_PATTERN,
  UNLOCK_DEFAULT_TTL_MINUTES,
  UNLOCK_MAX_TTL_MINUTES,
  type CatalogMethod,
  type OpsEnv,
  type SubjectType,
  type Unlock,
  type Unlockable,
} from '@adopt-dont-shop/ops-contract';
import type { Client } from './client.js';
import type { Ctx } from './ctx.js';
import { UsageError } from './errors.js';
import { formatTimestamp } from './ui/format.js';
import { renderProdBanner, renderSuccess, renderWarning } from './ui/render.js';

const normalise = (name: string): string => name.replace(/_/g, '').toLowerCase();

const isSet = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0);

// Request fields that make this a PII lookup and are set in this request.
export const piiFieldsSet = (
  method: Pick<CatalogMethod, 'piiRequestFields'>,
  request: Readonly<Record<string, unknown>>
): readonly string[] =>
  method.piiRequestFields.filter(field =>
    Object.entries(request).some(
      ([key, value]) => normalise(key) === normalise(field) && isSet(value)
    )
  );

export const activeUnlocks = (unlocks: readonly Unlock[], nowMs: number): readonly Unlock[] =>
  unlocks.filter(u => Date.parse(u.expiresAt) > nowMs);

// Offer an unlock BEFORE calling when the request is a PII lookup and nothing is unlocked.
export const shouldOfferUnlockBefore = (input: {
  readonly method: Pick<CatalogMethod, 'piiRequestFields'>;
  readonly request: Readonly<Record<string, unknown>>;
  readonly unlocks: readonly Unlock[];
  readonly nowMs: number;
  readonly interactive: boolean;
}): readonly string[] => {
  if (!input.interactive) {
    return [];
  }
  if (activeUnlocks(input.unlocks, input.nowMs).length > 0) {
    return [];
  }
  return piiFieldsSet(input.method, input.request);
};

export const describeSubject = (u: Unlockable): string =>
  u.subjectType === 'any' ? 'everything' : `${u.subjectType} ${u.subjectId ?? ''}`.trim();

export const hiddenOfferText = (hiddenCount: number, unlockable: Unlockable): string =>
  `${hiddenCount} field${hiddenCount === 1 ? '' : 's'} hidden. Unlock ${describeSubject(unlockable)}? Needs a reason + ticket and alerts #ops.`;

export const lookupOfferText = (fields: readonly string[]): string =>
  `Looking up by ${fields.join(', ')} is a personal-data lookup, and results stay hidden without an unlock. Unlock first? Needs a reason + ticket and alerts #ops.`;

export const validateReason = (value: string): string | undefined =>
  value.trim().length >= 10 ? undefined : 'Give a reason of at least 10 characters.';

export const validateTicket = (value: string): string | undefined =>
  TICKET_PATTERN.test(value.trim()) ? undefined : 'Use a ticket like ADS-123.';

export const validateTtl = (value: string): string | undefined => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= UNLOCK_MAX_TTL_MINUTES
    ? undefined
    : `Whole minutes between 1 and ${UNLOCK_MAX_TTL_MINUTES}.`;
};

export type UnlockInput = {
  readonly subject: Unlockable;
  readonly reason?: string;
  readonly ticket?: string;
  readonly ttl?: string;
};

// Collects whatever is missing (prompting when allowed), then creates the unlock.
export const createUnlockFlow = async (
  ctx: Ctx,
  env: OpsEnv,
  client: Client,
  input: UnlockInput,
  interactive: boolean
): Promise<Unlock> => {
  const ask = async (
    given: string | undefined,
    validate: (v: string) => string | undefined,
    prompt: { message: string; placeholder?: string; initialValue?: string },
    flag: string
  ): Promise<string> => {
    if (given !== undefined) {
      const problem = validate(given);
      if (problem) {
        throw new UsageError(`${flag}: ${problem}`);
      }
      return given.trim();
    }
    if (!interactive) {
      throw new UsageError(
        `Missing ${flag}.`,
        'Pass --reason, --ticket and --ttl when not in a terminal.'
      );
    }
    return (await ctx.prompts.text({ ...prompt, validate })).trim();
  };
  const reason = await ask(
    input.reason,
    validateReason,
    {
      message: 'Reason (min 10 characters)',
      placeholder: 'Investigating failed adoption email for a support ticket',
    },
    '--reason'
  );
  const ticket = await ask(
    input.ticket,
    validateTicket,
    { message: 'Ticket', placeholder: 'ADS-123' },
    '--ticket'
  );
  const ttl = await ask(
    input.ttl ?? (interactive ? undefined : String(UNLOCK_DEFAULT_TTL_MINUTES)),
    validateTtl,
    {
      message: `Minutes (max ${UNLOCK_MAX_TTL_MINUTES})`,
      initialValue: String(UNLOCK_DEFAULT_TTL_MINUTES),
    },
    '--ttl'
  );
  if (env === 'prod') {
    ctx.err(`${renderProdBanner(ctx.theme, ctx.columns).join('\n')}\n`);
  }
  const { unlock } = await client.createUnlock({
    subjectType: input.subject.subjectType,
    subjectId: input.subject.subjectType === 'any' ? null : input.subject.subjectId,
    reason,
    ticket,
    ttlMinutes: Number(ttl),
  });
  return unlock;
};

// Staging and prod refuse unlocks unless the Discord alert is configured, so
// "alerted" is only claimed there; dev unlocks are audited but not announced.
export const renderUnlockCreated = (ctx: Ctx, env: OpsEnv, unlock: Unlock): readonly string[] => [
  ...renderSuccess(
    ctx.theme,
    `Unlocked ${describeSubject(unlock)} until ${formatTimestamp(unlock.expiresAt, ctx.timeZone)}`
  ),
  ...renderWarning(
    ctx.theme,
    env === 'dev'
      ? 'Recorded in the audit log. Lock again early with `pnpm ops lock`.'
      : '#ops has been alerted. Lock again early with `pnpm ops lock`.'
  ),
];

export const SUBJECT_TYPES: readonly SubjectType[] = ['user', 'rescue', 'application', 'any'];

// Asks which subject to unlock when the server could not tell us.
export const promptSubject = async (ctx: Ctx): Promise<Unlockable> => {
  const subjectType = (await ctx.prompts.select({
    message: 'What do you need to see?',
    options: [
      { value: 'user', label: 'One user' },
      { value: 'rescue', label: 'One rescue' },
      { value: 'application', label: 'One application' },
      { value: 'any', label: 'Anything', hint: 'every command, until it expires' },
    ],
    initialValue: 'any',
  })) as SubjectType; // options above are exactly the SubjectType values
  if (subjectType === 'any') {
    return { subjectType, subjectId: null };
  }
  const subjectId = (
    await ctx.prompts.text({
      message: `The ${subjectType} id`,
      validate: v => (v.trim() ? undefined : 'An id is required.'),
    })
  ).trim();
  return { subjectType, subjectId };
};
