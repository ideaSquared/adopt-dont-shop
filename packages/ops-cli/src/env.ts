import { OpsEnvSchema, type OpsEnv } from '@adopt-dont-shop/ops-contract';
import { UsageError } from './errors.js';

const parseEnv = (value: string, source: string): OpsEnv => {
  const parsed = OpsEnvSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  throw new UsageError(
    `Unknown environment "${value}" (from ${source}).`,
    'Use one of: dev, staging, prod.'
  );
};

// Precedence: --env flag, then ADS_OPS_ENV, then the saved current env, then dev.
export const resolveEnv = (input: {
  readonly flag?: string;
  readonly envVar?: string;
  readonly saved?: OpsEnv;
}): OpsEnv => {
  if (input.flag) {
    return parseEnv(input.flag, '--env');
  }
  if (input.envVar) {
    return parseEnv(input.envVar, 'ADS_OPS_ENV');
  }
  return input.saved ?? 'dev';
};
