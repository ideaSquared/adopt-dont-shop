# Adopt Don't Shop - Documentation

Welcome to the comprehensive documentation for the Adopt Don't Shop pet adoption platform.

## Quick Start

**New Developers:**
1. [Docker Setup](./infrastructure/docker-setup.md) - Get environment running
2. [System Overview](./infrastructure/INFRASTRUCTURE.md) - Understand architecture
3. [Backend PRD](./backend/service-backend-prd.md) - Learn backend features
4. [Frontend Apps](./frontend/) - Explore React applications

## Documentation Structure

### Infrastructure
Core system architecture, deployment, and DevOps.

| Document | Description |
|----------|-------------|
| [Infrastructure Overview](./infrastructure/INFRASTRUCTURE.md) | Complete system architecture |
| [Docker Setup](./infrastructure/docker-setup.md) | Development and production setup |
| [Microservices Standards](./infrastructure/MICROSERVICES-STANDARDS.md) | Architecture patterns |
| [Docker Optimization](./infrastructure/DOCKER-OPTIMIZATION-RESULTS.md) | Performance achievements |

### Backend Services
API, database, and server-side functionality.

| Document | Description |
|----------|-------------|
| [Service PRD](./backend/service-backend-prd.md) | Backend requirements |
| [Implementation Guide](./backend/implementation-guide.md) | Setup and development |
| [API Endpoints](./backend/api-endpoints.md) | Complete API reference |
| [Database Schema](./backend/database-schema.md) | Database structure |
| [Testing Guide](./backend/testing.md) | Testing strategies |
| [Authentication](./backend/authentication.md) | Auth and authorization |
| [Deployment](./backend/deployment.md) | Deployment guide |
| [Troubleshooting](./backend/troubleshooting.md) | Common issues |

### Frontend Applications
React applications, UI components, and client-side functionality.

| Document | Description |
|----------|-------------|
| [Client App PRD](./frontend/app-client-prd.md) | Public adoption portal |
| [Rescue App PRD](./frontend/app-rescue-prd.md) | Rescue organization portal |
| [Admin App PRD](./frontend/app-admin-prd.md) | Administration interface |
| [Technical Architecture](./frontend/technical-architecture.md) | Frontend architecture |
| [Implementation Plan](./frontend/implementation-plan.md) | Development roadmap |
| [Swipe Interface](./frontend/swipe-interface-implementation-plan.md) | Mobile interaction design |

### Shared Libraries
Reusable packages and utilities across the platform.

| Document | Description |
|----------|-------------|
| [Libraries Overview](./libraries/README.md) | All 16 shared libraries |
| [Ecosystem Status](./libraries/ecosystem-status.md) | Library validation status |
| Individual Libraries | [api](./libraries/api.md), [auth](./libraries/auth.md), [chat](./libraries/chat.md), [components](./libraries/components.md), and more |

## Getting Started by Role

### Frontend Developer
1. [Component Library](./libraries/components.md)
2. [Client App PRD](./frontend/app-client-prd.md)
3. [Technical Architecture](./frontend/technical-architecture.md)
4. [Swipe Interface](./frontend/swipe-interface-implementation-plan.md)

### Backend Developer
1. [Implementation Guide](./backend/implementation-guide.md)
2. [API Endpoints](./backend/api-endpoints.md)
3. [Database Schema](./backend/database-schema.md)
4. [Testing Guide](./backend/testing.md)

### DevOps Engineer
1. [Infrastructure Overview](./infrastructure/INFRASTRUCTURE.md)
2. [Docker Setup](./infrastructure/docker-setup.md)
3. [Deployment Guide](./backend/deployment.md)
4. [Docker Optimization](./infrastructure/DOCKER-OPTIMIZATION-RESULTS.md)

### Product Manager
1. [Backend Service PRD](./backend/service-backend-prd.md)
2. [Client App PRD](./frontend/app-client-prd.md)
3. [Rescue App PRD](./frontend/app-rescue-prd.md)
4. [Admin App PRD](./frontend/app-admin-prd.md)

## Key Features

### Core Platform
- **Pet Management**: Comprehensive pet profiles and tracking
- **Adoption Applications**: 5-stage workflow (PENDING → REVIEWING → VISITING → DECIDING → RESOLVED)
- **Real-time Communication**: WebSocket-based messaging
- **Discovery Interface**: Tinder-style swipe and traditional search
- **Staff Management**: Role-based access and permissions

### Technical Highlights
- **16 Shared Libraries**: Fully validated with 8/8 tests each
- **ESM-Only Architecture**: Modern module system throughout
- **TypeScript**: 100% type coverage
- **Docker**: Optimized multi-stage builds
- **Testing**: 80%+ code coverage

## Contributing

When adding documentation:
1. Place in appropriate folder (infrastructure, frontend, backend, libraries)
2. Update this README with links
3. Follow existing naming conventions
4. Keep docs concise (< 500 lines)
5. Archive outdated docs to `_archive/` folder

## Documentation Standards

- **Planning Docs (PRDs)**: 200-400 lines, business requirements only
- **Overview Docs**: 150-300 lines, high-level concepts
- **Implementation Guides**: 200-400 lines, practical setup
- **Reference Docs**: Auto-generated when possible (API docs, schemas)
- **Troubleshooting**: FAQ format, 200-300 lines

## Archive

Historical documentation moved to `_archive/` folder:
- Phase 1 & 2 implementation summaries
- API migration documentation
- Library migration plans
- Testing implementation history

## Maintenance

- **Last Major Cleanup**: October 2025
- **Structure**: Organized by function
- **Policy**: Archive historical docs, don't delete
- **Duplicates**: Consolidated overlapping documentation

---

**Need help?** Start with the [Quick Start](#quick-start) guide above or jump to your role-specific documentation.
