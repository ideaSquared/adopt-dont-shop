# Rescue App Technical Architecture

## Overview

This document outlines the technical architecture for the Rescue App (app.rescue), designed to provide a comprehensive management platform for rescue organizations. The architecture follows modern React patterns, emphasizes reusability, and ensures scalability.

## Architecture Principles

### 1. Modular Design
- **Component-based architecture** with clear separation of concerns
- **Feature-based folder structure** for better organization
- **Shared component library** integration for consistency

### 2. Data Flow Architecture
- **Unidirectional data flow** using React patterns
- **Context for global state** with local state for component-specific data
- **React Query for server state** management and caching

### 3. Security-First Approach
- **Role-based access control** (RBAC) at component and route level
- **Permission-based rendering** for fine-grained access control
- **Secure API communication** with automatic token management

### 4. Performance Optimization
- **Code splitting** for reduced bundle sizes
- **Lazy loading** for non-critical components
- **Optimistic updates** for better user experience
- **Efficient caching strategies** with React Query

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  React App (app.rescue)                                        │
│  ├── Pages (Route Components)                                  │
│  ├── Components (UI & Business Logic)                          │
│  ├── Contexts (Global State Management)                        │
│  ├── Hooks (Data & Logic Abstraction)                          │
│  └── Services (API & External Integrations)                    │
├─────────────────────────────────────────────────────────────────┤
│  Shared Component Library (@adopt-dont-shop/components)        │
│  ├── UI Components                                             │
│  ├── Form Components                                           │
│  ├── Layout Components                                         │
│  └── Navigation Components                                     │
├─────────────────────────────────────────────────────────────────┤
│                      Communication Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  HTTP Client (Axios + React Query)                             │
│  ├── Request/Response Interceptors                             │
│  ├── Authentication Management                                 │
│  ├── Error Handling                                            │
│  └── Caching & Synchronization                                 │
├─────────────────────────────────────────────────────────────────┤
│  WebSocket Client (Socket.IO)                                  │
│  ├── Real-time Notifications                                   │
│  ├── Live Updates                                              │
│  ├── Chat/Messaging                                            │
│  └── Activity Feeds                                            │
├─────────────────────────────────────────────────────────────────┤
│                        Backend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway (service.backend)                                 │
│  ├── Authentication & Authorization                            │
│  ├── Rate Limiting                                             │
│  ├── Request Validation                                        │
│  └── Response Transformation                                   │
├─────────────────────────────────────────────────────────────────┤
│  Business Logic Services                                       │
│  ├── Pet Management Service                                    │
│  ├── Application Processing Service                            │
│  ├── User Management Service                                   │
│  ├── Communication Service                                     │
│  ├── Analytics Service                                         │
│  └── File Upload Service                                       │
├─────────────────────────────────────────────────────────────────┤
│                         Data Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL with PostGIS)                            │
│  ├── Pet Data                                                  │
│  ├── Application Data                                          │
│  ├── User & Rescue Data                                        │
│  ├── Communication Logs                                        │
│  └── Analytics Data                                            │
├─────────────────────────────────────────────────────────────────┤
│  File Storage (Cloud Storage)                                  │
│  ├── Pet Photos                                                │
│  ├── Application Documents                                     │
│  ├── User Avatars                                              │
│  └── Rescue Assets                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   ├── RescueProvider
│   │   ├── NotificationProvider
│   │   │   ├── PermissionProvider
│   │   │   │   ├── Router
│   │   │   │   │   ├── Layout
│   │   │   │   │   │   ├── Navigation
│   │   │   │   │   │   ├── Main Content
│   │   │   │   │   │   │   ├── Pages
│   │   │   │   │   │   │   │   ├── Dashboard
│   │   │   │   │   │   │   │   ├── Pet Management
│   │   │   │   │   │   │   │   ├── Applications
│   │   │   │   │   │   │   │   ├── Staff Management
│   │   │   │   │   │   │   │   ├── Analytics
│   │   │   │   │   │   │   │   └── Settings
│   │   │   │   │   │   │   └── Modals & Overlays
│   │   │   │   │   │   └── Sidebar/Navigation
│   │   │   │   │   └── Footer
```

### Key Component Categories

#### 1. Layout Components
```typescript
// Core layout structure
components/layout/
├── AppLayout.tsx              # Main application layout wrapper
├── DashboardLayout.tsx        # Dashboard-specific layout
├── Sidebar.tsx                # Navigation sidebar
├── Header.tsx                 # Top header with user info
├── Breadcrumbs.tsx           # Navigation breadcrumbs
└── PageContainer.tsx         # Page content wrapper
```

#### 2. Feature Components
```typescript
// Business logic components organized by feature
components/
├── dashboard/
│   ├── DashboardOverview.tsx
│   ├── MetricsCards.tsx
│   ├── ActivityFeed.tsx
│   └── QuickActions.tsx
├── pets/
│   ├── PetList.tsx
│   ├── PetCard.tsx
│   ├── PetForm.tsx
│   ├── PetFilters.tsx
│   └── PetStatusManager.tsx
├── applications/
│   ├── ApplicationList.tsx
│   ├── ApplicationCard.tsx
│   ├── ApplicationDetails.tsx
│   ├── ApplicationWorkflow.tsx
│   └── ReferenceChecker.tsx
├── communication/
│   ├── MessageCenter.tsx
│   ├── ConversationList.tsx
│   ├── MessageThread.tsx
│   └── NotificationCenter.tsx
└── analytics/
    ├── AnalyticsDashboard.tsx
    ├── MetricsChart.tsx
    ├── ReportGenerator.tsx
    └── ExportTools.tsx
