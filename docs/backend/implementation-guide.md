# Backend Service Implementation Guide

## Quick Start

### Prerequisites

- Node.js 22 (pinned in `.nvmrc`; `package.json` `engines` requires `>=22 <23`)
- PostgreSQL 16 with PostGIS (provided by the Docker stack)
- Docker and Docker Compose (recommended)

### Development Setup

From the repository root the typical workflow uses Docker — the container boots the database, Redis, and the backend in one command. See the [root README](../../README.md) for the full quick start.

1. **Install workspace dependencies (from repo root)**

   ```bash
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   npm run secrets:generate >> .env
   # Edit .env to set POSTGRES_PASSWORD and any third-party keys
   ```

3. **Start the stack**

   ```bash
   npm run docker:dev          # foreground
   npm run docker:dev:detach   # or background
   ```

4. **Initialize the database (first run, or after `docker:reset`)**

   The migration runner is a custom Umzug script at `service.backend/src/migrations/runner.ts` (the project does not use `sequelize-cli`). Seeds are split into reference / demo / fixtures with no "do everything" alias — pick the right one for what you're doing.

   ```bash
   # From the repo root — wrappers shell into the service-backend container
   npm run db:migrate                                       # runs `ts-node src/migrations/runner.ts up`
   docker compose exec service-backend npm run db:seed:reference  # idempotent reference data
   docker compose exec service-backend npm run db:seed:demo       # Faker-generated demo data (dev/staging only)
   docker compose exec service-backend npm run db:seed:fixtures   # deterministic e2e fixtures
   ```

5. **Backend is reachable at**

   ```
   http://localhost:5000       # direct
   http://api.localhost        # via the nginx reverse proxy
   ```

### Native (no-Docker) Development

If you prefer to run the backend on the host (you must provide Postgres and Redis yourself):

```bash
cd service.backend
npm run dev                  # ts-node-dev --respawn --transpile-only --poll --watch src src/index.ts
```

## Environment Configuration

### Development (.env)

```bash
# Environment
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=adopt_dont_shop_dev

# JWT
JWT_SECRET=your-development-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Development - Free)
EMAIL_PROVIDER=ethereal

# Storage (Development - Free)
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
PUBLIC_UPLOAD_PATH=/uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-development-session-secret

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production Configuration

```bash
# Environment
NODE_ENV=production

# Email (Production)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@adoptdontshop.com

# Storage (Production)
STORAGE_PROVIDER=s3
S3_BUCKET_NAME=adoptdontshop-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
CLOUDFRONT_DOMAIN=cdn.adoptdontshop.com
```

## Email Service Setup

### Ethereal Mail (Development)

Ethereal creates test accounts automatically - no configuration needed!

```typescript
// Automatically configured in development
EMAIL_PROVIDER = ethereal;
```

Access preview emails at the URL logged in console:

```
📧 Preview Email: https://ethereal.email/messages/xxxxx
```

### SendGrid (Production)

1. Create SendGrid account
2. Generate API key
3. Configure environment:
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your_api_key
   SENDGRID_FROM_EMAIL=noreply@adoptdontshop.com
   ```

## File Storage Setup

### Local Storage (Development)

Files stored in `uploads/` directory - no setup required!

```bash
STORAGE_PROVIDER=local
UPLOAD_DIR=uploads
```

Organized structure:

```
uploads/
├── pets/       # Pet photos
├── users/      # User avatars
├── documents/  # Application documents
└── temp/       # Temporary files
```

### AWS S3 (Production)

1. Create S3 bucket
2. Configure IAM user with S3 permissions
3. Optional: Set up CloudFront CDN
4. Configure environment:
   ```bash
   STORAGE_PROVIDER=s3
   S3_BUCKET_NAME=your-bucket-name
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

## Database Management

The project uses a custom [Umzug](https://github.com/sequelize/umzug) runner (`service.backend/src/migrations/runner.ts`) and a custom seed CLI (`service.backend/src/seeders/cli.ts`) — `sequelize-cli` is **not** installed. Migrations live in `service.backend/src/migrations/`; seeders in `service.backend/src/seeders/`.

### Migrations

```bash
# Run pending migrations (from repo root)
npm run db:migrate

# Status / rollback — exec inside the backend container
docker compose exec service-backend npm run db:migrate:status
docker compose exec service-backend npm run db:migrate:undo

# Authoring a new migration: copy an existing file in
# service.backend/src/migrations/ and follow the numbered naming pattern
# (e.g. 01-add-something.ts). The runner picks them up automatically.
```

### Seeders

Seeds are deliberately not fungible — each type has a different safety profile:

```bash
docker compose exec service-backend npm run db:seed:reference   # idempotent, safe anywhere
docker compose exec service-backend npm run db:seed:demo        # Faker (dev/staging) — ALLOW_DEMO_SEED required
docker compose exec service-backend npm run db:seed:fixtures    # deterministic e2e fixtures
docker compose exec service-backend npm run db:seed:reset       # truncate demo+fixture tables
docker compose exec service-backend npm run db:bootstrap        # first-run admin in production
```

See `service.backend/src/seeders/README.md` for the full split.

## Testing

### Run Tests

The backend uses **Vitest**. Run from `service.backend/` (or via `npx turbo test --filter=@adopt-dont-shop/service-backend` at the root).

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Vitest UI
npm run test:ui

# Coverage report
npm run test:coverage

# Specific test file
npm test -- src/__tests__/services/user.service.test.ts
```

