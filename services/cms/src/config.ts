import { readSecret } from '@adopt-dont-shop/config-secrets';

export type CmsConfig = {
  port: number;
  host: string;
  grpcPort: number;
  environment: string;
  databaseUrl: string;
  schema: string;
  natsUrl: string;
};

// Same convention as service.notifications — HTTP + 1000 for gRPC.
// CMS sits at HTTP :5010 / gRPC :6010.
const DEFAULT_PORT = 5010;
const DEFAULT_GRPC_PORT = 6010;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'cms';
const DEFAULT_NATS_URL = 'nats://nats:4222';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): CmsConfig => {
  const port = parsePort(env.CMS_PORT, DEFAULT_PORT, 'CMS_PORT');
  const grpcPort = parsePort(env.CMS_GRPC_PORT, DEFAULT_GRPC_PORT, 'CMS_GRPC_PORT');

  const databaseUrl = readSecret('DATABASE_URL', env)?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.CMS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.CMS_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
  };
};

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return fallback;
  }
  const n = Number.parseInt(trimmed, 10);
  if (Number.isNaN(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return n;
}
