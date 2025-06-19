# Monorepo Migration Guide: From Single Frontend to Multi-App Architecture

## Overview

This document outlines the migration from the current structure to a modern monorepo architecture with separate applications for different user types and a shared component library.

## Current Structure

```
adopt-dont-shop/
├── backend/                    # Express.js API server
├── frontend/                   # React frontend (monolithic)
├── docs/                      # Documentation
├── docker-compose.yml         # Container orchestration
└── adoptdontshop.sql/         # Database schema
```

## Target Structure

```
adopt-dont-shop/
├── service.backend/           # Express.js API server (renamed)
├── app.client/               # Public-facing React app
├── app.admin/                # Admin dashboard React app
├── app.rescue/               # Rescue management React app
├── lib.components/           # Shared component library
├── docs/                     # Documentation
├── docker-compose.yml        # Updated container orchestration
├── package.json              # Root workspace configuration
└── adoptdontshop.sql/        # Database schema
```

## Documentation Review Summary

Based on the comprehensive review of existing PRDs in `/docs/old/`, the following valuable information has been incorporated into the new app-specific PRDs:

### Key Features Extracted:

#### Admin App Enhancements:

- **Detailed Role Definitions**: Super Admin, Platform Admin, Content Moderator, Support Agent, Analytics Specialist
- **Content Moderation System**: Complete flagging, reporting, and appeal workflow
- **Support Ticket System**: Multi-tier support with escalation and performance tracking
- **Comprehensive Data Models**: AdminAction, SystemMetric, SupportTicket, ContentFlag, UserSanction models

#### Rescue App Enhancements:

- **Advanced Application Workflow**: Multi-stage approval with reference checking and home visits
- **Custom Question Management**: Rescue-specific application question configuration
- **Detailed Pet Management**: Comprehensive pet attributes including medical, behavioral, and compatibility data
- **Staff Management**: Role-based access for rescue team members with verification system

#### Backend Service Enhancements:

- **Real-time Communication**: Socket.IO integration with typing indicators, read receipts, message reactions
- **Notification System**: Multi-channel delivery (email, push, SMS) with user preference management
- **Advanced Data Models**: Chat, Message, MessageReaction, NotificationPreference, DeviceToken models
- **Comprehensive API Endpoints**: 50+ documented endpoints covering all system functionality

#### Component Library Enhancements:

- **Pet-Specific Components**: SwipeInterface, AdoptionStatus, FavoritesList, AdoptionTimeline
- **Communication Components**: MessageBubble, TypingIndicator, MessageReactions, ConversationList
- **Admin Components**: ModerationQueue, UserSanctions, SystemMetrics, AuditLog, SupportTickets

#### Client App Enhancements:

- **Enhanced Communication**: File attachments, message reactions, multi-participant chat
- **Advanced Pet Discovery**: Swipe interface, favorites management, detailed filtering

### Implementation Status Preserved:

- Many features are already implemented (✅ IMPLEMENTED status noted)
- Clear roadmap for planned features (🔄 PLANNED status noted)
- Technical implementation references maintained for existing code

### Data Models & API Endpoints:

- Complete TypeScript interfaces for all data models
- Comprehensive API endpoint documentation with HTTP methods and descriptions
- Database relationship mappings and foreign key constraints
- Authentication and authorization patterns documented

This review ensures that no valuable functionality or requirements from the existing documentation were lost during the migration planning process.

## Migration Strategy

### Phase 1: Setup Workspace Structure (1-2 days)

1. **Initialize npm workspace at root level**

```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "adopt-dont-shop-workspace",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "service.backend",
    "app.client",
    "app.admin",
    "app.rescue",
    "lib.components"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:client\" \"npm run dev:admin\" \"npm run dev:rescue\"",
    "dev:backend": "npm run dev --workspace=service.backend",
    "dev:client": "npm run dev --workspace=app.client",
    "dev:admin": "npm run dev --workspace=app.admin",
    "dev:rescue": "npm run dev --workspace=app.rescue",
    "build": "npm run build --workspace=lib.components && npm run build --workspace=service.backend && npm run build --workspace=app.client && npm run build --workspace=app.admin && npm run build --workspace=app.rescue",
    "test": "npm run test --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "lerna": "^8.1.2"
  }
}
EOF
```

2. **Rename backend directory**

```bash
mv backend service.backend
```

### Phase 2: Create Shared Component Library (2-3 days)

1. **Initialize lib.components**

```bash
mkdir lib.components
cd lib.components

# Create package.json for shared components
cat > package.json << 'EOF'
{
  "name": "@adopt-dont-shop/components",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite build --watch",
    "test": "jest"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "styled-components": "^6.1.12"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.2.19",
    "@types/styled-components": "^5.1.34",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.4.5",
    "vite": "^5.3.5",
    "vite-plugin-dts": "^3.9.1"
  }
}
EOF
```

