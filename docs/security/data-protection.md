# Data protection — encryption at rest

> Tracked in [ADS-665](https://linear.app/ideasquared/issue/ADS-665). Created
> 2026-06 in response to the production-readiness review database audit.

This document records which PII columns rely on **application-layer**
encryption and which rely on **storage-layer** (transparent-data-encryption)
encryption supplied by the database provider. It is intentionally short and
authoritative — update it whenever the encryption posture changes.

## TL;DR

- **Application-layer encryption** (always-on, regardless of provider):
  passwords (bcrypt 12), 2FA secrets (AES-256-GCM), 2FA backup codes
  (bcrypt), single-use tokens / verification codes (SHA-256).
- **Storage-layer encryption** (provider-managed, required in production):
  every other PII column — `email`, `phone`, `firstName`, `lastName`, all
  address fields, DOB, free-text profile fields.

Running production on a self-hosted Postgres with an **unencrypted** disk is
**not** supported. Either use a managed provider with AT-REST encryption
enabled, or run self-hosted Postgres on an encrypted block device
(LUKS/dm-crypt, EBS-encrypted volume, etc.).

## Production database provider

The reference production deployment uses **managed Postgres** with
storage-layer encryption enabled by default. Confirm the following for your
deployment before going live:

| Provider | At-rest encryption | Setting / verification |
| --- | --- | --- |
| AWS RDS for PostgreSQL | KMS-backed AES-256, on by default for new instances since 2022 | `DescribeDBInstances → StorageEncrypted: true` |
| Neon | AES-256 on the underlying S3 / EBS | On by default; visible under Project → Settings → Storage |
| Supabase | AES-256 on the underlying disk | On by default (cannot be disabled) |
| GCP Cloud SQL | Google-managed AES-256, on by default | Console → Connections → "Encryption: Google-managed" |
| Self-hosted on encrypted block device | Whatever the block layer provides | Verify via `cryptsetup status` / cloud volume metadata |

Record your provider + verification command in the team runbook (`docs/runbooks/`).

## Columns covered by application-layer encryption

Code references below point at the auth service (the former monolith paths
shown are now removed; equivalent logic lives under `services/auth/`).

| Column / table | Algorithm | Code reference (former monolith) |
| --- | --- | --- |
| `users.password` | bcrypt (12 rounds) | `src/models/User.ts` |
| `users.totp_secret` | AES-256-GCM (env-key `ENCRYPTION_KEY`) | `src/services/two-factor.service.ts` |
| `users.backup_codes` | bcrypt (per code) | same |
| `password_reset_tokens.token_hash`, `email_verification.token_hash` | SHA-256 | `src/services/auth.service.ts` |

Anything **not** listed above is plaintext at the application layer and
relies on the storage layer for at-rest confidentiality.

## Columns relying on storage-layer encryption

In the `users`, `profile`, `application_drafts`, `pets` and audit-log tables:

- `email`, normalised email, contact email
- `phone`, alternative phone
- `firstName`, `lastName`, preferred name
- `address_line_1`, `address_line_2`, `city`, `region`, `postcode`, `country`
- `date_of_birth`
- free-text fields submitted as part of adoption applications (cover
  letters, lifestyle answers) — `application_drafts.payload` JSONB
- audit-log `details` JSONB (subject to Winston redaction at write time —
  via the shared redaction in the observability package)

## Backup / snapshot encryption

See [`docs/operations/snapshot-policy.md`](../operations/snapshot-policy.md).
The same storage-layer encryption that protects the live DB also protects
its automated snapshots on every provider in the table above. Once
[ADS-13](https://linear.app/ideasquared/issue/ADS-13) lands and image
storage moves to S3, the bucket MUST be configured with
`SSE-S3` (AES-256) or `SSE-KMS` server-side encryption — track verification
in the same runbook.

## If your provider does not encrypt at rest

Open a follow-up ticket to either:

1. Migrate to a provider that does (preferred), or
2. Implement application-layer column encryption for the columns in the
   "storage-layer" list above. This is a large piece of work — design a
   key-rotation story up-front and budget a sprint.

The application-layer route is intentionally out of scope of ADS-665.
