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
| `db_password` (staging only)  | `database` container            | Postgres superuser password (read via `POSTGRES_PASSWORD_FILE`) |

Each file must contain only the secret value (trailing whitespace is
trimmed by the loader). No quoting, no `KEY=value` framing — just the value.

## Dev / escape hatch

The dev compose (`docker-compose.yml`) does **not** use these files; it relies
on plaintext env interpolation from `.env`. The loader also accepts plaintext
env vars (`NAME=…`) when the `*_FILE` form is absent, so an operator who
can't mount files for some reason can still boot the stack by setting the raw
env vars.
