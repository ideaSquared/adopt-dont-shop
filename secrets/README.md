# Docker secret files

This directory holds the file-mounted secrets consumed by
`docker-compose.staging.yml` and `docker-compose.prod.yml`. Each service reads
them at boot through the `@adopt-dont-shop/config-secrets` loader
(`NAME_FILE` wins over `NAME`).

**Nothing in here is committed** — `.gitignore` excludes everything except
itself and this README. Operators populate these files on the deploy host
before `docker compose up -d`; the deploy workflow
(`.github/workflows/deploy.yml`) does it automatically for the CI path.

## Required files

| File                          | Consumed by                     | Contents                                                      |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `database_url`                | every domain service            | `postgresql://user:pass@database:5432/db`                      |
| `redis_url`                   | every domain service            | `redis://:pass@redis:6379`                                     |
| `jwt_secret`                  | `service-auth`                  | access-token signing secret                                    |
| `jwt_refresh_secret`          | `service-auth`                  | refresh-token signing secret                                   |
| `upload_signing_secret`       | `service-gateway`               | HMAC secret for `/uploads-signed` URLs                         |
| `principal_signing_key`       | `service-gateway` + every domain service | HMAC key for the signed `x-principal-token` gRPC metadata (ADS-800) |
| `db_password`                 | `database` container (staging + production) | Postgres superuser password (read via `POSTGRES_PASSWORD_FILE`) |
| `redis_password`              | `redis` container (staging + dev) | Same value as in `redis_url`; the redis container reads it directly (`cat /run/secrets/redis_password`) for its own `--requirepass` instead of via `environment:` (ADS-878) |

Each file must contain only the secret value (trailing whitespace is
trimmed by the loader). No quoting, no `KEY=value` framing — just the value.

## Dev / escape hatch

The dev compose (`docker-compose.yml`) does **not** use these files for the
domain services; they still rely on plaintext env interpolation from `.env`.
The loader also accepts plaintext env vars (`NAME=…`) when the `*_FILE` form
is absent, so an operator who can't mount files for some reason can still
boot the stack by setting the raw env vars.

The one exception is `redis_password` (ADS-878): the `redis` container itself
reads its `--requirepass` value from this file in dev too, so that its
credential never shows up in `docker inspect`. `pnpm docker:dev` materialises
`./secrets/redis_password` from `.env`'s `REDIS_PASSWORD` automatically — no
manual step needed.
