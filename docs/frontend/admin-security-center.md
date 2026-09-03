# Admin Security Center (ADS-108)

Feature doc for the admin app's `/security` page: the tabs it exposes, the
gateway endpoints behind them, and the operator playbooks. Audience: admin-app
engineers and operators.

The Admin app exposes a **Security Center** at `/security`
(`apps/admin/src/pages/SecurityCenter.tsx`) that consolidates the security
surfaces operators need at hand.

## Tabs and backing endpoints

Endpoints are the gateway routes in `services/gateway/src/routes/security.ts`
(admin-scoped) and `services/gateway/src/routes/auth.ts` (the current admin's
own 2FA).

| Tab                 | What it does                                                                | Backing endpoint(s)                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two-Factor Auth     | Enrol the current admin in TOTP MFA, regenerate backup codes                | `POST /api/v1/auth/2fa/setup`, `/2fa/enable`, `/2fa/disable`, `/2fa/backup-codes/regenerate`                                                       |
| Active Sessions     | List sessions across users; revoke one session, or all of a user's sessions | `GET /api/v1/admin/security/sessions`, `DELETE /api/v1/admin/security/sessions/:sessionId`, `DELETE /api/v1/admin/security/users/:userId/sessions` |
| IP Restrictions     | Manage allow/block rules (storage + management only — see note)             | `GET/POST /api/v1/admin/security/ip-rules`, `DELETE /api/v1/admin/security/ip-rules/:ipRuleId`                                                     |
| Login History       | Filtered view of authentication events from the audit log                   | `GET /api/v1/admin/security/login-history`                                                                                                         |
| Suspicious Activity | Accounts/IPs over the failed-login threshold inside a window                | `GET /api/v1/admin/security/suspicious-activity`                                                                                                   |
| Account Recovery    | Force-lock a suspected-compromised account, and unlock automatic lockouts   | `POST /api/v1/admin/security/users/:userId/lock`, `POST /api/v1/admin/security/users/:userId/unlock`                                               |

Login History and Suspicious Activity are **not** their own tables: the gateway
serves them from `service.audit`'s `AuditQueryService.Query`, reading the
`auth.actionTaken` events persisted in `audit.audit_events`. IP-rule CRUD is
handled in `services/auth/src/grpc/admin-handlers.ts` against the `auth.ip_rules`
table (migration `services/auth/src/migrations/019_create_ip_rules.ts`).

## Permissions

Two RBAC permissions gate the Security Center:

- `admin.security.read` — read-only views (sessions, IP rules, login
  history, suspicious activity).
- `admin.security.manage` — mutating operations (revoke sessions,
  add/remove IP rules, lock/unlock accounts).

Both are granted to `super_admin` and `admin` roles by the auth service's
role-permissions reference seeder. Re-run the reference seed on existing
environments to pick them up.

## Best practices

### MFA

- Enable 2FA on every admin account before going live. The password-only
  fallback is the highest-risk path into the platform.
- Store backup codes in a secret manager — they are single-use and hashed at
  rest.

### Sessions

- Treat the active-sessions list as the source of truth for "is this account
  compromised". When in doubt, **force-lock and revoke**, then ask the user to
  re-authenticate from a known device.
- Revoking one session logs out only that browser. To kick a user off every
  device, use "Revoke all for user"
  (`DELETE /api/v1/admin/security/users/:userId/sessions`), which returns the
  revoked count.

### IP restrictions

> **Evaluation is not wired yet.** The IP-rule tab is a **management and storage
> surface only**: rules are stored in `auth.ip_rules` and can be created/listed/
> deleted, but nothing evaluates the connecting IP against them yet (see the
> comment at `services/auth/src/grpc/admin-handlers.ts`, "Evaluation … is not
> wired yet"). Adding a rule does **not** currently block or allow any login. Do
> not rely on IP rules for enforcement until that lands.

- The data model supports allow and block rules, CIDR for IPv4, an optional
  `expires_at`, and an `is_active` flag. The intended semantics (default-allow
  until the first allow rule flips to default-deny; block wins over allow) are
  design intent, not yet enforced behaviour.

### Account takeover prevention

- The auth service applies a **progressive login throttle**: after
  `LOGIN_LOCK_THRESHOLD` (5) failed attempts each further failure applies an
  exponentially-growing soft-lock that clears on the next successful login
  (`services/auth/src/grpc/handlers.ts`). This is not a fixed-duration lockout.
- The Security Center's **Force-lock** action is the manual escalation: it locks
  the account and revokes its active sessions. **Unlock** clears the lock and the
  `login_attempts` counter so the user has a full retry budget on their next
  legitimate sign-in.
- After a confirmed takeover: force-lock, rotate the user's password
  out-of-band, then unlock.

### Audit logging

- Security Center mutations are recorded through the audit event stream and
  surface in `audit.audit_events` (queried by the Login History tab via
  `AuditQueryService.Query`).

## Threat model notes

- **IP rules are intended as a complement to MFA, not a replacement** — and
  today they are not enforced at all (see the note above). MFA is the control
  that actually stops an attacker with valid credentials.
- **Suspicious-activity detection is heuristic, not anomaly detection.** It
  buckets failed logins; it does not know geo-velocity, device fingerprinting,
  or impossible-travel. A flagged user always deserves a human look.
- **Session revocation is best-effort against the refresh token.** Access tokens
  (JWTs) remain valid until they expire; immediate denial of an in-flight access
  token requires the auth service's separate revocation path.
