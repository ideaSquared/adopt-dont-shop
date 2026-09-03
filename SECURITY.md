# Security Policy

How to report a vulnerability in Adopt Don't Shop, and what to expect back.

## Reporting a vulnerability

Email **privacy@adoptdontshop.app** with:

- a description of the issue and its impact,
- the steps or proof-of-concept to reproduce it,
- any affected URL, endpoint, or component.

Please report privately. Do not open a public GitHub issue for a suspected
vulnerability, and do not disclose it publicly until we have had a chance to
respond.

## What to expect

- We will acknowledge your report within **5 business days**.
- We will keep you informed as we investigate and work on a fix.

We do not currently run a paid bug-bounty programme.

## Supported versions

Only the `main` branch is supported. This is a continuously deployed
application with a single production line; there are no maintained release
branches, and fixes land on `main`.

## Related documentation

Engineering-facing security documentation lives in
[`docs/security/`](docs/security/):

- [`internal-grpc-trust.md`](docs/security/internal-grpc-trust.md) — internal service trust model
- [`data-protection.md`](docs/security/data-protection.md) — encryption at rest
- [`dependency-policy.md`](docs/security/dependency-policy.md) — dependency & vulnerability CI gates
- [`image-signing.md`](docs/security/image-signing.md) — container image signing
