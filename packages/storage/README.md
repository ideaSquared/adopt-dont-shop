# @adopt-dont-shop/storage

Config-injected file storage abstraction for backend microservices. A single
`StorageProvider` contract backed by two implementations — local filesystem and
S3 — extracted from `service.backend`'s storage service with no coupling to the
monolith's global config, logger, or uuid helpers.

## Usage

```ts
import { createStorageProvider, type StorageConfig } from '@adopt-dont-shop/storage';

const config: StorageConfig = {
  provider: 's3', // or 'local'
  local: { directory: 'uploads', publicPath: '/uploads' },
  s3: {
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN,
  },
  // Optional: any object with info/warn/error. Defaults to a no-op.
  logger: console,
};

const storage = createStorageProvider(config);

const { url, filename, size } = await storage.uploadFile(
  buffer,
  'photo.jpg',
  'image/jpeg',
  'pets'
);
```

## Contract

`StorageProvider` exposes `uploadFile`, `deleteFile`, `getFileInfo`, `getName`,
`validateConfiguration`, `supportsSignedUrls`, and `getSignedUrl`.

- **Local** processes `image/*` content through sharp (resize >1920px, convert
  to JPEG) and writes to disk under `<directory>/<category>/`. Non-image content
  (e.g. `application/pdf`) is stored untouched. `supportsSignedUrls()` is
  `false`; `getSignedUrl()` throws.
- **S3** uploads with SSE-S3 and `Content-Disposition: attachment` for
  non-image content, and mints short-lived signed URLs via the presigner.
  `supportsSignedUrls()` is `true`.

## Decoupling notes

- Config is injected via `createStorageProvider(config)` — there is no global
  config import.
- Filenames use `node:crypto`'s `randomUUID()`.
- Logging goes through an optional minimal logger (`{ info?, warn?, error? }`),
  defaulting to a no-op.
- The sharp pixel cap is a hard-coded `MAX_IMAGE_PIXELS = 100_000_000`.

## Out of scope: malware / AV scanning

Antivirus scanning is **not** included in this package — the monolith's AV
providers are intentionally not ported. Consumers (e.g. the gateway) use this
package without AV for now. Wiring a scanning step in front of `uploadFile` is a
documented follow-up.
