# Rescue App Technical Architecture

## Overview

Technical architecture for the Rescue App (app.rescue) - a comprehensive management platform for rescue organizations. Built with modern React patterns, emphasizing reusability, security, and scalability.

## Architecture Principles

### 1. Modular Design
- Component-based architecture with clear separation of concerns
- Feature-based folder structure for better organization
- Shared component library integration for consistency

### 2. Data Flow
- Unidirectional data flow using React patterns
- React Context for global state, local state for components
- React Query for server state management and caching

### 3. Security-First
- Role-based access control (RBAC) at component and route level
- Permission-based rendering for fine-grained access
- Secure API communication with automatic token management

### 4. Performance
- Code splitting for reduced bundle sizes
- Lazy loading for non-critical components
- Optimistic updates for better UX
- Efficient caching strategies

## System Layers

### Frontend Layer (React App)
- **Pages**: Route components and layouts
- **Components**: UI and business logic components
- **Contexts**: Global state management
- **Hooks**: Data and logic abstraction
- **Services**: API and external integrations

### Shared Libraries
- `@adopt-dont-shop/components` - UI components
- `@adopt-dont-shop/lib-api` - API client
- `@adopt-dont-shop/lib-auth` - Authentication
- `@adopt-dont-shop/lib-chat` - Real-time messaging
- `@adopt-dont-shop/lib-validation` - Form validation

### Communication Layer
- **HTTP**: Axios + React Query for REST APIs
- **WebSocket**: Socket.IO for real-time updates
- **Interceptors**: Auth management, error handling, caching

### Backend Integration
- **API Gateway**: service.backend endpoints
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: Protection against abuse
- **Validation**: Request/response validation

## State Management

### Global State (React Context)

**AuthContext**
- User authentication state
- Login/logout functionality
- Token management
- User profile data

**RescueContext**
- Current rescue organization data
- Rescue settings and configuration
- Staff and permission information

**NotificationContext**
- Real-time notifications
- Notification preferences
- Unread counts and alerts

**PermissionContext**
- User roles and permissions
- Access control logic
- Permission checking utilities

### Server State (React Query)

**Pet Queries**
- Pet list with filters and pagination
- Individual pet details
- Pet images and media
- Pet search results

**Application Queries**
- Application list by status
- Application details and history
- Applicant information
- Reference checking data

**Analytics Queries**
- Dashboard metrics
- Performance reports
- Adoption statistics
- Custom report data

### Local State
- Component-specific UI state
- Form input values
- Modal visibility
- Temporary data

## Component Architecture

### Page Components (Routes)
- **DashboardPage**: Main dashboard with metrics
- **PetsPage**: Pet management interface
- **ApplicationsPage**: Application processing
- **StaffPage**: Staff and volunteer management
- **AnalyticsPage**: Reports and analytics
- **SettingsPage**: Rescue configuration
- **CommunicationPage**: Messaging center

### Feature Components

**Pet Management**
- `PetList` - Grid/list view of pets
- `PetCard` - Individual pet display
- `PetForm` - Create/edit pet profiles
- `PetDetails` - Detailed pet view
- `PetImages` - Photo gallery management

**Application Processing**
- `ApplicationList` - Application queue
- `ApplicationCard` - Application summary
- `ApplicationDetails` - Full application view
- `ApplicationWorkflow` - Status progression
- `ReferenceCheck` - Reference verification

**Staff Management**
- `StaffDirectory` - Team member list
- `StaffCard` - Individual staff display
- `StaffForm` - Add/edit staff
- `PermissionEditor` - Role and permission management

**Analytics**
- `Dashboard` - Key metrics overview
- `MetricCard` - Individual metric display
- `Chart` - Data visualization
- `ReportGenerator` - Custom report builder

### Shared UI Components
- `Button`, `Input`, `Select`, `Checkbox`
- `Modal`, `Drawer`, `Dropdown`
- `Card`, `Table`, `List`
- `Header`, `Sidebar`, `Footer`
- `Loading`, `Error`, `Empty`

## Service Layer

### API Service (`lib.api`)
```typescript
// Centralized API client
- GET /api/v1/pets
- POST /api/v1/pets
- PATCH /api/v1/pets/:id
- DELETE /api/v1/pets/:id
```

### Authentication Service (`lib.auth`)
```typescript
// Auth management
- login(credentials)
- logout()
- refreshToken()
- getUser()
- checkPermission(permission)
```

### WebSocket Service (`lib.chat`)
```typescript
// Real-time communication
- connect()
- disconnect()
- subscribe(event, callback)
- emit(event, data)
```

### Upload Service
```typescript
// File upload handling
- uploadImage(file)
- uploadDocument(file)
- deleteFile(fileId)
- getPresignedUrl(fileId)
```

## Routing Strategy

### Route Structure
```
/                           - Dashboard (protected)
/pets                       - Pet management (protected)
/pets/new                   - Add new pet (rescue staff)
/pets/:id                   - Pet details (protected)
/applications               - Applications (protected)
/applications/:id           - Application details (rescue staff)
/staff                      - Staff management (admin)
/analytics                  - Analytics and reports (rescue staff)
/settings                   - Rescue settings (admin)
/communication              - Messaging center (protected)
```

