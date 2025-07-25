# New App Generator Documentation

The `npm run new-app` command is a powerful scaffolding tool that creates new applications in the Pet Adoption Platform workspace with all the enhanced API services and methodologies we've established.

## Usage

```bash
npm run new-app <app-name> <app-type>
```

### Parameters

- **app-name**: The name of the new application (e.g., `app.mobile`, `app.veterinary`)
- **app-type**: The type of application to create

### App Types

| Type | Description | Services Included |
|------|-------------|-------------------|
| `client` | Client-facing adoption app | api, authService, petService, discoveryService, chatService, analyticsService |
| `rescue` | Rescue management app | api, authService, enhancedPetService, applicationService, chatService |
| `admin` | Admin dashboard app | api, authService, userManagementService, rescueManagementService |
| `service` | Backend service | Express.js backend with routes, middleware, services |

## Examples

### Creating a Mobile Client App
```bash
npm run new-app app.mobile client
```

### Creating a Veterinary Rescue App
```bash
npm run new-app app.veterinary rescue
```

### Creating a Super Admin App
```bash
npm run new-app app.superadmin admin
```

### Creating a Notification Service
```bash
npm run new-app service.notifications service
```

## What Gets Created

### Frontend Apps (client, rescue, admin)

```
<app-name>/
├── package.json              # Tailored dependencies and scripts
├── vite.config.ts            # Vite configuration with path aliases
├── tsconfig.json             # TypeScript configuration
├── index.html                # Entry HTML file
├── .env.example              # Environment variables template
├── README.md                 # Comprehensive documentation
├── src/
│   ├── components/           # React components directory
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts
│   ├── services/            # 🚀 Enhanced API services
│   │   ├── api.ts           # Core API service (copied from template)
│   │   ├── authService.ts   # Authentication service
│   │   ├── index.ts         # Service exports
│   │   └── ... (type-specific services)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── styles/              # Global styles
│   └── __tests__/           # Test files
└── public/                  # Static assets
```

### Service Apps (service)

```
<app-name>/
├── package.json              # Express.js dependencies
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment variables
├── README.md                 # Documentation
└── src/
    ├── routes/              # Express routes
    ├── middleware/          # Express middleware
    ├── services/            # Business logic services
    ├── types/               # Type definitions
    ├── utils/               # Utilities
    ├── __tests__/           # Tests
    └── index.ts             # Express app entry point
```

## Enhanced API Services

All frontend apps are created with our enhanced API service architecture:

### Core Features

- **🔄 Intelligent Caching**: Reduces unnecessary API calls with smart cache invalidation
- **🛡️ Robust Error Handling**: Comprehensive error management with user-friendly messages
- **🔄 Data Transformation**: Automatic snake_case ↔ camelCase conversion
- **🔐 Token Management**: Secure authentication with automatic token refresh
- **🛠️ Development Helpers**: Dev tokens and debugging tools for faster development
- **📍 PostGIS Support**: Geographic data handling for location features

### Service-Specific Features

#### Client Apps
- **Pet Discovery**: Swipe-based pet matching and filtering
- **Messaging**: Real-time chat between adopters and rescues
- **Analytics**: User behavior tracking and insights

#### Rescue Apps  
- **Enhanced Pet Management**: Advanced pet CRUD with bulk operations
- **Application Processing**: Complete adoption workflow management
- **Rescue Dashboard**: Analytics and performance metrics

#### Admin Apps
- **User Management**: Complete user lifecycle administration
- **Rescue Oversight**: Multi-rescue management and monitoring
- **Platform Analytics**: System-wide metrics and reporting

## Service Copying Strategy

The script intelligently copies services from existing template applications:

1. **Primary Strategy**: Copy actual service files from existing apps
   - Copies from `app.client`, `app.rescue`, or `app.admin` based on type
   - Preserves all enhancements, caching, error handling

2. **Fallback Strategy**: Generate basic templates if source doesn't exist
   - Creates functional service stubs
   - Includes proper TypeScript interfaces
   - Ready for enhancement

## Environment Configuration

Each app type includes tailored environment variables:

### Client Apps
```env
VITE_DISCOVERY_ENABLED=true
VITE_CHAT_ENABLED=true
VITE_ANALYTICS_ENABLED=true
```

### Rescue Apps
```env
VITE_RESCUE_MANAGEMENT=true
VITE_APPLICATION_PROCESSING=true
VITE_CHAT_ENABLED=true
```

### Admin Apps
```env
VITE_USER_MANAGEMENT=true
VITE_RESCUE_OVERSIGHT=true
VITE_ANALYTICS_DASHBOARD=true
```

## Development Workflow

After creating a new app:

```bash
# Navigate to the new app
cd <app-name>

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API endpoints

# Start development
npm run dev
```

## Integration with Workspace

New apps are **not** automatically added to the workspace `package.json`. To integrate:

1. Add to workspace array in root `package.json`:
   ```json
   "workspaces": [
     "service.backend",
     "app.client", 
     "app.admin",
     "app.rescue",
     "lib.components",
     "<app-name>"
   ]
   ```

2. Add turbo scripts if desired:
   ```json
   "dev:<app-name>": "turbo run dev --filter=@adopt-dont-shop/<app-name>"
   ```

## Best Practices

### Naming Conventions
- **Apps**: `app.<purpose>` (e.g., `app.mobile`, `app.veterinary`)
- **Services**: `service.<purpose>` (e.g., `service.notifications`, `service.payments`)

### Development Tips
1. **Start with existing type**: Choose the closest app type and customize
2. **Copy and modify**: Use existing apps as reference for patterns
3. **Test incrementally**: Start with basic functionality and add features
4. **Document changes**: Update README.md with specific features

## Troubleshooting

### Common Issues

**TypeScript Errors**: New apps may have import path issues
- Solution: Check `tsconfig.json` paths configuration
- Ensure `@/*` alias points to `./src/*`

**Service Import Errors**: Missing service dependencies
- Solution: Check `src/services/index.ts` exports
- Verify service files exist and export properly

**Environment Variables**: API calls failing
- Solution: Check `.env` file configuration
- Ensure `VITE_API_URL` points to correct backend

**Missing Dependencies**: Build/dev errors
- Solution: Run `npm install` in new app directory
- Check `package.json` for required dependencies

## Extending the Script

The script is designed to be extensible. To add new app types:

1. Add to `templates` object in `scripts/create-new-app.js`
2. Define services array and description
3. Add service creation logic if needed
4. Update this documentation

## Examples of Generated Apps

### Mobile Client App
```bash
npm run new-app app.mobile client
```
Perfect for React Native or PWA development with discovery features.

### Veterinary Management
```bash 
npm run new-app app.veterinary rescue
```
Specialized for veterinary clinics managing pet health records.

### Multi-Rescue Admin
```bash
npm run new-app app.superadmin admin
```
Advanced admin interface for managing multiple rescue organizations.

### Notification Service
```bash
npm run new-app service.notifications service
```
Microservice for handling email, SMS, and push notifications.

---

This generator embodies all the API service patterns and methodologies we've developed, ensuring new applications start with enterprise-grade service architecture from day one.