```

#### 3. Shared UI Components
```typescript
// Reusable UI components extending the component library
components/ui/
├── DataTable.tsx             # Advanced table with sorting/filtering
├── FileUpload.tsx            # File upload with drag-and-drop
├── StatusBadge.tsx           # Status indicator component
├── PermissionGate.tsx        # Permission-based rendering
├── LoadingState.tsx          # Loading indicators
├── ErrorBoundary.tsx         # Error handling wrapper
├── ConfirmDialog.tsx         # Confirmation dialogs
└── EmptyState.tsx            # Empty state displays
```

## State Management Architecture

### Context Structure

```typescript
// Global state management through React Context
contexts/
├── AuthContext.tsx           # User authentication and session
├── RescueContext.tsx         # Rescue-specific data and settings
├── NotificationContext.tsx   # Real-time notifications
├── PermissionContext.tsx     # Role-based permissions
├── ThemeContext.tsx          # UI theme and preferences
└── ChatContext.tsx           # Real-time messaging state
```

### State Flow Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Action   │───▶│   Component     │───▶│   Local State   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Call      │◀───│   Custom Hook   │───▶│  React Query    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Backend API   │    │  Global Context │    │     Cache       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │  WebSocket      │    │  Local Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Custom Hooks for State Management

```typescript
// Centralized data management through custom hooks
hooks/
├── auth/
│   ├── useAuth.ts            # Authentication state
│   ├── usePermissions.ts     # Permission checking
│   └── useSession.ts         # Session management
├── api/
│   ├── usePets.ts           # Pet data management
│   ├── useApplications.ts   # Application data
│   ├── useStaff.ts          # Staff management
│   ├── useAnalytics.ts      # Analytics data
│   └── useRescue.ts         # Rescue configuration
├── ui/
│   ├── useModal.ts          # Modal state management
│   ├── useToast.ts          # Notification toasts
│   ├── useFilters.ts        # List filtering
│   └── usePagination.ts     # Pagination logic
└── realtime/
    ├── useNotifications.ts  # Real-time notifications
    ├── useChat.ts           # Chat/messaging
    └── useActivityFeed.ts   # Live activity updates
```

## API Integration Architecture

### Service Layer Pattern

```typescript
// Organized API services by domain
services/
├── api/
│   ├── base/
│   │   ├── BaseApiService.ts      # Common API functionality
│   │   ├── interceptors.ts        # Request/response interceptors
│   │   └── errorHandler.ts        # Centralized error handling
│   ├── domains/
│   │   ├── AuthService.ts         # Authentication API calls
│   │   ├── PetService.ts          # Pet management API
│   │   ├── ApplicationService.ts  # Application processing API
│   │   ├── StaffService.ts        # Staff management API
│   │   ├── AnalyticsService.ts    # Analytics and reporting API
│   │   ├── CommunicationService.ts # Messaging API
│   │   └── FileService.ts         # File upload/management API
│   └── types/
│       ├── requests.ts            # API request types
│       ├── responses.ts           # API response types
│       └── errors.ts              # Error types
└── websocket/
    ├── SocketService.ts           # WebSocket connection management
    ├── eventHandlers.ts           # Event handling logic
    └── subscriptions.ts           # Channel subscriptions
```

### API Client Configuration

```typescript
// BaseApiService.ts - Foundation for all API services
class BaseApiService {
  protected axiosInstance: AxiosInstance;
  protected queryClient: QueryClient;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('rescue_auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          await this.handleTokenExpiration();
        }
        
