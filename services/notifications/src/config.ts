export type NotificationsConfig = {
  // Port the HTTP surface listens on. Distinct from service.backend's
  // 5000 and service.gateway's 4000. The gRPC server (Phase 1.3) will
  // listen on a sibling port — convention: HTTP + 1000.
  port: number;
  host: string;
  // Environment label, surfaced in health responses and on log lines.
  environment: string;
  // Postgres connection string. Required for migrations + the runtime
  // database client. Same physical Postgres as service.backend; this
  // service owns the `notifications` schema (CAD-style schema-per-service).
  databaseUrl: string;
  // Schema name. Defaults to `notifications` — every table in this
  // service lives here and other services don't read it directly.
  schema: string;
};

// Defaults match the wider stack:
//   - service.backend  http :5000
//   - service.gateway  http :4000
//   - service.notifications http :5001 (gRPC will be :6001 in Phase 1.3)
const DEFAULT_PORT = 5001;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_SCHEMA = 'notifications';

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): NotificationsConfig => {
  const portRaw = env.NOTIFICATIONS_PORT?.trim();
  const port = portRaw ? Number.parseInt(portRaw, 10) : DEFAULT_PORT;
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`NOTIFICATIONS_PORT must be a positive integer, got "${portRaw}"`);
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required (Postgres connection string)');
  }

  return {
    port,
    host: env.NOTIFICATIONS_HOST?.trim() || DEFAULT_HOST,
    environment: env.NODE_ENV?.trim() || 'development',
    databaseUrl,
    schema: env.NOTIFICATIONS_SCHEMA?.trim() || DEFAULT_SCHEMA,
  };
};
