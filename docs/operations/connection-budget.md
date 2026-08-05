# Postgres Connection Budget [ADS-1042]

How many connections the backend can open against Postgres, why the numbers are
what they are, and how to re-derive them when scaling. Operators tuning replica
counts or `max_connections` should start here.

## The problem this solves

Every schema-owning service opens its own `pg.Pool` via
[`packages/db/src/client.ts`](../../packages/db/src/client.ts). node-pg's
built-in pool `max` is **10**. There are **10 DB-owning services** (`auth`,
`pets`, `rescue`, `applications`, `chat`, `notifications`, `moderation`,
`matching`, `cms`, `audit` — the gateway has no pool). At saturation that is
`10 × 10 = 100` connections, which is exactly Postgres's default
`max_connections = 100`. The cluster was pinned to a single replica per service:
scaling any one service to 2 replicas guaranteed `FATAL: sorry, too many
clients already`.

## The formula

```
Σ (DB-owning services) × pool_max × replicas  +  reserved  <  max_connections
```

- **`reserved`** covers connections that are NOT part of a service pool:
  logical backups (`pg_dump`), migrations at boot (`node-pg-migrate`), and
  operator/admin sessions (`psql`), plus Postgres's own
  `superuser_reserved_connections` (default 3). Budget ~20.

## The chosen numbers

| Setting                    | Value   | Where it lives                                                  |
| -------------------------- | ------- | --------------------------------------------------------------- |
| Per-service pool `max`     | `8`     | `DEFAULT_POOL_MAX` in `packages/db/src/client.ts`               |
| Postgres `max_connections` | `200`   | Postgres `command:` in `docker-compose.{prod,staging}.yml`      |
| Postgres `shared_buffers`  | `512MB` | Postgres `command:` in `docker-compose.{prod,staging}.yml`      |
| Reserved                   | `~20`   | backups + migrations + admin + `superuser_reserved_connections` |

### The arithmetic

```
DB-owning services                = 10
pool_max (default)                = 8

Baseline (1 replica each)         = 10 × 8 × 1        =  80
All services at 2 replicas        = 10 × 8 × 2        = 160
Reserved (backups/migrations/admin) ~                = +20
                                                        ----
Peak demand at full 2× scale-out                     = 180

Postgres max_connections                             = 200
Headroom at full 2× scale-out     = 200 − 180        =  20   ✅
```

The default leaves room to scale **every** service to 2 replicas with 20
connections to spare — comfortably above the ticket's floor of "at least one
service at 2 replicas plus a few reserved". Tune down `max_connections` if you
want a tighter ceiling; the pool default is deliberately conservative so the
budget holds without per-service overrides.

### Why `shared_buffers = 512MB`

`shared_buffers` is not a function of connection count, but a Postgres running
more connections wants more shared cache. `512MB` is ~25% of the `2g` memory
limit on the `database` container (`deploy.resources.limits.memory`) — the
standard starting point. Revisit it if the container's memory limit changes.

## Overriding the pool max

Precedence (highest first):

1. An explicit `max` in `DbClientOptions` at the call site
   (`createDbClient({ ..., max })`).
2. The per-service `DB_POOL_MAX` environment variable (integer > 0; a malformed
   value is ignored in favour of the default).
3. `DEFAULT_POOL_MAX` (8).

Raising a single hot service's ceiling via `DB_POOL_MAX` is the fast lever
during an incident — see
[`docs/runbooks/db-pool-exhaustion.md`](../runbooks/db-pool-exhaustion.md).
Whatever you set, keep the left side of the formula below `max_connections`.

## Recommended next step: pgbouncer

This budget makes single-digit replica scale-out safe, but the real fix for
serious horizontal scale is a **transaction-mode connection pooler
(pgbouncer)** in front of Postgres, so N service replicas multiplex onto a small
fixed set of backend connections and the `Σ services × max × replicas` term
stops growing linearly. That is a larger infra addition (a new service,
health-checking, and pool-mode compatibility review for prepared statements /
`SET search_path`) and is deliberately **out of scope** for ADS-1042. Track it
as the follow-up for genuine multi-replica scale-out.