        if (error.response?.status >= 500) {
          // Handle server errors
          this.handleServerError(error);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async handleTokenExpiration() {
    localStorage.removeItem('rescue_auth_token');
    window.location.href = '/login';
  }

  private handleServerError(error: AxiosError) {
    // Log error for monitoring
    console.error('Server Error:', error);
    
    // Show user-friendly error message
    toast.error('Server error occurred. Please try again.');
  }
}
```

### React Query Configuration

```typescript
// queryClient.ts - Centralized React Query configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error.response?.status === 404) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        // Global error handling for mutations
        toast.error('An error occurred. Please try again.');
      },
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  pets: {
    all: ['pets'] as const,
    lists: () => [...queryKeys.pets.all, 'list'] as const,
    list: (filters: PetFilters) => [...queryKeys.pets.lists(), filters] as const,
    details: () => [...queryKeys.pets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pets.details(), id] as const,
  },
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters: ApplicationFilters) => [...queryKeys.applications.lists(), filters] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
  },
  // ... other query keys
};
```

## Security Architecture

### Authentication & Authorization Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Login    │───▶│   Auth Service  │───▶│   JWT Token     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Local Storage  │◀───│  Token Storage  │◀───│  Token Response │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Requests   │───▶│  Interceptor    │───▶│  Backend API    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Context   │◀───│  Token Refresh  │◀───│  Auth Validation│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Permission System Implementation

```typescript
// Permission-based access control
enum Permission {
  // Pet Management
  PETS_VIEW = 'pets:view',
  PETS_CREATE = 'pets:create',
  PETS_UPDATE = 'pets:update',
  PETS_DELETE = 'pets:delete',
  
  // Application Management
  APPLICATIONS_VIEW = 'applications:view',
  APPLICATIONS_PROCESS = 'applications:process',
  APPLICATIONS_APPROVE = 'applications:approve',
  APPLICATIONS_REJECT = 'applications:reject',
  
  // Staff Management
  STAFF_VIEW = 'staff:view',
  STAFF_INVITE = 'staff:invite',
  STAFF_MANAGE = 'staff:manage',
  STAFF_REMOVE = 'staff:remove',
  
  // Analytics & Reporting
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  REPORTS_GENERATE = 'reports:generate',
  
  // Rescue Configuration
  RESCUE_SETTINGS_VIEW = 'rescue:settings:view',
  RESCUE_SETTINGS_UPDATE = 'rescue:settings:update',
  RESCUE_BILLING_VIEW = 'rescue:billing:view',
  RESCUE_BILLING_MANAGE = 'rescue:billing:manage',
}

// Role definitions with associated permissions
enum Role {
  RESCUE_ADMIN = 'rescue_admin',
  RESCUE_MANAGER = 'rescue_manager',
  RESCUE_STAFF = 'rescue_staff',
  VOLUNTEER = 'volunteer',
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.RESCUE_ADMIN]: [
    // All permissions
    ...Object.values(Permission)
  ],
  [Role.RESCUE_MANAGER]: [
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.PETS_UPDATE,
    Permission.APPLICATIONS_VIEW,
    Permission.APPLICATIONS_PROCESS,
    Permission.APPLICATIONS_APPROVE,
    Permission.APPLICATIONS_REJECT,
    Permission.STAFF_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORTS_GENERATE,
    Permission.RESCUE_SETTINGS_VIEW,
  ],
  [Role.RESCUE_STAFF]: [
    Permission.PETS_VIEW,
    Permission.PETS_CREATE,
    Permission.PETS_UPDATE,
    Permission.APPLICATIONS_VIEW,
    Permission.APPLICATIONS_PROCESS,
    Permission.ANALYTICS_VIEW,
  ],
  [Role.VOLUNTEER]: [
    Permission.PETS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
};
```

### Security Best Practices Implementation

```typescript
// Security utilities and implementations
utils/security/
├── tokenManager.ts           # Secure token storage and refresh
├── inputSanitizer.ts        # Input sanitization utilities
├── permissionChecker.ts     # Permission validation
├── auditLogger.ts           # Security audit logging
└── csrfProtection.ts        # CSRF token management