Load-testing and performance-profiling scripts are not yet set up.

## Health Monitoring

### Health Check Endpoints

```bash
# Full health check
GET http://localhost:5000/health

# Simple check (for load balancers)
GET http://localhost:5000/health/simple

# Readiness check (for Kubernetes)
GET http://localhost:5000/health/ready
```

### Development Dashboard

View real-time service health at:

```
http://localhost:5000/monitoring/dashboard
```

Shows:

- Service status (database, email, storage)
- Response times
- Memory usage
- Active connections
- Auto-refreshes every 5 seconds

## Docker Deployment

### Development

```bash
# Start all services
docker compose up

# Build and start
docker compose up --build

# Start specific service
docker compose up service-backend

# View logs
docker compose logs -f service-backend
```

### Production

```bash
# Build production image (multi-stage target in the shared Dockerfile)
docker build \
  --target production \
  -t adoptdontshop/backend:latest \
  -f service.backend/Dockerfile .

# Run production container
docker run -p 5000:5000 \
  --env-file .env.production \
  adoptdontshop/backend:latest
```

The root `docker-compose.prod.yml` overlay exercises this path end-to-end — see [Deployment Guide](./deployment.md) and [Docker Infrastructure Guide](../DOCKER.md).

## Common Tasks

### Add New API Endpoint

1. **Create route file** `src/routes/myresource.routes.ts`
2. **Create controller** `src/controllers/myresource.controller.ts`
3. **Create service** `src/services/myresource.service.ts`
4. **Add model** (if needed) `src/models/MyResource.ts`
5. **Register route** in `src/index.ts`
6. **Add tests** under `src/__tests__/services/myresource.service.test.ts`

### Add Database Model

1. **Create migration** by copying the latest file in `service.backend/src/migrations/` and renaming it (the runner is a custom Umzug script — no generator). Follow the existing numbered naming pattern (`NN-create-my-table.ts`).
2. **Define schema** in the migration file under `src/migrations/`
3. **Create model** `src/models/MyModel.ts`
4. **Run migration** `npm run db:migrate` (from the repo root)
5. **Add associations** in the model file
6. **Create seeder** (optional) under `src/seeders/{reference,demo,fixtures}/` depending on whether it's idempotent reference data, Faker-generated demo data, or a deterministic e2e fixture.

### Update Email Template

1. **Create template** `src/templates/emails/my-template.html`
2. **Register in service** `src/services/email.service.ts`
3. **Test template**
   ```bash
   POST /api/v1/email/templates/:templateId/test
   ```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps database

# Nuclear reset (wipes the volume, then re-initializes)
npm run docker:reset
npm run docker:dev:detach
npm run db:migrate
docker compose exec service-backend npm run db:seed:reference
docker compose exec service-backend npm run db:seed:fixtures
```

### Email Not Sending

```bash
# Check Ethereal credentials in logs
# Look for: "Ethereal Email Provider initialized"

# Test email manually
curl -X POST http://localhost:5000/api/v1/email/templates/welcome/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### File Upload Failures

```bash
# Check upload directory permissions
ls -la uploads/

# Recreate upload directories
rm -rf uploads
npm run dev  # Will recreate automatically
```

### Performance Issues

```bash
# Toggle Sequelize query logging by setting DB_LOGGING=true in .env and restarting the backend
# (`service.backend/src/sequelize.ts` reads DB_LOGGING).

# Monitor in development dashboard
open http://localhost:5000/monitoring/dashboard
```

Load-testing and performance-profiling scripts are not yet set up.

## Best Practices

### Code Organization

- One feature per service file
- Keep controllers thin (delegate to services)
- Use TypeScript types consistently
- Write tests for all services
- Document complex business logic

### Database

- Use migrations for schema changes
- Never modify existing migrations
- Add indexes for frequently queried fields
- Use soft deletes for important data
- Include timestamps on all tables

### Security

- Never commit secrets to git
- Use environment variables for config
- Validate all user input
- Sanitize data before storage
- Use parameterized queries only

### Performance

- Add pagination to all list endpoints
- Use database indexes strategically
- Cache expensive queries
- Optimize N+1 queries
- Monitor slow queries

## Additional Resources

- **API Reference**: [api-endpoints.md](./api-endpoints.md)
- **Database Schema**: [database-schema.md](./database-schema.md)
- **Testing Guide**: [testing.md](./testing.md)
- **Deployment Guide**: [deployment.md](./deployment.md)
- **Troubleshooting**: [troubleshooting.md](./troubleshooting.md)
