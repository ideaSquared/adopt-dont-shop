import type { OpsEnv } from '@adopt-dont-shop/ops-contract';
import { UsageError } from './errors.js';

// What to do after a write has been previewed. Pure, so every branch is testable.
export type WriteStep =
  | { readonly action: 'show-only' }
  | { readonly action: 'confirm' }
  | { readonly action: 'confirm-prod' }
  | { readonly action: 'execute' };

export const PROD_CONFIRMATION = 'prod';

// --yes is for scripts and tired fingers in dev / staging, never prod.
export const assertYesAllowed = (env: OpsEnv, yes: boolean): void => {
  if (env === 'prod' && yes) {
    throw new UsageError(
      '--yes is not allowed in prod.',
      'Run it in a terminal, review the preview and type `prod` to confirm.'
    );
  }
};

export const decideWrite = (input: {
  readonly interactive: boolean;
  readonly env: OpsEnv;
  readonly yes: boolean;
}): WriteStep => {
  assertYesAllowed(input.env, input.yes);
  if (input.yes) {
    return { action: 'execute' };
  }
  if (!input.interactive) {
    return { action: 'show-only' };
  }
  return { action: input.env === 'prod' ? 'confirm-prod' : 'confirm' };
};

export const validateProdConfirmation = (value: string): string | undefined =>
  value.trim() === PROD_CONFIRMATION
    ? undefined
    : `Type ${PROD_CONFIRMATION} exactly, or press Ctrl+C to stop.`;