2. **Extract shared components from frontend**

   - Move `frontend/src/components/` to `lib.components/src/components/`
   - Move `frontend/src/styles/` to `lib.components/src/styles/`
   - Move `frontend/src/utils/` to `lib.components/src/utils/`
   - Move `frontend/src/hooks/` to `lib.components/src/hooks/`

3. **Create build configuration for component library**

```bash
# lib.components/vite.config.ts
cat > vite.config.ts << 'EOF'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AdoptDontShopComponents',
      formats: ['es', 'umd'],
      fileName: (format) => `adopt-dont-shop-components.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'styled-components'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'styled-components': 'styled',
        },
      },
    },
  },
})
EOF
```

### Phase 3: Create Client App (1-2 days)

1. **Initialize app.client**

```bash
mkdir app.client
cd app.client

# Copy frontend structure but filter for public routes
cp -r ../frontend/* .
```

2. **Update package.json**

```json
{
	"name": "@adopt-dont-shop/client",
	"version": "1.0.0",
	"scripts": {
		"dev": "vite --port 3001",
		"build": "vite build",
		"preview": "vite preview",
		"test": "jest"
	},
	"dependencies": {
		"@adopt-dont-shop/components": "workspace:*"
		// ... other dependencies
	}
}
```

3. **Clean up App.tsx to only include public routes**
   - Remove admin routes (`/admin/*`)
   - Remove rescue staff routes (`/applications`, `/pets`, `/staff`, `/dashboard`, `/rescue`)
   - Keep only public routes: `/`, `/login`, `/create-account`, `/forgot-password`, `/reset-password`, `/verify-email`, `/complete-account`, `/settings`, `/swipe`, `/chat`, `/apply/:rescueId/:petId`

### Phase 4: Create Admin App (2-3 days)

1. **Initialize app.admin**

```bash
mkdir app.admin
cd app.admin
# Copy frontend structure
cp -r ../frontend/* .
```

2. **Update package.json**

```json
{
	"name": "@adopt-dont-shop/admin",
	"version": "1.0.0",
	"scripts": {
		"dev": "vite --port 3002",
		"build": "vite build",
		"preview": "vite preview"
	},
	"dependencies": {
		"@adopt-dont-shop/components": "workspace:*"
	}
}
```

3. **Clean up App.tsx for admin routes only**

   - Keep authentication routes for admin login
   - Keep all `/admin/*` routes
   - Remove rescue and public user routes
   - Update routing to use `/` as base for admin routes (remove `/admin` prefix)

4. **Extract admin-specific components**
   - Move `frontend/src/pages/admin/` to `app.admin/src/pages/`
   - Keep admin-specific logic and services

### Phase 5: Create Rescue App (2-3 days)

1. **Initialize app.rescue**

```bash
mkdir app.rescue
cd app.rescue
# Copy frontend structure
cp -r ../frontend/* .
```

2. **Update package.json**

```json
{
	"name": "@adopt-dont-shop/rescue",
	"version": "1.0.0",
	"scripts": {
		"dev": "vite --port 3003",
		"build": "vite build",
		"preview": "vite preview"
	},
	"dependencies": {
		"@adopt-dont-shop/components": "workspace:*"
	}
}
```

3. **Clean up App.tsx for rescue routes only**
   - Keep authentication routes
   - Keep rescue staff routes: `/applications`, `/pets`, `/staff`, `/dashboard`, `/rescue`
   - Remove admin and public user specific routes
   - Update routing structure

### Phase 6: Update Import Paths (2-3 days)

1. **Update all apps to use shared components**

```typescript
// Before
import { Button } from '../components/Button';

// After
import { Button } from '@adopt-dont-shop/components';
```

2. **Update tsconfig.json in each app**

```json
{
	"compilerOptions": {
		"baseUrl": ".",
		"paths": {
			"@adopt-dont-shop/components": ["../lib.components/src"]
		}
	}
}
```

3. **Update vite.config.ts in each app**

```typescript
export default defineConfig({
	resolve: {
		alias: {
			'@adopt-dont-shop/components': resolve(
				__dirname,
				'../lib.components/src'
			),
		},
	},
});
```

### Phase 7: Update Backend Service (1 day)

1. **Update service.backend configuration**
   - Update CORS settings to allow multiple frontend origins
   - Update environment variables for multiple app URLs

```typescript
// service.backend/src/index.ts
app.use(
	cors({
		origin: [
			process.env.CLIENT_URL || 'http://localhost:3001',
			process.env.ADMIN_URL || 'http://localhost:3002',
			process.env.RESCUE_URL || 'http://localhost:3003',
		],
		credentials: true,
	})
);
```

### Phase 8: Update Docker Configuration (1 day)

1. **Update docker-compose.yml**

```yaml
version: '3.8'
services:
  backend:
    build: ./service.backend
    ports:
      - '5000:5000'
    environment:
      - CLIENT_URL=http://client:3001
      - ADMIN_URL=http://admin:3002
      - RESCUE_URL=http://rescue:3003

  client:
    build: ./app.client
    ports:
      - '3001:3001'
    depends_on:
      - backend

  admin:
    build: ./app.admin
    ports:
      - '3002:3002'
    depends_on:
      - backend

  rescue:
    build: ./app.rescue
    ports:
      - '3003:3003'
    depends_on:
      - backend

  components:
    build: ./lib.components
    volumes:
      - components_dist:/app/dist

volumes:
  components_dist:
```

### Phase 9: Update CI/CD (1 day)

1. **Update GitHub Actions workflows**
   - Add build steps for each workspace
   - Add deployment for multiple apps
   - Add component library publishing

## Current Route Analysis

### Public Routes (app.client)

- `/` - Home page
- `/login` - User login
- `/create-account` - Account creation
- `/forgot-password` - Password reset
- `/reset-password` - Password reset form
- `/verify-email` - Email verification
- `/complete-account` - Account setup completion
- `/settings` - User settings (authenticated)
- `/swipe` - Pet swiping interface (authenticated)
- `/chat` - User conversations (authenticated)
- `/apply/:rescueId/:petId` - Adoption application (authenticated)

### Rescue Staff Routes (app.rescue)

- `/` - Rescue dashboard (redirect from root)
- `/login` - Staff login
- `/applications` - View applications
- `/applications/:applicationId` - Review specific application
- `/applications/questions` - Configure application questions
- `/pets` - Manage rescue pets
- `/staff` - Manage staff members
- `/dashboard` - Rescue analytics dashboard
- `/rescue` - Rescue settings
- `/rescue/chat` - Rescue conversations

### Admin Routes (app.admin)

- `/` - Admin dashboard (redirect from root)
- `/login` - Admin login
- `/dashboard` - Platform overview
- `/logs` - Audit logs
- `/users` - User management
- `/rescues` - Rescue management
- `/feature-flags` - Feature flag management
- `/ratings` - Rating management
- `/pets` - Platform-wide pet management
- `/applications` - Platform-wide application management
- `/applications/:applicationId` - Review applications
- `/applications/questions` - Core question management
- `/chat` - Platform-wide conversations

## Shared Dependencies

### Components to Move to lib.components

- All components in `frontend/src/components/`
- Styles system (`frontend/src/styles/`)
- Utility functions (`frontend/src/utils/`)
- Custom hooks (`frontend/src/hooks/`)
- Context providers for shared state
- API service utilities (`frontend/src/services/`)
- Common types and interfaces

### App-Specific Code

#### app.client

- Landing page components
- Public authentication flows
- Pet browsing/swiping interface
- User chat interface
- Application submission forms

#### app.admin

- Admin dashboard components
- User management interfaces
- System configuration tools
- Audit logging interfaces
- Platform analytics

#### app.rescue

- Rescue dashboard components
- Application review interfaces
- Pet management tools
- Staff management
- Rescue-specific settings

## Migration Risks & Considerations

### High Risk Areas

1. **Import dependencies** - Complex web of imports between components
2. **Shared state management** - Context providers used across apps
3. **Authentication flows** - Different auth flows for different user types
4. **API service layers** - Shared API utilities with app-specific logic
5. **Styling system** - Theme providers and styled-components dependencies

### Testing Strategy

1. **Component library testing** - Ensure all shared components work in isolation
2. **Integration testing** - Test each app with shared components
3. **End-to-end testing** - Verify full user workflows in each app
4. **Cross-app communication** - Ensure backend can serve all apps

### Deployment Strategy

1. **Blue-green deployment** - Deploy new structure alongside old
2. **Gradual rollout** - Release one app at a time
3. **Rollback plan** - Keep old structure until migration is verified
4. **Monitoring** - Enhanced monitoring during migration

## Timeline Estimate

- **Total Duration**: 12-15 days
- **Team Size**: 2-3 developers
- **Risk Buffer**: +3-5 days for testing and refinement

## Success Criteria

1. All three apps build and deploy successfully
2. Shared component library is properly consumed by all apps
3. No functional regressions in any user flow
4. Performance metrics maintained or improved
5. Development workflow is streamlined
6. CI/CD pipeline supports multi-app deployment

## Next Steps

1. **Review and approve** this migration plan
2. **Create feature branch** for migration work
3. **Begin Phase 1** - workspace setup
4. **Regular check-ins** to assess progress and adjust timeline
5. **Staging environment testing** before production deployment

## Alternative: Gradual Migration

If the full migration seems too risky, consider a gradual approach:

1. **Phase 1**: Extract component library only
2. **Phase 2**: Create admin app separately
3. **Phase 3**: Create rescue app separately
4. **Phase 4**: Refactor remaining frontend as client app

This approach allows for smaller, lower-risk changes with ability to validate each step before proceeding.
