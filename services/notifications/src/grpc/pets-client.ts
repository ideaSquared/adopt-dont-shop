// Promise-wrapped client for service.pets — just the favouriter-discovery
// RPC the pets.statusChanged fan-out needs. Mirrors auth-client.ts:
// signed system-principal metadata (ADS-800), retry on UNAVAILABLE /
// DEADLINE_EXCEEDED, a per-call deadline. Defining the slice locally keeps
// the notifications service decoupled from the gateway's full PetsClient.

import { credentials, status, type CallOptions, Metadata } from '@grpc/grpc-js';

import {
  PetsV1,
  type ListPetFavoritersRequest,
  type ListPetFavoritersResponse,
} from '@adopt-dont-shop/proto';
import {
  getDefaultPrincipalSigningKey,
  PRINCIPAL_TOKEN_HEADER,
  signPrincipalToken,
} from '@adopt-dont-shop/service-bootstrap';

export type CreatePetsClientOptions = {
  address: string;
  // System principal metadata — PetService.ListFavoriters gates on
  // `pets.read`. The notifications service runs as `svc-notifications`;
  // stamping the permission here means the fan-out handler doesn't thread
  // metadata through.
  systemUserId?: string;
  systemRoles?: string;
  systemPermissions?: string;
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

const splitList = (raw: string): string[] =>
  raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const jitteredBackoff = (attempt: number, baseMs: number): number => {
  const base = baseMs * Math.pow(2, attempt - 1);
  return base * (0.75 + Math.random() * 0.5);
};

// The slice of the pets stub the fan-out handler consumes.
export type PetsFavoritersClient = {
  listFavoriters: (petId: string) => Promise<string[]>;
  close(): void;
};

export function createPetsClient(opts: CreatePetsClientOptions): PetsFavoritersClient {
  const stub = new PetsV1.PetServiceClient(opts.address, credentials.createInsecure());
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  const systemPrincipal = {
    userId: opts.systemUserId ?? 'svc-notifications',
    roles: splitList(opts.systemRoles ?? 'admin'),
    // pets.read → ListFavoriters (recipient discovery for the
    // pets.statusChanged fan-out).
    permissions: splitList(opts.systemPermissions ?? 'pets.read'),
  };

  // Built per attempt — the signed x-principal-token (ADS-800) carries a
  // short TTL, so a metadata object minted at boot would expire.
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
    listFavoriters: async (petId: string): Promise<string[]> => {
      const res = await callWithRetry<ListPetFavoritersRequest, ListPetFavoritersResponse>(
        stub.listFavoriters,
        { petId }
      );
      return res.userIds;
    },
    close: () => stub.close(),
  };
}