### Route Protection
- **Public**: Login, registration
- **Protected**: All authenticated routes
- **Role-Based**: Admin, rescue staff, volunteer

## Security Architecture

### Authentication Flow
1. User login with credentials
2. Backend validates and returns JWT + refresh token
3. Access token stored in memory
4. Refresh token stored in HTTP-only cookie
5. Automatic token refresh before expiration
6. Logout clears all tokens and session

### Authorization
- Role-based access control (RBAC)
- Permission checks at route level
- Component-level permission checks
- API request authorization headers
- Audit logging for sensitive actions

### Data Protection
- Input validation with Zod schemas
- XSS protection with Content Security Policy
- HTTPS-only communication
- Sensitive data masking in logs
- No secrets in client-side code

## Performance Optimization

### Code Splitting
```typescript
// Lazy load routes
const PetsPage = lazy(() => import('./pages/PetsPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
```

### React Query Caching
```typescript
// Cache configuration
{
  staleTime: 5 * 60 * 1000,    // 5 minutes
  cacheTime: 10 * 60 * 1000,   // 10 minutes
  refetchOnWindowFocus: false
}
```

### Image Optimization
- Lazy loading with Intersection Observer
- Responsive images with srcset
- WebP format with fallbacks
- Progressive loading
- CDN delivery

### Bundle Optimization
- Tree shaking for unused code
- Minification and compression
- Dynamic imports for large dependencies
- Vendor chunk splitting
- Asset preloading for critical resources

## Real-Time Features

### WebSocket Integration

**Connection Management**
- Auto-connect on authentication
- Reconnection with exponential backoff
- Connection health monitoring
- Graceful degradation on failure

**Real-Time Events**
- `notification:new` - New notification received
- `application:updated` - Application status changed
- `message:new` - New chat message
- `pet:updated` - Pet information changed
- `staff:online` - Staff member online status

## Error Handling

### Error Boundaries
- Page-level error boundaries
- Component-level error boundaries
- Graceful fallback UI
- Error reporting to monitoring service

### API Error Handling
- Network errors with retry logic
- Authentication errors with re-login
- Validation errors with user feedback
- Server errors with fallback UI
- Timeout handling

### User Feedback
- Toast notifications for success/error
- Inline validation errors
- Loading states during operations
- Confirmation dialogs for destructive actions

## Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions
- Service methods
- Permission logic

### Integration Tests
- User flows (login, pet management, applications)
- API integration
- State management
- Real-time features

### E2E Tests (Playwright)
- Critical user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Accessibility compliance

## Build & Deployment

### Development Build
```bash
npm run dev              # Start dev server
npm run test            # Run tests
npm run lint            # Check code quality
```

### Production Build
```bash
npm run build           # Optimized production build
npm run preview         # Preview production build
```

### Environment Configuration
```bash
VITE_API_URL            # Backend API URL
VITE_WS_URL             # WebSocket URL
VITE_ENV                # Environment (dev/staging/prod)
```

### Docker Deployment
```dockerfile
# Multi-stage build
FROM node:20-alpine AS build
FROM nginx:alpine AS production
# Optimized for production
```

## Monitoring & Analytics

### Application Monitoring
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)
- User session replay
- API response time tracking

### User Analytics
- Page view tracking
- Feature usage statistics
- User journey analysis
- Conversion funnel tracking
- Custom event tracking

### Performance Metrics
- **Target**: Lighthouse score 90+
- **Initial Load**: < 2 seconds
- **Route Navigation**: < 500ms
- **API Requests**: < 1 second
- **Real-time Latency**: < 100ms

## Accessibility

### WCAG 2.1 AA Compliance
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management
- Skip links for navigation

### Testing
- Automated accessibility testing (axe-core)
- Manual screen reader testing
- Keyboard navigation testing
- Color blindness simulation

## Browser Support

### Target Browsers
- **Desktop**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile**: iOS Safari, Chrome Android (latest 2 versions)
- **Progressive Enhancement**: Core functionality works on older browsers

### Polyfills
- ES2020+ features as needed
- CSS Grid/Flexbox fallbacks
- Fetch API polyfill for older browsers

## Future Enhancements

### Short Term
- Progressive Web App (PWA) support
- Offline functionality with service workers
- Push notifications
- Advanced caching strategies

### Medium Term
- Native mobile apps (React Native)
- Advanced analytics dashboard
- AI-powered recommendations
- Enhanced real-time collaboration

### Long Term
- Micro-frontend architecture
- GraphQL integration
- Advanced automation workflows
- Multi-tenancy support

## Additional Resources

- **Implementation Plan**: [implementation-plan.md](./implementation-plan.md)
- **App Rescue PRD**: [app-rescue-prd.md](./app-rescue-prd.md)
- **API Documentation**: [../backend/api-endpoints.md](../backend/api-endpoints.md)
- **Component Library**: [../libraries/components.md](../libraries/components.md)
- **Testing Guide**: [../backend/testing.md](../backend/testing.md)
