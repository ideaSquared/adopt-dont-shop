# Secrets Management Guide

This guide covers best practices for managing secrets and sensitive configuration in the Adopt Don't Shop platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Docker Secrets](#docker-secrets)
- [External Secrets Management](#external-secrets-management)
- [Security Best Practices](#security-best-practices)
- [Production Deployment](#production-deployment)

## Overview

**Never commit secrets to version control!** All sensitive configuration should be:
- Stored in `.env` files (which are gitignored)
- Managed via Docker secrets for production
- Or managed via external secrets management tools (AWS Secrets Manager, HashiCorp Vault, etc.)

## Quick Start

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Generate Strong Secrets

```bash
# Generate all required secrets (cross-platform — uses Node's crypto module)
pnpm secrets:generate

# Append directly to your .env:
pnpm secrets:generate >> .env

# If you need ad-hoc generation, Node works on any platform:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # base64
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # hex (for ENCRYPTION_KEY)
```

### 3. Update .env File

Edit `.env` and replace all `CHANGE_THIS_*` placeholders with the generated secrets.

**Critical secrets to change:**
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `SESSION_SECRET` - Session encryption key
- `CSRF_SECRET` - CSRF token secret
- `ENCRYPTION_KEY` - Data encryption key

## Environment Variables

### Development Setup

```bash
# .env (Development)
NODE_ENV=development
POSTGRES_USER=adopt_user
POSTGRES_PASSWORD=dev_password_change_me
POSTGRES_DB=adopt_dont_shop_dev

JWT_SECRET=dev_jwt_secret_minimum_32_characters_long
JWT_REFRESH_SECRET=dev_refresh_secret_different_from_jwt
SESSION_SECRET=dev_session_secret_also_32_plus_chars
```

### Production Setup

```bash
# .env (Production)
NODE_ENV=production
POSTGRES_USER=adopt_prod_user
POSTGRES_PASSWORD=STRONG_RANDOM_PASSWORD_HERE
POSTGRES_DB=adopt_dont_shop_prod

JWT_SECRET=GENERATED_SECURE_RANDOM_STRING_32_CHARS_MIN
JWT_REFRESH_SECRET=ANOTHER_SECURE_RANDOM_STRING_DIFFERENT
SESSION_SECRET=YET_ANOTHER_SECURE_RANDOM_STRING_HERE
ENCRYPTION_KEY=64_CHAR_HEX_STRING_FOR_ENCRYPTION
```

### Required vs Optional Secrets

#### Required for All Environments

| Secret | Purpose | How to Generate |
|--------|---------|----------------|
| `POSTGRES_PASSWORD` | Database access | `openssl rand -base64 32` |
| `JWT_SECRET` | Sign JWT tokens | `openssl rand -base64 32` |

#### Required for Production

| Secret | Purpose | How to Generate |
|--------|---------|----------------|
| `JWT_REFRESH_SECRET` | Sign refresh tokens | `openssl rand -base64 32` |
| `SESSION_SECRET` | Encrypt sessions | `openssl rand -base64 32` |
| `CSRF_SECRET` | CSRF protection | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Encrypt sensitive data | `openssl rand -hex 32` |
| `REDIS_PASSWORD` | Redis authentication | `openssl rand -base64 32` |

#### Optional (Third-Party Services)

| Secret | Purpose | Where to Get |
|--------|---------|--------------|
| `SENDGRID_API_KEY` | Email sending | SendGrid Dashboard |
| `AWS_S3_ACCESS_KEY_ID` | File storage | AWS IAM |
| `STRIPE_SECRET_KEY` | Payment processing | Stripe Dashboard |
| `SENTRY_DSN` | Error tracking | Sentry Project Settings |

## Docker Secrets

Production deployments use file-based Docker secrets (plain Compose v2, not Swarm). Each secret is a small file written to `./secrets/<name>` on the host by the deploy workflow immediately before `docker compose up -d`. Compose reads the file path from the `file:` key in `docker-compose.prod.yml` and mounts the content at `/run/secrets/<name>` inside the container.

### Why File-Based Secrets?

- ✅ Never stored in container images
- ✅ Not visible in `docker inspect`
- ✅ Automatically mounted at `/run/secrets/<name>` — same path as Swarm secrets
- ✅ Compatible with plain `docker compose up -d` (no Swarm infrastructure required)
- ✅ Secret files are removed from disk after `docker compose up -d` completes

### How the Deploy Workflow Materializes Secrets

The `deploy.yml` and `rollback.yml` workflows pass the 8 production secrets via the `env:` block of the `appleboy/ssh-action` step (never interpolated into the script text). On the server, before `docker compose up -d`, the script writes each secret file using `printf '%s'` (no trailing newline):

```bash
mkdir -p secrets && chmod 700 secrets
printf '%s' "$SECRET_JWT_SECRET"            > secrets/jwt_secret
printf '%s' "$SECRET_JWT_REFRESH_SECRET"    > secrets/jwt_refresh_secret
printf '%s' "$SECRET_SESSION_SECRET"        > secrets/session_secret
printf '%s' "$SECRET_CSRF_SECRET"           > secrets/csrf_secret
printf '%s' "$SECRET_ENCRYPTION_KEY"        > secrets/encryption_key
printf '%s' "$SECRET_UPLOAD_SIGNING_SECRET" > secrets/upload_signing_secret
printf '%s' "$SECRET_DB_PASSWORD"           > secrets/db_password
printf '%s' "$SECRET_REDIS_PASSWORD"        > secrets/redis_password
chmod 600 secrets/*
# ... docker compose up -d ...
rm -f secrets/*
```

The `secrets/` directory is gitignored and must never be committed.

### Compose Configuration (`docker-compose.prod.yml`)

```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret
  jwt_refresh_secret:
    file: ./secrets/jwt_refresh_secret
  session_secret:
    file: ./secrets/session_secret
  csrf_secret:
    file: ./secrets/csrf_secret
  encryption_key:
    file: ./secrets/encryption_key
  upload_signing_secret:
    file: ./secrets/upload_signing_secret
  db_password:
    file: ./secrets/db_password
  redis_password:
    file: ./secrets/redis_password
```

Each service that needs a secret lists it under its own `secrets:` key; Compose mounts the file content at `/run/secrets/<name>`.

### Application Code for Docker Secrets

The backend reads secrets via `readSecretOrEnv()` in `config/env.ts`, which checks `/run/secrets/<name>` first and falls back to the environment variable of the same name:

```typescript
// Reads /run/secrets/<name> if it exists, otherwise falls back to process.env[envVar]
const jwtSecret = readSecretOrEnv('jwt_secret', 'JWT_SECRET');
const dbPassword = readSecretOrEnv('db_password', 'DB_PASSWORD');
```

### Manual Provisioning (without the deploy workflow)

```bash
mkdir -p secrets && chmod 700 secrets
printf '%s' "$(openssl rand -base64 32)"  > secrets/jwt_secret
printf '%s' "$(openssl rand -base64 32)"  > secrets/jwt_refresh_secret
printf '%s' "$(openssl rand -base64 32)"  > secrets/session_secret
printf '%s' "$(openssl rand -base64 32)"  > secrets/csrf_secret
printf '%s' "$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")" > secrets/encryption_key
printf '%s' "$(openssl rand -base64 32)"  > secrets/upload_signing_secret
printf '%s' "$(openssl rand -base64 32)"  > secrets/db_password
printf '%s' "$(openssl rand -base64 32)"  > secrets/redis_password
chmod 600 secrets/*
```

## External Secrets Management

For enterprise deployments, consider external secrets management tools.

### AWS Secrets Manager

```bash
# Install AWS CLI
aws configure

# Store secrets
aws secretsmanager create-secret \
  --name adopt-dont-shop/prod/db-password \
  --secret-string "your-secure-password"

# Retrieve secrets in application
aws secretsmanager get-secret-value \
  --secret-id adopt-dont-shop/prod/db-password \
  --query SecretString --output text
```

### HashiCorp Vault

```bash
# Install Vault
vault kv put secret/adopt-dont-shop/prod \
  db_password="your-secure-password" \
  jwt_secret="your-jwt-secret"

# Retrieve secrets
vault kv get -field=db_password secret/adopt-dont-shop/prod
```

### Kubernetes Secrets

If deploying to Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: adopt-dont-shop-secrets
type: Opaque
stringData:
  postgres-password: "your-secure-password"
  jwt-secret: "your-jwt-secret"
```

## Security Best Practices

### Secret Generation

**DO:**
- ✅ Use cryptographically secure random generators
- ✅ Minimum 32 characters for passwords and keys
- ✅ Use different secrets for different purposes
- ✅ Rotate secrets regularly (90 days recommended)
- ✅ Use hex encoding for encryption keys

**DON'T:**
- ❌ Use dictionary words or common passwords
- ❌ Reuse secrets across environments
- ❌ Share secrets via email or Slack
- ❌ Commit secrets to version control

### Secret Storage

**DO:**
- ✅ Use `.env` files for local development
- ✅ Use Docker secrets or external managers for production
- ✅ Encrypt secrets at rest
- ✅ Limit access to secrets (principle of least privilege)
- ✅ Audit secret access

**DON'T:**
- ❌ Store secrets in plain text files committed to git
- ❌ Store secrets in container images
- ❌ Log secrets in application logs
- ❌ Expose secrets via API responses

### Secret Rotation

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# 2. Add new secret alongside old one
echo "JWT_SECRET_NEW=${NEW_SECRET}" >> .env

# 3. Update application to accept both old and new
# (Verify tokens with both secrets during transition)

# 4. After transition period, remove old secret
sed -i '/JWT_SECRET_OLD/d' .env

# 5. Rename new secret to primary
sed -i 's/JWT_SECRET_NEW/JWT_SECRET/' .env
```

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production:

- [ ] Generated strong, unique secrets for all required variables
- [ ] No default/example values remain in `.env`
- [ ] Secrets are different from development environment
- [ ] All required secrets are set (check with `pnpm validate:env`)
- [ ] Secrets are stored in secure location (secrets manager)
- [ ] Access to secrets is logged and audited
- [ ] Team members understand secrets management procedures

### Environment Validation

```bash
# Validate all required secrets are set
pnpm validate:env
```

### CI/CD Integration

#### GitHub Actions repository secrets

The deploy and rollback workflows require the following secret stored under **Settings → Secrets and variables → Actions**:

| Secret | Required scope | Purpose |
|--------|----------------|---------|
| `GHCR_TOKEN` | `read:packages` **only** | `docker pull` images from GHCR on the deploy server |

`GHCR_TOKEN` must be a Personal Access Token (classic or fine-grained) with **only** `read:packages` permission. Never grant `write:packages` or `repo` scope — a compromised token with those scopes would allow an attacker to push malicious container images or read/modify source code (supply-chain attack). See [ADS-671](https://linear.app/ideasquared/issue/ADS-671).

To rotate this token:
1. Create a new PAT at **GitHub → Settings → Developer settings → Personal access tokens** with `read:packages` only.
2. Update the `GHCR_TOKEN` repository secret under **Settings → Secrets and variables → Actions**.
3. Trigger a staging deploy or rollback to verify the new token works.

**GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Retrieve secrets from AWS Secrets Manager
        run: |
          aws secretsmanager get-secret-value \
            --secret-id adopt-dont-shop/prod \
            --query SecretString \
            --output text > .env
```

### Secrets Injection Methods

**Method 1: Environment Variables (Simplest)**
```bash
POSTGRES_PASSWORD=xxx JWT_SECRET=xxx docker compose up -d
```

**Method 2: .env File (Recommended for Development)**
```bash
docker compose --env-file .env.prod up -d
```

**Method 3: File-Based Docker Secrets (Used in Production)**
```bash
# Write secret files, then bring up the stack (deploy workflow does this automatically)
mkdir -p secrets && chmod 700 secrets
printf '%s' "$JWT_SECRET" > secrets/jwt_secret
# ... (repeat for all 8 secrets) ...
chmod 600 secrets/*
docker compose -f docker-compose.prod.yml --env-file .env up -d
rm -f secrets/*
```

**Method 4: External Secrets Manager (Enterprise)**
- AWS Secrets Manager with ECS/EKS
- HashiCorp Vault with Kubernetes
- Azure Key Vault
- Google Secret Manager

## Troubleshooting

### "POSTGRES_PASSWORD must be set" Error

**Cause:** Required environment variable is not set.

**Solution:**
```bash
# Check if .env file exists
ls -la .env

# Copy from example if missing
cp .env.example .env

# Edit and set all CHANGE_THIS_* values
vim .env

# Verify variables are exported
docker compose config | grep POSTGRES_PASSWORD
```

### Secrets Not Loading in Container

**Cause:** Environment variables not passed to container.

**Solution:**
```bash
# Verify .env file is in project root
ls -la .env

# Check docker compose reads the file
docker compose config

# Restart containers to pick up changes
docker compose down
docker compose up -d
```

### Docker Secrets Not Found

**Cause:** Secret file missing from `./secrets/<name>` on the host before `docker compose up -d` was called.

**Solution:**
```bash
# Check whether the secrets directory exists and contains the expected files
ls -la secrets/

# Re-materialize the missing file (replace with actual secret value)
printf '%s' "actual-secret-value" > secrets/jwt_secret
chmod 600 secrets/jwt_secret

# Restart the affected service
docker compose -f docker-compose.prod.yml --env-file .env up -d service-backend
```

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [12-Factor App - Config](https://12factor.net/config)
