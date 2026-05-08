# Testing strategy and scope

This document is the authoritative reference for what is — and is not —
covered by automated tests in this repository.

## Test runners

| Runner   | Where it lives                                  | What it covers                                     |
| -------- | ----------------------------------------------- | -------------------------------------------------- |
| Vitest   | `service.backend`, `app.*`, every `lib.*`       | Behaviour-driven tests for services, components, libraries |
| Playwright | `e2e/`                                          | Cross-app integration journeys against the docker-compose stack |

`service.backend` test config lives in `service.backend/vitest.config.ts`
and enforces coverage thresholds (see ADS-418). `npm run test:coverage`
in that workspace fails the build below the thresholds.

## E2E gating

The Playwright job in `.github/workflows/ci.yml` is no longer
`continue-on-error: true` (ADS-419) — broken integration tests now block
PR merges. Add `test-e2e` as a required status check in branch
protection once it has shipped.

## Scope: payment / donation processing — out of scope

A repo-wide search for `stripe`, `paypal`, `payment`, and `donation`
returns no production code paths that handle money:

- The single `payment` reference in `models/SupportTicket.ts` is the
  enum value `PAYMENT_ISSUE` used to categorise support tickets — there
  is no payment processing behind it.
- No service file touches a card processor SDK.
- No frontend route renders a checkout/donation form.

Adoption is intentionally a free workflow: rescues vet adopters and
transfer pets without payment. Donations, if ever introduced, would
arrive as a discrete feature with its own stripe/paypal integration and
test suite.

**Conclusion (ADS-529):** payment and donation flows are explicitly out
of scope for the launch. They should not appear as gaps in production
readiness audits unless product reverses this decision. If that
happens, this document and the audit checklists must be updated in the
same PR that introduces the feature.

## Behaviour-driven testing rules

The full ruleset lives in `.claude/CLAUDE.md`. The tactical reminders
that come up most often:

- No `as any`, no private-method spies, no implementation-detail tests.
- Test through public APIs; for routes, that means supertest against
  the Express router with `vi.mock()` on the service layer.
- 100% coverage of behaviour is the aspiration, but coverage thresholds
  (see `vitest.config.ts`) define the *enforced* floor.

## `lib.*` test guard

`scripts/check-lib-tests.mjs` fails CI if any `lib.*` package ships with
zero test files. The allowlist is currently empty (ADS-528) — if you
add a new library that legitimately has no testable behaviour, add it
to the allowlist with a Linear ticket reference and a plan to remove
the entry.
