import { z } from 'zod';

import { parsePort, readSecret, requireSecret } from '@adopt-dont-shop/config-secrets';
import { OpsEnvSchema, type OpsEnv } from '@adopt-dont-shop/ops-contract';

// CLI service names are the proto package segment (`adopt_dont_shop.<name>.v1`).
export const SERVICE_NAMES = [
  'auth',
  'pets',
  'rescue',
  'applications',
  'notifications',
  'moderation',
  'cms',
  'chat',
  'audit',
  'matching',
] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

// gRPC targets use the gateway's env var names and defaults
// (services/gateway/src/config.ts).
const GRPC_TARGETS: Record<ServiceName, { envVar: string; fallback: string }> = {
  auth: { envVar: 'AUTH_GRPC_URL', fallback: 'service-auth:6002' },
  pets: { envVar: 'PETS_GRPC_URL', fallback: 'service-pets:6003' },
  rescue: { envVar: 'RESCUE_GRPC_URL', fallback: 'service-rescue:6004' },
  applications: { envVar: 'APPLICATIONS_GRPC_URL', fallback: 'service-applications:6005' },
  notifications: { envVar: 'NOTIFICATIONS_GRPC_URL', fallback: 'service-notifications:6001' },
  moderation: { envVar: 'MODERATION_GRPC_URL', fallback: 'service-moderation:6007' },
  cms: { envVar: 'CMS_GRPC_URL', fallback: 'service-cms:6010' },
  chat: { envVar: 'CHAT_GRPC_URL', fallback: 'service-chat:6006' },
  audit: { envVar: 'AUDIT_GRPC_URL', fallback: 'service-audit:6009' },
  matching: { envVar: 'MATCHING_GRPC_URL', fallback: 'service-matching:6008' },
};

export type OpsConfig = {
  // Which stack this service.ops fronts. Explicit — never inferred.
  env: OpsEnv;
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  schema: string;
  natsUrl: string;
  principalSigningKey: string;
  authMode: 'github' | 'local';
  github: { clientId: string; org: string; team: string } | null;
  discordWebhookUrl: string | undefined;
  sessionTtlHours: number;
  grpcTargets: Record<ServiceName, string>;
};

const DEFAULT_PORT = 4100;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'ops';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_SESSION_TTL_HOURS = 8;
const MIN_SIGNING_KEY_BYTES = 32;

const AuthModeSchema = z.enum(['github', 'local']);

const clean = (value: string | undefined): string | undefined => value?.trim() || undefined;

export const loadDatabaseConfig = (
  env: NodeJS.ProcessEnv = process.env
): Pick<OpsConfig, 'databaseUrl' | 'schema'> => ({
  databaseUrl: requireSecret('DATABASE_URL', env, 'Postgres connection string'),
  schema: clean(env.OPS_SCHEMA) ?? DEFAULT_SCHEMA,
});

const parseOpsEnv = (raw: string | undefined): OpsEnv => {
  const parsed = OpsEnvSchema.safeParse(clean(raw));
  if (!parsed.success) {
    throw new Error('OPS_ENV is required and must be one of dev, staging, prod');
  }
  return parsed.data;
};

const parseAuthMode = (raw: string | undefined): 'github' | 'local' => {
  const parsed = AuthModeSchema.safeParse(clean(raw) ?? 'github');
  if (!parsed.success) {
    throw new Error('OPS_AUTH_MODE must be github or local');
  }
  return parsed.data;
};

const parseSessionTtlHours = (raw: string | undefined): number => {
  const value = clean(raw) === undefined ? DEFAULT_SESSION_TTL_HOURS : Number(clean(raw));
  if (!Number.isFinite(value) || value <= 0 || value > 24 * 7) {
    throw new Error('OPS_SESSION_TTL_HOURS must be a positive number of hours (at most 168)');
  }
  return value;
};

const requireGithub = (env: NodeJS.ProcessEnv): NonNullable<OpsConfig['github']> => {
  const clientId = clean(env.OPS_GITHUB_CLIENT_ID);
  const org = clean(env.OPS_GITHUB_ORG);
  const team = clean(env.OPS_GITHUB_TEAM);
  if (!clientId || !org || !team) {
    throw new Error(
      'OPS_GITHUB_CLIENT_ID, OPS_GITHUB_ORG and OPS_GITHUB_TEAM are required when OPS_AUTH_MODE=github'
    );
  }
  return { clientId, org, team };
};

const loadGrpcTargets = (env: NodeJS.ProcessEnv): Record<ServiceName, string> =>
  Object.fromEntries(
    SERVICE_NAMES.map(name => [
      name,
      clean(env[GRPC_TARGETS[name].envVar]) ?? GRPC_TARGETS[name].fallback,
    ])
    // Object.fromEntries widens the keys to string; the map is built from SERVICE_NAMES.
  ) as Record<ServiceName, string>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): OpsConfig => {
  const opsEnv = parseOpsEnv(env.OPS_ENV);
  const nodeEnv = clean(env.NODE_ENV) ?? 'development';
  const authMode = parseAuthMode(env.OPS_AUTH_MODE);

  // Local login mints a session for any login name with no identity check, so it
  // is only ever acceptable on a developer's own machine.
  if (authMode === 'local' && (nodeEnv !== 'development' || opsEnv !== 'dev')) {
    throw new Error(
      'OPS_AUTH_MODE=local is only allowed with NODE_ENV=development and OPS_ENV=dev'
    );
  }

  // service.ops always mints roleless principals, which services only accept
  // from a signed x-principal-token (header-trust mode rejects an empty role
  // list), so the signing key is required in every environment.
  const principalSigningKey = requireSecret(
    'PRINCIPAL_SIGNING_KEY',
    env,
    'service.ops signs the principals it mints',
    { minBytes: MIN_SIGNING_KEY_BYTES }
  );

  return {
    env: opsEnv,
    nodeEnv,
    host: clean(env.OPS_HOST) ?? DEFAULT_HOST,
    port: parsePort(env.OPS_HTTP_PORT, DEFAULT_PORT, 'OPS_HTTP_PORT'),
    ...loadDatabaseConfig(env),
    natsUrl: clean(env.NATS_URL) ?? DEFAULT_NATS_URL,
    principalSigningKey,
    authMode,
    github: authMode === 'github' ? requireGithub(env) : null,
    discordWebhookUrl: clean(readSecret('OPS_DISCORD_WEBHOOK_URL', env)),
    sessionTtlHours: parseSessionTtlHours(env.OPS_SESSION_TTL_HOURS),
    grpcTargets: loadGrpcTargets(env),
  };
};
