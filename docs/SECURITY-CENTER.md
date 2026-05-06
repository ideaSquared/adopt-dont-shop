# Admin Security Center (ADS-108)

The Admin app exposes a **Security Center** at `/security` that consolidates
five security surfaces operators need at hand:

| Tab | What it does | Backing endpoint |
| --- | --- | --- |
| Two-Factor Auth | Enrol the current admin in TOTP MFA, regenerate backup codes | `POST /api/v1/auth/2fa/*` |
| Active Sessions | List refresh-token families, revoke individual or all sessions for a user | `GET /api/v1/admin/security/sessions`, `DELETE /api/v1/admin/security/sessions/:id` |
| IP Restrictions | Manage allow/block lists enforced on `/api/v1/auth/login` | `GET/POST/DELETE /api/v1/admin/security/ip-rules` |
| Login History | Filtered view of `LOGIN`, `LOGOUT`, `PASSWORD_RESET`, `TWO_FACTOR` audit events | `GET /api/v1/admin/security/login-history` |
| Suspicious Activity | Accounts/IPs over the failed-login threshold inside a configurable window | `GET /api/v1/admin/security/suspicious-activity` |
| Account Recovery | Force-lock a suspected-compromised account (revokes sessions + 24h lockout) and unlock automatic lockouts | `POST /api/v1/admin/security/users/:id/lock`, `POST /api/v1/admin/security/users/:id/unlock` |

## Permissions

Two new RBAC permissions gate the Security Center:

- `admin.security.read` — read-only views (sessions, IP rules, login
  history, suspicious activity).
- `admin.security.manage` — mutating operations (revoke sessions,
  add/remove IP rules, lock/unlock accounts).

Both are granted to `super_admin` and `admin` roles by the
`03-role-permissions` seeder. Re-run the permissions + role-permissions
seeders on existing environments to pick them up.

## Best practices

### MFA

- Enable 2FA on every admin account before going live. The password-only
  fallback is the highest-risk path into the platform.
- Store backup codes in a secret manager — they are single-use and
  hashed at rest.

### Sessions

- Treat the active-sessions list as the source of truth for "is this
  account compromised". When in doubt, **force-lock and revoke** then
  ask the user to re-authenticate from a known device.
- Refresh tokens are stored as a family (`family_id`); revoking one
  member of the family logs out only that browser. To kick a user off
  every device, use the "Revoke all for user" button.

### IP restrictions

- Default state is "no rules ⇒ everyone allowed". Adding an allow rule
  flips the default to deny: any login from outside the allow list is
  rejected. **Add the office allow list before locking yourself out.**
- Block rules win over allow rules: a sub-range block inside a broader
  allow range still denies.
- IPv4 supports CIDR (`10.0.0.0/8`); IPv6 currently supports only
  exact-address rules. If you need IPv6 ranges, swap the matcher in
  `service.backend/src/utils/ip-match.ts` for `ipaddr.js`.
- Rules can carry an `expires_at` for temporary blocks (e.g. a 24-hour
  block during an active incident). Expired rules are ignored without
  needing a cleanup job.
- The IP-rule check is wrapped in `try/catch` in
  `middleware/ip-rules.ts` and **fails open** if the DB check itself
  errors — better to take a slightly less safe login than to lock every
  admin out on a transient outage. Failures are logged via
  `loggerHelpers.logSecurity`.

### Account takeover prevention

- The auth service already auto-locks an account after 5 failed logins
  for 30 minutes (`auth.service.ts`). The Security Center's
  **Force-lock** action is the manual escalation: 24-hour lockout,
  every active session revoked, audit trail.
- After a confirmed takeover: force-lock, rotate the user's password
  out-of-band, then unlock. The unlock action also clears
  `loginAttempts` so the user has the full retry budget on their first
  legitimate sign-in.

### Audit logging

- Every mutation in the Security Center writes to `audit_logs` with
  `level=WARNING` and the actor's user ID. The Login History tab
  filters this same table by action.
- Audit logs are retained for 365 days
  (`AuditLogService.cleanupOldLogs`) — long enough to support
  post-incident review but short enough that they aren't a privacy
  liability.

## Threat model notes

- **The IP rule list is a complement, not a replacement, for MFA.** A
  determined attacker with valid credentials and a residential VPN in
  your allow range still gets in; MFA is what stops them.
- **Suspicious-activity detection is heuristic, not anomaly detection.**
  The current implementation just buckets failed logins; it doesn't
  know about geo-velocity, device fingerprinting, or impossible-travel.
  Treat it as a starting point — a flagged user always deserves a human
  look.
- **Session revocation is best-effort against the refresh token.**
  Access tokens (JWTs) are valid until they expire; if you need
  immediate denial of an in-flight access token, deny-list the JTI via
  `RevokedToken` (handled separately by the auth service).
