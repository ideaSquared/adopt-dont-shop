# Backend Service Implementation Guide

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Docker and Docker Compose (recommended)

### Development Setup

1. **Clone and Install**

   ```bash
   cd service.backend
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**

   ```bash
   npm run db:create
   npm run db:migrate
   npm run db:seed  # Optional: sample data
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

   Server will start at `http://localhost:5000`

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

### Migrations

```bash
# Create new migration
npm run migration:create -- --name add-user-fields

# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all
```

### Seeders

```bash
# Create new seeder
npm run seed:create -- --name demo-users

# Run all seeders
npm run db:seed

# Undo last seeder
npm run db:seed:undo

# Undo all seeders
npm run db:seed:undo:all
```

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test src/services/__tests__/user.service.test.ts
```

### Load Testing

```bash
# Basic load test
npm run test:load

# Stress test
npm run test:stress

# Performance profiling
npm run profile
```

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
docker-compose up

# Build and start
docker-compose up --build

# Start specific service
docker-compose up service-backend

# View logs
docker-compose logs -f service-backend
```

### Production

```bash
# Build production image
docker build -t adoptdontshop/backend:latest -f Dockerfile.prod .

# Run production container
docker run -p 5000:5000 \
  --env-file .env.production \
  adoptdontshop/backend:latest
```

## Common Tasks

### Add New API Endpoint

1. **Create route file** `src/routes/myresource.routes.ts`
2. **Create controller** `src/controllers/myresource.controller.ts`
3. **Create service** `src/services/myresource.service.ts`
4. **Add model** (if needed) `src/models/MyResource.ts`
5. **Register route** in `src/index.ts`
6. **Add tests** `src/services/__tests__/myresource.service.test.ts`

### Add Database Model

1. **Create migration**

   ```bash
   npm run migration:create -- --name create-my-table
   ```

2. **Define schema** in migration file
3. **Create model** `src/models/MyModel.ts`
4. **Run migration** `npm run db:migrate`
5. **Add associations** in model file
6. **Create seeder** (optional) for test data

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
docker-compose ps database

# Reset database
npm run db:drop
npm run db:create
npm run db:migrate
npm run db:seed
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
# Check database query performance
npm run db:log

# Profile application
npm run profile

# Monitor in development dashboard
open http://localhost:5000/monitoring/dashboard
```

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
