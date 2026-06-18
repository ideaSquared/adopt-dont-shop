// Auth domain metrics (ADS-803).
//
// Counters for the three principal credential flows in service.auth:
//   auth_logins_total{outcome}         — login attempts by outcome
//   auth_registrations_total{outcome}  — registration attempts by outcome
//   auth_token_refreshes_total{outcome} — token refresh attempts by outcome
//
// Registered on the shared observability registry so they appear on /metrics
// alongside the standard HTTP/gRPC histograms. The singleton guard prevents
// double-registration across multiple createServer() calls in tests.

import { Counter, getMetricsRegistry } from '@adopt-dont-shop/observability';

export type LoginOutcome =
  | 'success'
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_suspended'
  | 'email_unverified';

export type RegistrationOutcome = 'success' | 'duplicate_email' | 'invalid_input';

export type TokenRefreshOutcome =
  | 'success'
  | 'invalid_token'
  | 'token_revoked'
  | 'concurrent_reuse';

export type AuthMetrics = {
  loginCounter: InstanceType<typeof Counter<'outcome'>>;
  registrationCounter: InstanceType<typeof Counter<'outcome'>>;
  tokenRefreshCounter: InstanceType<typeof Counter<'outcome'>>;
};

let _metrics: AuthMetrics | null = null;

export const createAuthMetrics = (): AuthMetrics => {
  if (_metrics) return _metrics;
  const registry = getMetricsRegistry();

  const loginCounter = new Counter<'outcome'>({
    name: 'auth_logins_total',
    help: 'Total login attempts labelled by outcome (success / invalid_credentials / account_locked / account_suspended).',
    labelNames: ['outcome'],
    registers: [registry],
  });

  const registrationCounter = new Counter<'outcome'>({
    name: 'auth_registrations_total',
    help: 'Total registration attempts labelled by outcome (success / duplicate_email / invalid_input).',
    labelNames: ['outcome'],
    registers: [registry],
  });

  const tokenRefreshCounter = new Counter<'outcome'>({
    name: 'auth_token_refreshes_total',
    help: 'Total token refresh attempts labelled by outcome (success / invalid_token / token_revoked / concurrent_reuse).',
    labelNames: ['outcome'],
    registers: [registry],
  });

  _metrics = { loginCounter, registrationCounter, tokenRefreshCounter };
  return _metrics;
};

// --- Test-only helper -------------------------------------------------------

export const __resetAuthMetricsForTest = (): void => {
  _metrics = null;
};
