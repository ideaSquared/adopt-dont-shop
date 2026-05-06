# Production Bootstrap Runbook

One-shot operation: create the very first admin user on a fresh production
deployment. **Not** part of normal seeding — never invoke from CI or from
every-deploy automation.

## Preconditions

1. Migrations have run against the target DB (`npm run db:migrate`).
2. Reference data exists: roles, permissions, role-permissions
   (`npm run db:seed:reference`).
3. Operator has temporary access to write the admin credentials into the
   environment of the bootstrap job (e.g. AWS Secrets Manager → ECS task
   env, or k8s Secret → Job env).

## Required env vars

| Var | Purpose |
| --- | --- |
| `NODE_ENV=production` (or `staging`) | Policy gate. |
| `ALLOW_BOOTSTRAP=true` | Per-invocation human confirmation. |
| `ADMIN_EMAIL` | Email for the initial admin account. |
| `ADMIN_INITIAL_PASSWORD` | Temporary password — invalidated on first login. |
| `DATABASE_URL` (or per-component DB env) | Standard backend DB config. |

## Run

```bash
NODE_ENV=production \
ALLOW_BOOTSTRAP=true \
ADMIN_EMAIL=ops@example.com \
ADMIN_INITIAL_PASSWORD='<from-secret-manager>' \
node dist/seeders/cli.js --bootstrap
```

## What happens

- If any user already has the `admin` role: no-op (logged, exit 0).
- Otherwise: a new user is created with the temp password and
  `resetTokenForceFlag=true`, then linked to the `admin` role.
- The first login requires a password reset before any other API access.

## Rollback

There is no rollback — if the wrong email is used, deactivate the account
via SQL or the admin API after first login.

## Post-bootstrap

1. Log in once with the temp password and complete the forced reset.
2. Rotate `ADMIN_INITIAL_PASSWORD` in the secret manager (or remove the
   secret entirely — it is no longer needed).
3. Remove the bootstrap job from the deployment pipeline if it was
   added there during initial setup.
