# Data protection — encryption at rest

Which PII columns are encrypted by the application vs. left to the storage
layer. Audience: backend and infra engineers reviewing the at-rest posture.

`Last reviewed: 2026-09-03`

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
- **Storage-layer encryption** (host block device today — see below):
  every other PII column — `email`, `phone`, `firstName`, `lastName`, all
  address fields, DOB, free-text profile fields.

Running production on a self-hosted Postgres with an **unencrypted** disk is
**not** supported. Either use a managed provider with AT-REST encryption
enabled, or run self-hosted Postgres on an encrypted block device
(LUKS/dm-crypt, EBS-encrypted volume, etc.).

## Production database provider

Production runs **self-hosted Postgres in a single container on a single
host** (`docker-compose.prod.yml`: the `postgis/postgis:16-3.4` service with the
`postgres_data` named volume). Per [ADR 0011](../adr/0011-interim-availability-posture.md)
this is a deliberate interim posture — one Postgres, one Redis, one NATS, one
host — not a managed database service. There is **no provider-managed
transparent-data-encryption**: at-rest confidentiality for every non-application-
encrypted column depends entirely on the host's block device.

Before going live, the host's data volume MUST sit on an encrypted block device
(LUKS/dm-crypt, or an encrypted cloud volume). Verify with `cryptsetup status`
or the cloud volume's metadata, and record the result in the team runbook
(`docs/runbooks/`). Running production Postgres on an **unencrypted** disk is
**not** supported.

The managed-provider comparison table is kept as an appendix below for the day
this migrates to managed Postgres.

## Columns covered by application-layer encryption

These are always encrypted at the application layer regardless of the storage
posture, in the auth service:

| Column / table                   | Algorithm                              | Code reference                                                                                                                                                              |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users.password`                 | bcrypt                                 | `services/auth/src/grpc/` password handlers                                                                                                                                 |
| `users.totp_secret`              | AES-256-GCM (env-key `ENCRYPTION_KEY`) | `services/auth/src/grpc/totp-crypto.ts`; key wired in `services/auth/src/config.ts` (`ENCRYPTION_KEY`); backfill `services/auth/src/migrations/027_encrypt_totp_secrets.ts` |
| `users.backup_codes`             | bcrypt (per code)                      | `services/auth/src/grpc/` 2FA handlers                                                                                                                                      |
| auth / refresh single-use tokens | SHA-256 hash at rest                   | `services/auth/src/migrations/024_hash_auth_tokens.ts`, `025_hash_refresh_tokens.ts`                                                                                        |

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
The same host-disk encryption that protects the live DB also protects its
logical snapshots wherever they are written. Once
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

## Appendix — if you migrate to managed Postgres

Production is self-hosted today (see above). If it later moves to a managed
Postgres service, confirm at-rest encryption for the chosen provider:

| Provider                              | At-rest encryption                                             | Setting / verification                                    |
| ------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| AWS RDS for PostgreSQL                | KMS-backed AES-256, on by default for new instances since 2022 | `DescribeDBInstances → StorageEncrypted: true`            |
| Neon                                  | AES-256 on the underlying S3 / EBS                             | On by default; visible under Project → Settings → Storage |
| Supabase                              | AES-256 on the underlying disk                                 | On by default (cannot be disabled)                        |
| GCP Cloud SQL                         | Google-managed AES-256, on by default                          | Console → Connections → "Encryption: Google-managed"      |
| Self-hosted on encrypted block device | Whatever the block layer provides                              | Verify via `cryptsetup status` / cloud volume metadata    |
