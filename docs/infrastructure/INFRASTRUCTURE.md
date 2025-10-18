# Infrastructure Documentation

## Overview

The Adopt Don't Shop platform uses a modern microservices architecture with shared libraries, Docker containerization, and subdomain-based routing. This document provides a comprehensive overview of the infrastructure setup.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                      │
│              (Subdomain-based routing)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ app.client  │ │ app.admin   │ │ app.rescue  │
│   (React)   │ │   (React)   │ │   (React)   │
│   Port:3000 │ │   Port:3001 │ │   Port:3002 │
└─────────────┘ └─────────────┘ └─────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
              ┌─────────────┐
              │service.backend│
              │   (Node.js)  │
              │   Port:5000  │
              └─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │    Redis    │ │   Uploads   │
│ (PostGIS)   │ │ (Sessions)  │ │   (Files)   │
│ Port:5432   │ │ Port:6379   │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

## Services

### Frontend Applications

**app.client** - Public adoption portal
- Technology: React + TypeScript + Vite
- Port: 3000
- Domain: localhost / www.adoptdontshop.com
- Features: Pet discovery, swipe interface, applications

**app.admin** - Admin dashboard
- Technology: React + TypeScript + Vite
- Port: 3001
- Domain: admin.localhost / admin.adoptdontshop.com
- Features: User management, system configuration

**app.rescue** - Rescue management portal
- Technology: React + TypeScript + Vite
- Port: 3002
- Domain: rescue.localhost / rescue.adoptdontshop.com
- Features: Pet management, application processing, staff coordination

### Backend Services

**service.backend** - Main API
- Technology: Node.js + Express + TypeScript
- Port: 5000
- Domain: api.localhost / api.adoptdontshop.com
- Features: REST API, WebSocket messaging, authentication

### Databases & Storage

**PostgreSQL** - Primary database
- Version: 15+ with PostGIS extension
- Port: 5432
- Features: User data, pets, applications, messaging

**Redis** - Cache & sessions
- Port: 6379
- Features: Session storage, API caching, rate limiting

**File Storage** - Media files
- Development: Local uploads directory
- Production: AWS S3 with CloudFront CDN

## Shared Libraries (16 libraries)

All libraries follow ESM-only architecture with TypeScript:

**Core Services:**
- `@adopt-dont-shop/lib-api` - API client
- `@adopt-dont-shop/lib-auth` - Authentication
- `@adopt-dont-shop/lib-validation` - Validation schemas

**Feature Libraries:**
- `@adopt-dont-shop/lib-applications` - Application management
- `@adopt-dont-shop/lib-chat` - Real-time messaging
- `@adopt-dont-shop/lib-discovery` - Pet discovery
- `@adopt-dont-shop/lib-email` - Email system
- `@adopt-dont-shop/lib-invitations` - Staff invitations
- `@adopt-dont-shop/lib-notifications` - Notifications
- `@adopt-dont-shop/lib-pets` - Pet management
- `@adopt-dont-shop/lib-rescues` - Rescue organizations
- `@adopt-dont-shop/lib-search` - Search functionality
- `@adopt-dont-shop/lib-storage` - File storage
- `@adopt-dont-shop/lib-users` - User management

**Utilities:**
- `@adopt-dont-shop/lib-analytics` - Analytics
- `@adopt-dont-shop/lib-common` - Common utilities

See [Libraries Documentation](../libraries/README.md) for details.

## Docker Setup

### Development

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up service.backend

# View logs
docker-compose logs -f

# Rebuild
docker-compose up --build
```

### Production

```bash
# Build optimized images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Subdomain Routing

**Development:**
- `localhost` → app.client (port 3000)
- `admin.localhost` → app.admin (port 3001)
- `rescue.localhost` → app.rescue (port 3002)
- `api.localhost` → service.backend (port 5000)

