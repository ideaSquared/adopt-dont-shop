# service.backend - API Service

## Overview

This is the main backend API service for Adopt Don't Shop, providing:

- RESTful API for all applications
- Database access and data modeling
- Authentication and authorization
- Business logic implementation
- File storage and management
- Email and notification services

## 🔒 Security Notice

**IMPORTANT**: This service includes production-ready security features. See [SECURITY.md](./SECURITY.md) for complete security guidelines and deployment instructions.

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your secure values
# CRITICAL: Set strong JWT_SECRET (32+ characters)
# CRITICAL: Set CORS_ORIGIN to your domain in production
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

### 4. Development Server

```bash
npm run dev
```

## Structure

```
service.backend/
├── src/
│   ├── controllers/    # Route controllers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware (auth, rate limiting)
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Entry point
├── tests/              # Unit and integration tests
├── .env.example        # Environment template
├── SECURITY.md         # Security guidelines
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 🛡️ Security Features

### Implemented

- ✅ Rate limiting (API, auth, password reset)
- ✅ Environment validation
- ✅ Secure JWT configuration
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation
- ✅ Audit logging
- ✅ Graceful shutdown

### Production Requirements

- 🔑 JWT_SECRET (32+ characters)
- 🌐 CORS_ORIGIN (your domain)
- 🔐 SESSION_SECRET (32+ characters)
- 🔒 Strong database credentials

## API Documentation

All endpoints are prefixed with `/api/v1` and follow RESTful conventions.

### Authentication (Rate Limited: 5 requests/15 min)

- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/refresh-token` - Refresh access token
- POST `/api/v1/auth/forgot-password` - Request password reset (3 requests/hour)
- POST `/api/v1/auth/reset-password` - Reset password (3 requests/hour)

### Users

- GET `/api/v1/users` - List users (admin)
- GET `/api/v1/users/:id` - Get user
- PATCH `/api/v1/users/:id` - Update user

### Pets

- GET `/api/v1/pets` - List pets with filtering
- POST `/api/v1/pets` - Create pet (rescue)
- GET `/api/v1/pets/:id` - Get pet
- PATCH `/api/v1/pets/:id` - Update pet (rescue)

### Applications

- GET `/api/v1/applications` - List applications (filtered by role)
- POST `/api/v1/applications` - Submit application
- GET `/api/v1/applications/:id` - Get application
- PATCH `/api/v1/applications/:id` - Update application

### Health Check

- GET `/health` - Server health status

## ⚡ Rate Limiting

### Development vs Production

**Development Mode:**

- Rate limits are **BYPASSED** to allow rapid testing
- Console warnings are logged when limits would be hit
- Perfect for testing without 429 errors blocking development

**Production Mode:**

- Rate limits are **ACTIVE** and enforced
- Exceeding limits returns 429 status codes
- Protects against abuse and ensures service stability

### Rate Limits by Endpoint Type

| Endpoint Type  | Limit        | Window     | Notes                  |
| -------------- | ------------ | ---------- | ---------------------- |
| General API    | 100 requests | 15 minutes | Most endpoints         |
| Authentication | 5 requests   | 15 minutes | Login, register        |
| Password Reset | 3 requests   | 1 hour     | Forgot/reset password  |
| File Upload    | 20 requests  | 15 minutes | Image/document uploads |

### Testing Rate Limits (Development)

When `NODE_ENV=development`, use these test endpoints:

```bash
# Test general rate limiter
curl http://localhost:5000/monitoring/test-rate-limit

# Test auth rate limiter (5 requests/15min)
curl http://localhost:5000/monitoring/test-auth-rate-limit

# Test upload rate limiter (20 requests/15min)
curl http://localhost:5000/monitoring/test-upload-rate-limit

# Check current rate limit status
curl http://localhost:5000/monitoring/rate-limit-status
```

**Development Dashboard:** Visit [http://localhost:5000/monitoring/dashboard](http://localhost:5000/monitoring/dashboard) to see rate limiting status and test endpoints.

### Console Warning Example

In development, when you would hit a rate limit, you'll see warnings like:

```
🚨 RATE LIMIT WARNING (AUTH): Would have been blocked in production! IP: ::1, Path: /api/v1/auth/login, Limit: 5 per 900s
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm run test

# Run linter
npm run lint
```

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Current test coverage: 83 tests passing
```

## Production Deployment

### Environment Variables

**REQUIRED for production:**

```bash
# Application
NODE_ENV=production
PORT=5000

# Database (REQUIRED)
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-secure-db-password
DB_NAME=adopt_dont_shop

# Security (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your-session-secret-minimum-32-characters-long

# Optional but recommended
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

## Database

This service uses PostgreSQL with Sequelize ORM.

### Models

- Users (with roles and permissions)
- Pets (with images and status tracking)
- Applications (dynamic forms with questions)
- Messages (real-time chat system)
- AuditLogs (complete audit trail)

### Migrations

```bash
# Run pending migrations
npm run migrate

# Create new migration
npx sequelize-cli migration:generate --name your-migration-name
```

## Monitoring

### Health Checks

- `GET /health` - Basic health status
- Database connection verification
- Uptime and timestamp

### Logs

- Structured logging with Winston
- Different log levels (error, warn, info, debug)
- Audit trail for all operations

### Metrics to Monitor

- Response times
- Error rates
- Database connection pool
- Rate limit violations
- Authentication failures

## Security

See [SECURITY.md](./SECURITY.md) for:

- Security checklist
- Environment validation
- Rate limiting configuration
- Production deployment security
- Incident response procedures

## Contributing

1. Follow security guidelines in [SECURITY.md](./SECURITY.md)
2. Write tests for new features
3. Run linter before committing
4. Use conventional commit messages
5. Security review required for auth/permission changes

## Support

- **Documentation**: [Backend PRD](../docs/service-backend-prd.md)
- **Security**: [Security Guide](./SECURITY.md)
- **Issues**: GitHub Issues
- **Security Reports**: security@adoptdontshop.com
