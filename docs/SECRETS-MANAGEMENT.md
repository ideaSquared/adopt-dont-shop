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
# Generate all required secrets automatically
make generate-secrets

# Or generate individually
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -hex 32     # For ENCRYPTION_KEY
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

For production deployments using Docker Swarm, use Docker secrets instead of environment variables.

### Why Docker Secrets?

- ✅ Never stored in container images
- ✅ Encrypted at rest and in transit
- ✅ Only available to services that need them
- ✅ Not visible in `docker inspect`
- ✅ Automatically mounted as files in `/run/secrets/`

### Creating Docker Secrets

```bash
# Create secrets from files
echo "my-strong-password" | docker secret create postgres_password -
echo "my-jwt-secret" | docker secret create jwt_secret -
echo "my-redis-password" | docker secret create redis_password -

# Or from existing .env file (for batch creation)
docker secret create postgres_password /path/to/postgres_password.txt
```

### Using Docker Secrets in Compose

Update `docker-compose.prod.yml`:

```yaml
services:
  database:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

  service-backend:
    secrets:
      - postgres_password
      - jwt_secret
      - redis_password
    environment:
      DB_PASSWORD_FILE: /run/secrets/postgres_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      REDIS_PASSWORD_FILE: /run/secrets/redis_password

secrets:
  postgres_password:
    external: true
  jwt_secret:
    external: true
  redis_password:
    external: true
```

### Application Code for Docker Secrets

Your application needs to read secrets from files:

```typescript
// utils/secrets.ts
import fs from 'fs';
import path from 'path';

export function getSecret(secretName: string, envVar: string): string {
  // Try to read from Docker secret file first
  const secretFile = process.env[`${envVar}_FILE`];
  if (secretFile) {
    try {
      return fs.readFileSync(secretFile, 'utf8').trim();
    } catch (error) {
      console.warn(`Failed to read secret from ${secretFile}:`, error);
    }
  }

  // Fall back to environment variable
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`Secret ${envVar} not found in environment or file`);
  }

  return value;
}

// Usage
const dbPassword = getSecret('DB_PASSWORD', 'DB_PASSWORD');
const jwtSecret = getSecret('JWT_SECRET', 'JWT_SECRET');
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
- [ ] All required secrets are set (check with `make validate-env`)
- [ ] Secrets are stored in secure location (secrets manager)
- [ ] Access to secrets is logged and audited
- [ ] Team members understand secrets management procedures

### Environment Validation

```bash
# Validate all required secrets are set
make validate-env

# Check for weak or default passwords
make check-secrets-strength
```

### CI/CD Integration

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
POSTGRES_PASSWORD=xxx JWT_SECRET=xxx docker-compose up -d
```

**Method 2: .env File (Recommended for Development)**
```bash
docker-compose --env-file .env.prod up -d
```

**Method 3: Docker Secrets (Recommended for Production)**
```bash
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml adopt-dont-shop
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
docker-compose config | grep POSTGRES_PASSWORD
```

### Secrets Not Loading in Container

**Cause:** Environment variables not passed to container.

**Solution:**
```bash
# Verify .env file is in project root
ls -la .env

# Check docker-compose reads the file
docker-compose config

# Restart containers to pick up changes
docker-compose down
docker-compose up -d
```

### Docker Secrets Not Found

**Cause:** Secret not created in Docker Swarm.

**Solution:**
```bash
# List existing secrets
docker secret ls

# Create missing secret
echo "password" | docker secret create postgres_password -

# Redeploy stack
docker stack deploy -c docker-compose.yml adopt-dont-shop
```

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Docker Secrets Documentation](https://docs.docker.com/engine/swarm/secrets/)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [12-Factor App - Config](https://12factor.net/config)
