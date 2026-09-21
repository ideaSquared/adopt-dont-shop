// Service-to-service gRPC client for service.applications (ADS-1270).
//
// The weekly-digest job's "still waiting on your shortlist" section needs
// one user's in-progress applications. ApplicationService.List already
// supports this: adopter_id_filter is honoured for a caller whose roles
// include super_admin (services/applications/src/grpc/read-handlers.ts),
// which also short-circuits the base APPLICATIONS_VIEW permission gate
// (packages/authz's super_admin short-circuit) — so no admin-only
// permission grant is needed the way pets.favorites.list:any is, only the
// super_admin role. Mirrors pets-client.ts / rescue-client.ts: signed
// system-principal metadata (ADS-800), retry on UNAVAILABLE /
// DEADLINE_EXCEEDED, a per-call deadline.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import {
  ApplicationsV1,
  type Application,
  type ListApplicationsRequest,
  type ListApplicationsResponse,
} from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type CreateApplicationsClientOptions = {
  address: string;
  systemUserId?: string;
  deadlineMs?: number;
  maxRetries?: number;
};

const DEFAULT_DEADLINE_MS = 5_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_CODES = new Set([status.UNAVAILABLE, status.DEADLINE_EXCEEDED]);

const isRetryableError = (err: unknown): boolean => {
  if (err === null || typeof err !== 'object') {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  return typeof code === 'number' && RETRYABLE_CODES.has(code);
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const jitteredBackoff = (attempt: number, baseMs: number): number => {
  const base = baseMs * Math.pow(2, attempt - 1);
  return base * (0.75 + Math.random() * 0.5);
};

// List is paginated (default 20/page, max 100); a user with more than one
// page of live applications is not realistic for a weekly digest, so this
// client reads a single page. Documented follow-up if that assumption
// ever breaks.
const APPLICATIONS_PAGE_LIMIT = 100;

// The slice of the applications stub the weekly-digest job consumes.
export type ApplicationsByUserClient = {
  listByUser: (userId: string) => Promise<Application[]>;
  close(): void;
};

export function createApplicationsClient(
  opts: CreateApplicationsClientOptions
): ApplicationsByUserClient {
  const stub = new ApplicationsV1.ApplicationServiceClient(
    opts.address,
    credentials.createInsecure()
  );
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const systemPrincipal = {
    userId: opts.systemUserId ?? 'svc-notifications',
    // super_admin — the only role List's adopter_id_filter branch honours
    // for a caller reading someone ELSE's applications; it also
    // short-circuits the APPLICATIONS_VIEW permission gate.
    roles: ['super_admin'],
    permissions: [] as string[],
  };

  const buildSystemMetadata = (): Metadata => {
    const meta = new Metadata();
    meta.set('x-user-id', systemPrincipal.userId);
    meta.set('x-user-roles', systemPrincipal.roles.join(','));
    meta.set('x-user-permissions', systemPrincipal.permissions.join(','));
    const signingKey = getDefaultPrincipalSigningKey();
    if (signingKey) {
      meta.set(PRINCIPAL_TOKEN_HEADER, signPrincipalToken(systemPrincipal, signingKey));
    }
    return meta;
  };

  const callWithRetry = <Req, Res>(
    fn: (
      req: Req,
      metadata: Metadata,
      options: Partial<CallOptions>,
      cb: (err: unknown, res: Res) => void
    ) => unknown,
    req: Req
  ): Promise<Res> => {
    const attempt = (remaining: number): Promise<Res> =>
      new Promise<Res>((resolve, reject) => {
        const options: Partial<CallOptions> = {
          deadline: new Date(Date.now() + deadlineMs),
        };
        fn.call(stub, req, buildSystemMetadata(), options, (err: unknown, res: Res) => {
          if (err) {
            if (remaining > 0 && isRetryableError(err)) {
              const retryIndex = maxRetries - remaining + 1;
              sleep(jitteredBackoff(retryIndex, 100))
                .then(() => attempt(remaining - 1))
                .then(resolve, reject);
            } else {
              reject(err);
            }
            return;
          }
          resolve(res);
        });
      });

    return attempt(maxRetries);
  };

  return {
    listByUser: async (userId: string): Promise<Application[]> => {
      const res = await callWithRetry<ListApplicationsRequest, ListApplicationsResponse>(
        stub.list,
        {
          adopterIdFilter: userId,
          limit: APPLICATIONS_PAGE_LIMIT,
          statusFilter: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED,
        }
      );
      return res.applications;
    },
    close: () => stub.close(),
  };
}
