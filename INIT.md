# Monorepo Initialization Instructions

This document provides step-by-step instructions for setting up a fresh monorepo structure for the Adopt Don't Shop platform.

## Getting Started

To initialize the monorepo with the new structure:

1. Run the setup script:
   ```bash
   chmod +x setup-monorepo.sh
   ./setup-monorepo.sh
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Package-specific Setup

### lib.components

```bash
cd packages/lib.components
npm run dev
```

### app.client

```bash
cd packages/app.client
npm run dev
```

### app.admin

```bash
cd packages/app.admin
npm run dev
```

### app.rescue

```bash
cd packages/app.rescue
npm run dev
```

### service.backend

```bash
cd packages/service.backend
npm run dev
```

## Docker Development Environment

To start all services using Docker:

```bash
docker-compose up
```

This will start:
- PostgreSQL database
- Backend API service
- Client app
- Admin app
- Rescue app

## Code Structure

Each package follows a consistent structure:

- Frontend apps (`app.*`):
  - `src/components/` - App-specific components
  - `src/pages/` - Page components
  - `src/hooks/` - Custom React hooks
  - `src/api/` - API integration
  - `src/store/` - State management
  - `src/utils/` - Utility functions
  - `src/types/` - TypeScript type definitions

- Backend service (`service.backend`):
  - `src/controllers/` - Route controllers
  - `src/services/` - Business logic
  - `src/models/` - Data models
  - `src/routes/` - API routes
  - `src/middleware/` - Express middleware
  - `src/utils/` - Utility functions
  - `src/config/` - Configuration
  - `src/types/` - TypeScript type definitions

- Component library (`lib.components`):
  - `src/components/` - UI components
  - `src/hooks/` - Shared React hooks
  - `src/utils/` - Utility functions
  - `src/types/` - TypeScript type definitions

## Recommended Development Process

1. Start with the shared components in `lib.components`
2. Implement core backend services in `service.backend`
3. Build the client applications using the shared components and services

## Tools and Extensions

Recommended VS Code extensions:
- ESLint
- Prettier
- Debugger for Chrome
- Docker
- GitLens
- Import Cost
- Jest
- Path Intellisense
- Tailwind CSS IntelliSense
