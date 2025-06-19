# service.backend - API Service

## Overview

This is the main backend API service for Adopt Don't Shop, providing:

- RESTful API for all applications
- Database access and data modeling
- Authentication and authorization
- Business logic implementation
- File storage and management
- Email and notification services

## Structure

```
service.backend/
├── src/
│   ├── controllers/    # Route controllers
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   ├── config/         # Configuration
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Entry point
├── tests/              # Unit and integration tests
├── package.json
├── tsconfig.json
└── jest.config.js
```

## API Documentation

All endpoints are prefixed with `/api/v1` and follow RESTful conventions.

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/refresh` - Refresh access token

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

### Rescues
- GET `/api/v1/rescues` - List rescues
- POST `/api/v1/rescues` - Register rescue
- GET `/api/v1/rescues/:id` - Get rescue
- PATCH `/api/v1/rescues/:id` - Update rescue

### Communication
- GET `/api/v1/conversations` - List conversations
- POST `/api/v1/conversations` - Create conversation
- GET `/api/v1/conversations/:id/messages` - Get messages
- POST `/api/v1/conversations/:id/messages` - Send message

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build
```

## Testing

```bash
npm run test
```

## Database

This service uses PostgreSQL with Sequelize ORM.

## Environment Variables

- `NODE_ENV` - Environment (development, test, production)
- `PORT` - Server port
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing key
- `JWT_EXPIRY` - JWT expiration time
- `REFRESH_TOKEN_SECRET` - Refresh token key
- `REFRESH_TOKEN_EXPIRY` - Refresh token expiration
- `S3_BUCKET` - File storage bucket
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USER` - Email user
- `SMTP_PASS` - Email password
