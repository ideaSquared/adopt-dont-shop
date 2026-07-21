# @adopt-dont-shop/config-secrets

## Purpose

Boot-time secret loader shared by the backend microservices. It reads a
credential from a file-mounted Docker secret (`NAME_FILE` pointing at a file
whose contents are the value) when present, and otherwise falls back to a
plain environment variable (`NAME`). This mirrors the `readSecretOrEnv()`
helper the deleted `service.backend` monolith used, so any extracted service
can opt onto file-mounted secrets without changing its config contract.

This is a service-only shared package (not a `lib.*`) — it is imported by
`services/*` config loaders, never by the React apps. See the decision tree
in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

Sits below every service's `config.ts` in the boot path — see
[`docs/README.md`](../../docs/README.md#libraries) for where the shared
backend packages fit relative to the services that consume them. Pairs with
[`@adopt-dont-shop/observability`](../observability/README.md) and
[`@adopt-dont-shop/service-bootstrap`](../service-bootstrap/README.md) as the
common boot substrate.

## Scripts

```bash
pnpm build        # tsc build
pnpm dev          # tsc --watch
pnpm test         # Vitest (run mode)
pnpm lint         # ESLint
pnpm type-check   # TypeScript type-check
```

## Public API / exports

The canonical list lives in [`src/index.ts`](src/index.ts):

- `readSecret(name)` — value from `NAME_FILE` (file contents) or `NAME`, or
  `undefined`.
- `requireSecret(name)` — same, but throws when neither source is set.
- `requireHexSecret(name)` — `requireSecret` plus a hex-format assertion (for
  signing keys).
- `parsePort(raw, fallback, name)` — validated numeric-port parse.

## Environment variables consumed

This package does not read fixed env var names of its own — it resolves
whatever `NAME` / `NAME_FILE` pair a caller asks for. The full list of the
secrets services request through it lives in
[`docs/env-reference.md`](../../docs/env-reference.md).

## Testing notes

Behaviour is covered in [`src/index.test.ts`](src/index.test.ts) against
temp files for the `_FILE` path. Nothing service-specific — see
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
