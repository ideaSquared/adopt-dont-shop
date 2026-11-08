import { randomBytes } from 'node:crypto';

import type {
  LocalLoginResponse,
  LoginPollResponse,
  LoginStartResponse,
  Operator,
  Session,
} from '@adopt-dont-shop/ops-contract';

import { sha256Hex } from './access-chain.js';
import { OpsError } from './errors.js';
import type { GithubClient } from './github.js';
import type { OperatorRecord, OpsStore } from './store.js';

const HOUR_MS = 3_600_000;

export type AuthContext = {
  operator: Operator;
  sessionId: string;
  sessionExpiresAt: Date;
};

export type AuthServiceOptions = {
  store: OpsStore;
  // null when OPS_AUTH_MODE=local.
  github: GithubClient | null;
  localLoginEnabled: boolean;
  sessionTtlHours: number;
  now: () => Date;
};

const toOperator = (record: OperatorRecord): Operator => ({
  operatorId: record.operatorId,
  login: record.login,
  name: record.name,
});

// Session tokens are 32 random bytes (base64url). Only the sha256 is stored, so
// a database read cannot be replayed as a session.
const newToken = (): string => randomBytes(32).toString('base64url');
export const hashToken = (token: string): string => sha256Hex(token);

export const createAuthService = (opts: AuthServiceOptions) => {
  const { store, now } = opts;

  const openSession = async (record: OperatorRecord): Promise<Session> => {
    const at = now();
    const token = newToken();
    const expiresAt = new Date(at.getTime() + opts.sessionTtlHours * HOUR_MS);
    await store.createSession(
      { operatorId: record.operatorId, tokenHash: hashToken(token), expiresAt },
      at
    );
    return { token, expiresAt: expiresAt.toISOString(), operator: toOperator(record) };
  };

  const requireGithub = (): GithubClient => {
    if (opts.github === null) {
      throw new OpsError(
        'NOT_ENABLED',
        'GitHub login is not enabled on this service.ops',
        'This instance runs OPS_AUTH_MODE=local; run `pnpm ops login`.'
      );
    }
    return opts.github;
  };

  const startLogin = async (): Promise<LoginStartResponse> => requireGithub().start();

  const pollLogin = async (deviceCode: string): Promise<LoginPollResponse> => {
    const result = await requireGithub().poll(deviceCode);
    if (result.status !== 'ok') {
      return result;
    }
    const operator = await store.upsertOperator(
      {
        login: result.identity.login,
        githubId: result.identity.githubId,
        name: result.identity.name,
      },
      now()
    );
    return { status: 'ok', session: await openSession(operator) };
  };

  const localLogin = async (login: string): Promise<LocalLoginResponse> => {
    if (!opts.localLoginEnabled) {
      throw new OpsError(
        'NOT_ENABLED',
        'Local login is not enabled',
        'Run `pnpm ops login` (GitHub) instead.'
      );
    }
    const operator = await store.upsertOperator({ login, githubId: null, name: null }, now());
    return { session: await openSession(operator) };
  };

  // Resolves a bearer token to a live session, or null. Touches last_seen_at.
  const authenticate = async (token: string): Promise<AuthContext | null> => {
    const at = now();
    const session = await store.findSession(hashToken(token), at);
    if (session === null) {
      return null;
    }
    await store.touchOperator(session.operator.operatorId, at);
    return {
      operator: toOperator(session.operator),
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt,
    };
  };

  const logout = (sessionId: string): Promise<void> => store.revokeSession(sessionId, now());

  return { startLogin, pollLogin, localLogin, authenticate, logout };
};

export type AuthService = ReturnType<typeof createAuthService>;