// Input validation schemas
validation/
├── petSchemas.ts            # Pet form validation
├── applicationSchemas.ts    # Application validation
├── userSchemas.ts           # User management validation
└── commonSchemas.ts         # Shared validation rules
```

## Performance Architecture

### Code Splitting Strategy

```typescript
// Lazy loading implementation for route-based code splitting
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const PetsPage = lazy(() => import('../pages/PetsPage'));
const ApplicationsPage = lazy(() => import('../pages/ApplicationsPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));

// Component-level code splitting for large features
const PetForm = lazy(() => import('../components/pets/PetForm'));
const ApplicationDetails = lazy(() => import('../components/applications/ApplicationDetails'));
const AnalyticsDashboard = lazy(() => import('../components/analytics/AnalyticsDashboard'));

// Route configuration with suspense boundaries
const AppRoutes = () => (
  <Routes>
    <Route path="/dashboard" element={
      <Suspense fallback={<PageSkeleton />}>
        <DashboardPage />
      </Suspense>
    } />
    <Route path="/pets" element={
      <Suspense fallback={<PageSkeleton />}>
        <PetsPage />
      </Suspense>
    } />
    {/* Other routes */}
  </Routes>
);
```

### Caching Strategy

```typescript
// Multi-layer caching approach
const cacheConfig = {
  // React Query cache configuration
  queries: {
    // Frequently accessed data - longer cache time
    pets: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
    
    // Real-time data - shorter cache time
    applications: {
      staleTime: 1 * 60 * 1000,  // 1 minute
      cacheTime: 5 * 60 * 1000,  // 5 minutes
    },
    
    // Static data - very long cache time
    rescueSettings: {
      staleTime: 60 * 60 * 1000, // 1 hour
      cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
  
  // Browser cache for static assets
  assets: {
    images: '7d',      // 7 days
    fonts: '30d',      // 30 days
    scripts: '1y',     // 1 year
  },
};

// Optimistic updates for better UX
const usePetMutations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updatePet,
    onMutate: async (newPetData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['pets'] });
      
      // Snapshot previous value
      const previousPets = queryClient.getQueryData(['pets']);
      
      // Optimistically update
      queryClient.setQueryData(['pets'], (old: Pet[]) =>
        old.map(pet => 
          pet.id === newPetData.id ? { ...pet, ...newPetData } : pet
        )
      );
      
      return { previousPets };
    },
    onError: (err, newPet, context) => {
      // Rollback on error
      queryClient.setQueryData(['pets'], context?.previousPets);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });
};
```

### Bundle Optimization

```typescript
// Vite configuration for optimal bundling
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'query': ['react-query'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'ui': ['styled-components', 'clsx'],
          
          // Feature-based chunks
          'pets': [
            './src/components/pets',
            './src/hooks/usePets',
            './src/services/api/PetService',
          ],
          'applications': [
            './src/components/applications',
            './src/hooks/useApplications',
            './src/services/api/ApplicationService',
          ],
          'analytics': [
            './src/components/analytics',
            './src/hooks/useAnalytics',
            './src/services/api/AnalyticsService',
          ],
        },
      },
    },
    
    // Tree shaking configuration
    treeshake: {
      moduleSideEffects: false,
    },
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // Development optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-query',
      '@adopt-dont-shop/components',
    ],
  },
});
```

## Real-time Architecture

### WebSocket Integration

```typescript
// Real-time communication architecture
class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers = new Map<string, Function[]>();

  connect(userId: string, rescueId: string) {
    this.socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
      auth: {
        token: localStorage.getItem('rescue_auth_token'),
        userId,
        rescueId,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Application updates
    this.socket.on('application:created', (application) => {
      this.emit('application:created', application);
    });

    this.socket.on('application:updated', (application) => {
      this.emit('application:updated', application);
    });

    // Pet updates
    this.socket.on('pet:status_changed', (petUpdate) => {
      this.emit('pet:status_changed', petUpdate);
    });

    // Staff updates
    this.socket.on('staff:activity', (activity) => {
      this.emit('staff:activity', activity);
    });

    // Messaging
    this.socket.on('message:received', (message) => {
      this.emit('message:received', message);
    });

    // Notifications
    this.socket.on('notification:new', (notification) => {
      this.emit('notification:new', notification);
    });
  }

  private setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.attemptReconnect();
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
  }

  subscribe(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  unsubscribe(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }
}

