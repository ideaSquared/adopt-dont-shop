# Adopt Don't Shop — Documentation

Documentation for the adopt-don't-shop monorepo. The root [README](../README.md) covers quick-start; this directory holds the deeper reference material.

## Quick start by role

**Frontend developer**
1. [Component library](../lib.components/README.md)
2. [Client app PRD](./frontend/app-client-prd.md)
3. [Frontend technical architecture](./frontend/technical-architecture.md)

**Backend developer**
1. [Implementation guide](./backend/implementation-guide.md)
2. [API endpoints](./backend/api-endpoints.md)
3. [Database schema](./backend/database-schema.md)
4. [Testing guide](./backend/testing.md)

**DevOps / infra**
1. [Infrastructure overview](./infrastructure/INFRASTRUCTURE.md)
2. [Docker setup](./infrastructure/docker-setup.md)
3. [Docker deep dive](./DOCKER.md)
4. [Backend deployment](./backend/deployment.md)
5. [Secrets management](./SECRETS-MANAGEMENT.md)

**Product**
1. [Backend service PRD](./backend/service-backend-prd.md)
2. [Client app PRD](./frontend/app-client-prd.md)
3. [Rescue app PRD](./frontend/app-rescue-prd.md)
4. [Admin app PRD](./frontend/app-admin-prd.md)

## Reference

### Infrastructure
- [Infrastructure overview](./infrastructure/INFRASTRUCTURE.md)
- [Docker setup](./infrastructure/docker-setup.md)
- [Docker deep dive](./DOCKER.md)
- [Microservices standards](./infrastructure/MICROSERVICES-STANDARDS.md)
- [New app generator](./infrastructure/new-app-generator.md)

### Backend
- [Service PRD](./backend/service-backend-prd.md)
- [Implementation guide](./backend/implementation-guide.md)
- [API endpoints](./backend/api-endpoints.md)
- [Database schema](./backend/database-schema.md)
- [Testing](./backend/testing.md)
- [Deployment](./backend/deployment.md)
- [Troubleshooting](./backend/troubleshooting.md)

### Frontend
- [Client PRD](./frontend/app-client-prd.md) · [Rescue PRD](./frontend/app-rescue-prd.md) · [Admin PRD](./frontend/app-admin-prd.md)
- [Technical architecture](./frontend/technical-architecture.md)
- [Implementation plan (rescue app)](./frontend/implementation-plan.md)

### Shared libraries
- [Libraries index](./libraries/README.md) — links to each `lib.*/README.md`

### Cross-cutting
- [Secrets management](./SECRETS-MANAGEMENT.md)
- [Privacy](./PRIVACY.md)
- [Data standards](./DATA-STANDARDS.md)
- [UK localization](./UK_LOCALIZATION.md) ([quick reference](./UK_LOCALIZATION_QUICK_REFERENCE.md))

## Documentation conventions

- **Lib references** live in each `lib.*/README.md` (canonical, code-verified). The libraries index just points to them.
- **PRDs** describe product requirements (`docs/frontend/*.md`, `docs/backend/service-backend-prd.md`).
- **Implementation guides** describe how subsystems are wired (`docs/backend/implementation-guide.md`, `docs/frontend/technical-architecture.md`).
- **Stale docs**: prefer deletion over archival — `git log` is the archive.
