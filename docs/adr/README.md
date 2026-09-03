# Architecture Decision Records

Index of every ADR in this repo. Audience: anyone deciding whether a change is
already governed by a recorded decision, or why the system is built the way it is.

An ADR is permanent once written: it records a decision at a point in time.
Supersede it with a new ADR rather than rewriting history; keep the old file with
a `Superseded by` status. New ADRs start from
[`docs/templates/ADR.md`](../templates/ADR.md).

## Status vocabulary

Every ADR's `- Status:` bullet uses one of:

| Status                 | Meaning                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Proposed               | Written, not yet accepted or built.                              |
| Accepted               | Decision agreed; not necessarily built yet.                      |
| Accepted — implemented | Agreed and shipped in the codebase.                              |
| Partially implemented  | Some items shipped; the Status bullet names what is outstanding. |
| Superseded by ADR NNNN | Replaced by a later ADR (named).                                 |
| Rejected               | Considered and declined; kept for the reasoning.                 |

`docs/README.md`'s ADR lines are copied from these files' `- Status:` bullets —
the file is the source of truth. When you change an ADR's status, update the
index line to match.

## Index

| Number                                           | Title                                                    | Status                 | Date       | Supersedes / Superseded by            |
| ------------------------------------------------ | -------------------------------------------------------- | ---------------------- | ---------- | ------------------------------------- |
| [0001](./0001-entity-detail-pattern.md)          | Entity-detail pattern                                    | Accepted               | 2026-05-22 | —                                     |
| [0002](./0002-applications-strangler-cutover.md) | Applications strangler-fig cutover plan                  | Superseded             | 2026-06-06 | Superseded by the completed migration |
| [0003](./0003-idempotent-event-consumers.md)     | At-least-once delivery and idempotent event consumers    | Accepted               | 2026-06-16 | —                                     |
| [0004](./0004-postgres-read-replica-routing.md)  | Postgres read-replica routing in `@adopt-dont-shop/db`   | Accepted               | 2026-06-16 | —                                     |
| [0005](./0005-pact-contract-tests.md)            | Pact consumer-driven contract tests                      | Accepted — implemented | 2026-06-18 | —                                     |
| [0006](./0006-field-permission-enforcement.md)   | Field-level permission enforcement                       | Partially implemented  | 2026-08-04 | —                                     |
| [0007](./0007-postgres-backups-pitr-restore.md)  | Postgres backups, PITR & restore verification            | Partially implemented  | 2026-08-05 | —                                     |
| [0008](./0008-pre-deploy-migration-strategy.md)  | Pre-deploy migration strategy                            | Proposed               | 2026-08-05 | —                                     |
| [0009](./0009-deployment-strategy-and-ha.md)     | Deployment strategy & high availability                  | Superseded by ADR 0011 | 2026-08-05 | Superseded by ADR 0011                |
| [0010](./0010-frontend-quality-gates.md)         | Frontend quality gates                                   | Partially implemented  | 2026-08-05 | —                                     |
| [0011](./0011-interim-availability-posture.md)   | Interim availability posture for the eyes-on launch      | Accepted               | 2026-08-28 | Supersedes ADR 0009                   |
| [0012](./0012-internal-defence-in-depth.md)      | Internal defence-in-depth posture for the eyes-on launch | Accepted               | 2026-08-28 | —                                     |
| [0013](./0013-socket-sticky-sessions.md)         | Sticky sessions for the Socket.IO connection cap         | Accepted               | 2026-06-04 | —                                     |
| [0014](./0014-httponly-cookie-token-storage.md)  | HttpOnly cookie token storage                            | Accepted — implemented | 2026-08-28 | —                                     |