export const socketManager = new SocketManager();
```

### Real-time Hooks

```typescript
// Custom hooks for real-time features
export const useRealTimeApplications = () => {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = socketManager.getSocket();
    setSocket(newSocket);

    if (newSocket) {
      // Subscribe to application events
      const handleNewApplication = (application: Application) => {
        queryClient.setQueryData(['applications'], (old: Application[] = []) => [
          application,
          ...old,
        ]);
        
        // Show notification
        toast.success(`New application received for ${application.pet_name}`);
      };

      const handleApplicationUpdate = (application: Application) => {
        queryClient.setQueryData(['applications'], (old: Application[] = []) =>
          old.map(app => 
            app.application_id === application.application_id ? application : app
          )
        );
      };

      newSocket.on('application:created', handleNewApplication);
      newSocket.on('application:updated', handleApplicationUpdate);

      return () => {
        newSocket.off('application:created', handleNewApplication);
        newSocket.off('application:updated', handleApplicationUpdate);
      };
    }
  }, [queryClient]);

  return socket;
};

export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = socketManager.getSocket();
    
    if (socket) {
      const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast.info(notification.message);
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
```

## Error Handling Architecture

### Error Boundary Implementation

```typescript
// Global error boundary for React error handling
class RescueAppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Application Error:', error, errorInfo);
    
    // Send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // errorTrackingService.captureException(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Feature-specific error boundaries
export const PetManagementErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    fallback={
      <div className="feature-error">
        <h3>Pet Management Error</h3>
        <p>There was an issue loading pet management features.</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);
```

### API Error Handling

```typescript
// Centralized API error handling
class ApiErrorHandler {
  static handle(error: AxiosError): never {
    const { response, message } = error;

    if (response) {
      switch (response.status) {
        case 400:
          throw new ValidationError(
            response.data.message || 'Invalid request data'
          );
        case 401:
          throw new AuthenticationError('Authentication required');
        case 403:
          throw new AuthorizationError('Access denied');
        case 404:
          throw new NotFoundError('Resource not found');
        case 409:
          throw new ConflictError(
            response.data.message || 'Resource conflict'
          );
        case 429:
          throw new RateLimitError('Too many requests');
        case 500:
          throw new ServerError('Internal server error');
        default:
          throw new ApiError(
            `API Error: ${response.status} - ${response.statusText}`
          );
      }
    }

    if (message.includes('Network Error')) {
      throw new NetworkError('Network connection failed');
    }

    throw new UnknownError('An unknown error occurred');
  }
}

// Custom error classes for different error types
export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

// Error handling in React Query
const defaultQueryErrorHandler = (error: unknown) => {
  if (error instanceof ValidationError) {
    toast.error(error.message);
  } else if (error instanceof AuthenticationError) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error instanceof NetworkError) {
    toast.error('Connection problem. Please check your internet.');
  } else {
    toast.error('An unexpected error occurred. Please try again.');
  }
};
```

## Deployment Architecture

### Build Configuration

```typescript
// Production build optimization
export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable in production for security
    
    rollupOptions: {
      output: {
        // Optimized chunk strategy
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('styled-components')) {
              return 'styling';
            }
            return 'vendor';
          }
          
          if (id.includes('components/pets')) {
            return 'pets-feature';
          }
          if (id.includes('components/applications')) {
            return 'applications-feature';
          }
          if (id.includes('components/analytics')) {
            return 'analytics-feature';
          }
        },
        
        // Asset naming for cache busting
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: 'js/[name].[hash].js',
      },
    },
    
    // Compression and minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
  },
  
  // Environment-specific optimizations
  define: {
    __DEV__: JSON.stringify(false),
    __PROD__: JSON.stringify(true),
  },
});
```

### Docker Configuration

```dockerfile
# Multi-stage build for optimal production image
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
COPY ../lib.components/package*.json ../lib.components/
RUN npm ci --only=production && npm cache clean --force

# Copy source and build
COPY . .
COPY ../lib.components ../lib.components
RUN npm run build

# Production stage with nginx
FROM nginx:alpine as production

# Install security updates
RUN apk update && apk upgrade

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /etc/nginx

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Environment Configuration

```bash
# Production environment variables
VITE_API_BASE_URL=https://api.adoptdontshop.com
VITE_WEBSOCKET_URL=wss://ws.adoptdontshop.com
VITE_CDN_URL=https://cdn.adoptdontshop.com
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_APP_VERSION=1.0.0
VITE_BUILD_TIMESTAMP=2024-01-01T00:00:00Z

# Security settings
VITE_ENABLE_CSP=true
VITE_ENABLE_HSTS=true
VITE_SECURE_COOKIES=true

# Feature flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_NOTIFICATIONS=true

# Performance settings
VITE_ENABLE_SW=true
VITE_CACHE_VERSION=v1
```

This technical architecture provides a comprehensive foundation for building a scalable, secure, and maintainable rescue management application. The architecture emphasizes modern React patterns, performance optimization, and robust error handling while maintaining consistency with the existing app.client structure.
