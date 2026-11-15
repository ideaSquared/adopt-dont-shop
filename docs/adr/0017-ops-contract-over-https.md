# ADR 0017 — Serve the shared ops contract over HTTPS, keep the rest of service-ops on the loopback

- Status: Accepted
- Date: 2026-11-15
- Scope: the `/ops/v1/` locations in `deploy/gateway/nginx.conf`, `scripts/check-gateway-staging-access.mjs`, and how `eng ops ads` reaches `service-ops`
- Linear: —
- Supersedes / Superseded by: amends [ADR 0016](./0016-developer-ops-cli.md) for the `/ops/v1` path only

## Context

[ADR 0016](./0016-developer-ops-cli.md) keeps `service-ops` on the host loopback, so reaching it takes an
SSH tunnel. That means a Unix user per engineer on the VPS, an `sshd` `Match` block, a key on the
server and a one-time host-key prompt, on top of membership of the `adoptdontshop` GitHub team. In
practice that was too much setup just to run a read-only command against staging.

`service-ops` also serves the shared `@ideasquared/ops` contract under `/ops/v1` (catalog and invoke),
which is what `eng ops` speaks for every product. creatrgrid serves the same contract on its public
Worker, gated only by GitHub team membership. Agent Idea's logs work the same way.

`/ops/v1` is already the narrow part of `service-ops` (`services/ops/src/shared-ops.ts`):

- Every request carries a GitHub token, and the handler checks it against the `adoptdontshop` team on each request. There is no session to steal.
- Unlocks are never applied, so masked fields stay masked. Request fields annotated as PII or special category, or with no annotation, are not offered.
- Production offers reads only.
- Calls go through the same minted principal, dry run and audit trail as `pnpm ops`.

## Decision

- The edge gateway routes `/ops/v1/` (and nothing else) to `service-ops`:
  - staging: `https://staging-api.adoptdontshop.app/ops/v1/`;
  - production: `https://api.adoptdontshop.app/ops/v1/`.
- That one location skips the staging IP allowlist and password, because the contract carries its own bearer token in the `Authorization` header, which basic auth would also use. `scripts/check-gateway-staging-access.mjs` fails CI if any other staging location skips them.
- The rest of `service-ops` (the `/v1` API behind `pnpm ops`: device-flow sessions, unlocks, history) stays on the loopback behind the SSH tunnel, exactly as ADR 0016 says. It is the break-glass path for revealing personal data.
- `eng ops ads` calls the HTTPS URLs directly. Engineers need only the GitHub team and `gh auth login` (with `read:org`).

## Consequences

- One lock instead of two for `/ops/v1`: a GitHub token with team membership. A stolen token, valid while the person is in the team, can run staging writes and production reads. Removing someone from the team cuts them off at once.
- `/ops/v1` is reachable from the internet, so it is rate limited at the edge (the `api` zone) like the rest of the API.
- An attacker reaches the team check first. A bug in `@ideasquared/ops`'s token check or in `shared-ops.ts` would now be exposed. Both have tests, and the PII rules there fail closed.
- Engineers need SSH only for `pnpm ops` (unlocks and history).