**Production:**
- `www.adoptdontshop.com` → app.client
- `admin.adoptdontshop.com` → app.admin
- `rescue.adoptdontshop.com` → app.rescue
- `api.adoptdontshop.com` → service.backend

## Development Workflow

### Initial Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start with Docker
docker-compose up

# Or start individual services
npm run dev:client
npm run dev:admin
npm run dev:rescue
npm run dev:backend
```

### Working with Libraries

```bash
# Build all libraries
npm run build:libs

# Build specific library
cd lib.api && npm run build

# Run library tests
cd lib.api && npm test

# Watch mode
cd lib.api && npm run dev
```

### Database Migrations

```bash
# Run migrations
cd service.backend && npm run db:migrate

# Create migration
npm run migration:create -- --name add-new-field

# Rollback
npm run db:migrate:undo
```

## CI/CD Pipeline

### Build Process

1. **Install Dependencies** - npm install across workspace
2. **Lint & Type Check** - ESLint + TypeScript compilation
3. **Test** - Unit and integration tests
4. **Build Libraries** - Compile all shared libraries
5. **Build Apps** - Build frontend and backend services
6. **Docker Build** - Create optimized container images
7. **Deploy** - Push to registry and deploy

### Environments

**Development:**
- Branch: develop
- Deployment: Automatic on commit
- URL: dev.adoptdontshop.com

**Staging:**
- Branch: staging
- Deployment: Manual approval
- URL: staging.adoptdontshop.com

**Production:**
- Branch: main
- Deployment: Manual approval with rollback
- URL: adoptdontshop.com

## Monitoring & Logging

### Application Monitoring
- Error tracking (Sentry or similar)
- Performance monitoring (Web Vitals)
- API response times
- Database query performance

### Infrastructure Monitoring
- Docker container health
- Resource usage (CPU, memory, disk)
- Network traffic
- Database connections

### Logging
- Centralized logging (Winston + ELK stack)
- Structured JSON logs
- Log levels: error, warn, info, debug
- Log rotation and retention

## Security

### Authentication & Authorization
- JWT tokens with refresh rotation
- Role-based access control (RBAC)
- Permission-based endpoints
- Session management with Redis

### Data Protection
- HTTPS/TLS encryption
- Database encryption at rest
- Environment variable secrets
- API rate limiting

### Best Practices
- Regular security audits
- Dependency vulnerability scanning
- Container security scanning
- Automated backups

## Performance Optimization

### Frontend
- Code splitting and lazy loading
- Image optimization and CDN
- Bundle size optimization
- Caching strategies

### Backend
- Database query optimization
- Redis caching
- Connection pooling
- Load balancing (production)

### Database
- Indexed queries
- Query optimization
- Connection pooling
- Read replicas (production)

## Scaling Strategy

### Horizontal Scaling
- Multiple backend instances behind load balancer
- Session sharing via Redis
- Stateless application design

### Vertical Scaling
- Database resource allocation
- Container resource limits
- Cache size optimization

### Database Scaling
- Read replicas for read-heavy operations
- Connection pooling
- Query optimization
- Partitioning strategies (if needed)

## Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check port usage
netstat -ano | findstr :5000

# Kill process
taskkill /PID <pid> /F
```

**Database Connection:**
```bash
# Check PostgreSQL is running
docker-compose ps database

# View logs
docker-compose logs database
```

**Build Errors:**
```bash
# Clear node_modules and rebuild
rm -rf node_modules && npm install

# Clear Docker cache
docker-compose down -v
docker-compose build --no-cache
```

## Additional Resources

- **Docker Setup**: [docker-setup.md](./docker-setup.md)
- **Microservices Standards**: [MICROSERVICES-STANDARDS.md](./MICROSERVICES-STANDARDS.md)
- **New App Generator**: [new-app-generator.md](./new-app-generator.md)
- **Backend Documentation**: [../backend/](../backend/)
- **Frontend Documentation**: [../frontend/](../frontend/)
- **Libraries Documentation**: [../libraries/](../libraries/)
