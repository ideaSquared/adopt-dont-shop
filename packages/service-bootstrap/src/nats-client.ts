// NATS/JetStream connection auth (ADS-1273).
//
// Before this, every service connected with `connect({ servers: config.natsUrl })`
// — no credentials. Any process that could reach the NATS port could publish
// forged `*.actionTaken` events (which service.audit persists as the forensic
// record) or eavesdrop on every inter-service event, in every environment
// including production. NATS_AUTH_TOKEN closes that: the docker-compose NATS
// service now requires `--auth <token>` and every client must present the
// same shared token to connect.
//
// Mirrors the PRINCIPAL_SIGNING_KEY pattern in principal-token.ts/principal.ts
// — a single required secret resolved via @adopt-dont-shop/config-secrets —
// except this one is a hard requirement in every environment (dev included),
// not just outside development/test: the NATS server itself now demands auth
// unconditionally, so a missing/blank token means the service can't connect
// at all rather than silently degrading to a legacy trust fallback.

import { connect, type ConnectionOptions, type NatsConnection } from 'nats';

import { requireSecret } from '@adopt-dont-shop/config-secrets';

// A brute-forceable token would let anything that can reach NATS authenticate
// as a trusted publisher/subscriber, defeating the point of requiring one.
export const MIN_NATS_AUTH_TOKEN_BYTES = 32;

/**
 * Resolve the shared NATS auth token (`NATS_AUTH_TOKEN` / `NATS_AUTH_TOKEN_FILE`
 * via config-secrets) and build the `nats.connect()` options for `servers`.
 * Throws if the token is missing, blank, or shorter than
 * {@link MIN_NATS_AUTH_TOKEN_BYTES} — the same failure shape as every other
 * boot-time secret in this repo (see requireSecret).
 *
 * Exported separately from {@link connectNats} so the credential wiring is
 * unit-testable without a live NATS server.
 */
export function buildNatsConnectionOptions(
  servers: string,
  env: NodeJS.ProcessEnv = process.env
): ConnectionOptions {
  const token = requireSecret(
    'NATS_AUTH_TOKEN',
    env,
    'shared token authenticating NATS/JetStream connections — see the nats service --auth flag',
    { minBytes: MIN_NATS_AUTH_TOKEN_BYTES }
  );
  return { servers, token };
}

/**
 * Connect to NATS with the shared auth token. Drop-in replacement for the
 * bare `connect({ servers })` every service's index.ts used to call —
 * callers keep owning the resulting connection's lifecycle (drain/close) same
 * as before.
 */
export async function connectNats(servers: string): Promise<NatsConnection> {
  return connect(buildNatsConnectionOptions(servers));
}
