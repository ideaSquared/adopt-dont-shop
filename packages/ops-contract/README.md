# @adopt-dont-shop/ops-contract

## Purpose

Zod schemas, inferred types, error codes and constants for the HTTP API between the `ads-ops` developer CLI (`packages/ops-cli`) and `service.ops` (`services/ops`). Service-only shared package (no frontend consumer): both sides parse every request and response with these schemas, so the wire format has one definition. Design: [ADR 0016](../../docs/adr/0016-developer-ops-cli.md).

## Location in the architecture

Sits beside the other service-only packages in [`packages/README.md`](../README.md#service-only-shared-packages). Consumed by `@adopt-dont-shop/ops-cli` (client) and `@adopt-dont-shop/service.ops` (server); it depends on `zod` only.

## Scripts

```bash
pnpm build         # tsc
pnpm test          # Vitest (run mode)
pnpm lint          # ESLint
pnpm type-check    # TypeScript type-check
```

## Public API / exports

Everything is exported from [`src/index.ts`](./src/index.ts), which is authoritative. All routes live under `/v1`; authenticated routes take `Authorization: Bearer <session token>`; every error has the `ErrorResponse` shape with the HTTP status from `ERROR_HTTP_STATUS`.

| Method and path                | Auth    | Request               | Response                                                                |
| ------------------------------ | ------- | --------------------- | ----------------------------------------------------------------------- |
| `POST /v1/login/start`         | none    | none                  | `LoginStartResponse` (GitHub device-flow codes)                         |
| `POST /v1/login/poll`          | none    | `LoginPollRequest`    | `LoginPollResponse` (`pending`, `slow_down`, `expired`, `denied`, `ok`) |
| `POST /v1/login/local`         | none    | `LocalLoginRequest`   | `LocalLoginResponse` (dev only, `OPS_AUTH_MODE=local`)                  |
| `POST /v1/logout`              | session | none                  | `204`                                                                   |
| `GET /v1/whoami`               | session | none                  | `WhoamiResponse`                                                        |
| `GET /v1/catalog`              | session | none                  | `CatalogResponse` (allowed RPCs plus the proto schema slice)            |
| `POST /v1/invoke`              | session | `InvokeRequest`       | `InvokeResponse` (`result` or `plan`)                                   |
| `GET /v1/history?limit=N`      | session | none                  | `HistoryResponse`                                                       |
| `POST /v1/unlocks`             | session | `CreateUnlockRequest` | `CreateUnlockResponse`                                                  |
| `GET /v1/unlocks`              | session | none                  | `ListUnlocksResponse`                                                   |
| `DELETE /v1/unlocks`           | session | none                  | `204` (revokes the caller's unlocks)                                    |
| `DELETE /v1/unlocks/:unlockId` | session | none                  | `204`                                                                   |

Runtime values: `OpsEnvSchema` and the other `*Schema` objects, `ERROR_HTTP_STATUS`, `HIDDEN_MARKER_KEY`, `isHiddenMarker`, `UNLOCK_DEFAULT_TTL_MINUTES`, `UNLOCK_MAX_TTL_MINUTES`, `TICKET_PATTERN`.

How each side uses it: the server parses request bodies with the `*RequestSchema` objects and returns bodies shaped by the response schemas; the CLI parses every response with the matching `*ResponseSchema` and treats a parse failure as an error. Change a shape here first, then both sides.

## Environment variables consumed

None. This package reads no environment variables.

## Testing notes

Schema behaviour (unlock subject rules, invoke mode defaults, error-code to HTTP-status map) is tested in this package with Vitest. Consumers import the schemas directly; no mocking is needed.

## Ownership

Maintained with `services/ops` and `packages/ops-cli`; owner `@paragonjenko` (see [`.github/CODEOWNERS`](../../.github/CODEOWNERS)).
