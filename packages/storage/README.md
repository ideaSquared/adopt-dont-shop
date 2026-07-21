# @adopt-dont-shop/storage

## Purpose

Config-injected file-storage abstraction for the backend microservices: a
single `StorageProvider` contract backed by two implementations — local
filesystem and S3 — extracted from `service.backend`'s storage service with no
coupling to a global config, logger, or uuid helper. Malware/AV scanning is
intentionally out of scope (a documented follow-up; wire a scan step in front of
`uploadFile`).

This is a service-only shared package (not a `lib.*`) — used today by the
gateway's uploads surface. See the decision tree in
[`CONTRIBUTING.md`](../../CONTRIBUTING.md#where-does-my-code-go).

## Location in the architecture

See [`docs/README.md`](../../docs/README.md#libraries) for where the shared
packages sit. The gateway constructs a provider from its own storage config and
serves the `/api/v1/uploads/*` + signed-serve surface through it.

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

- `createStorageProvider(config)` + `StorageConfig` — factory selecting the
  `local` or `s3` provider from injected config (no global import; logging via
  an optional `{ info?, warn?, error? }`, default no-op).
- `StorageProvider` contract: `uploadFile`, `deleteFile`, `getFileInfo`,
  `getName`, `validateConfiguration`, `supportsSignedUrls`, `getSignedUrl`.

Local processes `image/*` through sharp (resize >1920px → JPEG, pixel cap
`100_000_000`), stores other content untouched, and does not support signed
URLs. S3 uploads with SSE-S3 + `Content-Disposition: attachment` for non-image
content and mints short-lived signed URLs.

## Environment variables consumed

None directly — the caller passes `StorageConfig`. When using the S3 provider,
callers typically source `S3_BUCKET_NAME`, `S3_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `CLOUDFRONT_DOMAIN` into that config. See
[`docs/env-reference.md`](../../docs/env-reference.md) for the full list.

## Testing notes

Vitest — the local provider is tested against a temp directory (image
processing, non-image passthrough, signed-URL rejection); the S3 provider is
tested with the AWS SDK client stubbed. See
[`docs/backend/testing.md`](../../docs/backend/testing.md) for shared
conventions.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/packages/`.
