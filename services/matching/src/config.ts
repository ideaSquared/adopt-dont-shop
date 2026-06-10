import { readSecret } from '@adopt-dont-shop/config-secrets';

export type MatchingConfig = {
  // HTTP port for the boot-readiness surface (/health/simple). Distinct
  // from every other service in the stack (5000 backend, 4000 gateway,
  // 5001 notifications, 5002 auth, 5003 pets, 5004 rescue,
  // 5005 applications, 5006 chat, 5007 moderation).
  port: number;
  host: string;
  // gRPC server port. MatchingService.{Recommend, RecordSwipe,
  // Discover, Search} bind here once Phase 9.3c brings the server
  // online. Convention: HTTP + 1000.
  grpcPort: number;
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `matching` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `matching`.
  schema: string;
  // NATS bus. Phase 9.3 onwards publishes matching.swipeRecorded etc.
  // The service consumes pet data via gRPC (not events) — it's
  // stateless compute, not a denormalised projection.
  natsUrl: string;
  // service.pets gRPC URL — Recommend + SearchPets read candidate pets
  // via PetService.List before ranking / returning them (matching is
  // stateless compute, not a denormalised projection of pets).
  // Defaults to the same service-pets:6003 address the gateway uses.
  petsGrpcUrl: string;
};

const DEFAULT_PORT = 5008;
const DEFAULT_GRPC_PORT = 6008;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'matching';
const DEFAULT_NATS_URL = 'nats://nats:4222';
const DEFAULT_PETS_GRPC_URL = 'service-pets:6003';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): MatchingConfig => {
  const port = parsePort(env.MATCHING_PORT, DEFAULT_PORT, 'MATCHING_PORT');
  const grpcPort = parsePort(env.MATCHING_GRPC_PORT, DEFAULT_GRPC_PORT, 'MATCHING_GRPC_PORT');

  const databaseUrl = readSecret('DATABASE_URL', env)?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    grpcPort,
    host: env.MATCHING_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.MATCHING_SCHEMA?.trim() || DEFAULT_SCHEMA,
    natsUrl: env.NATS_URL?.trim() || DEFAULT_NATS_URL,
    petsGrpcUrl: env.PETS_GRPC_URL?.trim() || DEFAULT_PETS_GRPC_URL,
  };
};

function parsePort(raw: string | undefined, fallback: number, name: string): number {
  const trimmed = raw?.trim();
  const value = trimmed ? Number.parseInt(trimmed, 10) : fallback;
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${trimmed}"`);
  }
  return value;
}
