# Backend Type Definitions

This directory contains all TypeScript type definitions for the adopt-dont-shop backend service. The types are organized by domain and provide comprehensive type safety across the entire application.

## Structure

```
types/
├── index.ts          # Main export file - exports all types
├── api.ts           # API request/response types
├── auth.ts          # Authentication & authorization types
├── user.ts          # User management types
├── rbac.ts          # Role-based access control types
├── database.ts      # Database & service layer types
└── README.md        # This documentation
```

## Usage

### Importing Types

```typescript
// Import all types from the main index
import { ApiResponse, AuthenticatedRequest, UserProfile } from '../types';

// Import specific domain types
import { LoginCredentials, RegisterData } from '../types/auth';
import { UserSearchFilters, PaginationOptions } from '../types/user';
```

### API Types (`api.ts`)

Core types for API requests and responses:

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
  details?: any;
}

// Authenticated request with user context
interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
  resourceId?: string;
}

// Pagination types
interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
```

### Authentication Types (`auth.ts`)

Types for authentication, authorization, and security:

```typescript
// Login request
interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
}

// Registration request
interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  user_type?: UserType;
}

// Auth response with tokens
interface AuthResponse extends TokenPair {
  user: Partial<User>;
}
```

### User Types (`user.ts`)

Comprehensive user management types:

```typescript
// User profile with all fields
interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: UserType;
  status: UserStatus;
  // ... additional fields
}

// User search and filtering
interface UserSearchFilters {
  search?: string;
  status?: UserStatus;
  user_type?: UserType;
  email_verified?: boolean;
  // ... additional filters
}

// Privacy and notification settings
interface PrivacySettings {
  profile_visibility: 'public' | 'private' | 'rescue_only';
  show_location: boolean;
  allow_messages: boolean;
  show_adoption_history: boolean;
}
```

### RBAC Types (`rbac.ts`)

Role-Based Access Control types:

```typescript
// Permission definitions
const PERMISSIONS = {
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  PET_MANAGE_OWN: 'pet:manage:own',
  // ... all permissions
} as const;

// Access control context
interface AccessControlContext {
  userId: string;
  userType: UserType;
  roles: Role[];
  permissions: Permission[];
  resourceId?: string;
  action: ActionType;
}
```

### Database Types (`database.ts`)

Database and service layer types:

```typescript
// Repository pattern interface
interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(query?: FindAllQuery): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Transaction context
interface TransactionContext {
  transaction: Transaction;
}
```

## Best Practices

### 1. Always Use Types

```typescript
// ✅ Good - Properly typed
const createUser = async (userData: RegisterData): Promise<AuthResponse> => {
  // Implementation
};

// ❌ Bad - No typing
const createUser = async (userData: any): Promise<any> => {
  // Implementation
};
```

### 2. Extend Base Types

```typescript
// ✅ Good - Extend existing types
interface CreateUserRequest extends RegisterData {
  adminNotes?: string;
}

// ❌ Bad - Duplicate type definitions
interface CreateUserRequest {
  email: string;
  password: string;
  // ... duplicating RegisterData
}
```

### 3. Use Generic Types

```typescript
// ✅ Good - Generic response type
const getUsers = (): Promise<ApiResponse<UserProfile[]>> => {
  // Implementation
};

// ✅ Good - Generic repository
class UserRepository implements BaseRepository<User> {
  // Implementation
}
```

### 4. Consistent Naming

- Interfaces: PascalCase (`UserProfile`, `ApiResponse`)
- Types: PascalCase (`UserType`, `ResourceType`)
- Constants: UPPER_SNAKE_CASE (`PERMISSIONS`, `AUTH_CONSTANTS`)

### 5. Export from Index

Always export new types from the main `index.ts` file:

```typescript
// types/index.ts
export * from './api';
export * from './auth';
export * from './user';
// ... other exports
```

## Type Safety Guidelines

### 1. Strict Type Checking

All types are designed for strict TypeScript compilation:

```typescript
// Strict null checks
interface UserProfile {
  user_id: string;        // Required
  phone_number?: string;  // Optional
  bio?: string | null;    // Explicitly nullable
}
```

### 2. Discriminated Unions

Use discriminated unions for type safety:

```typescript
interface LoginSuccess {
  success: true;
  user: AuthenticatedUser;
  token: string;
}

interface LoginFailure {
  success: false;
  error: string;
}

type LoginResult = LoginSuccess | LoginFailure;
```

### 3. Readonly Types

Use readonly for immutable data:

```typescript
interface ReadonlyUserProfile extends Readonly<UserProfile> {}

// Or for specific fields
interface UserAuditLog {
  readonly audit_id: string;
  readonly timestamp: Date;
  user_id: string;
  action: string;
}
```

## Validation Integration

Types are designed to work with validation libraries:

```typescript
// Express-validator example
export const userValidation = {
  updateProfile: [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    // Validation rules match UserUpdateData type
  ],
};
```

## Migration Guide

When updating existing code to use these types:

1. **Replace local interfaces** with centralized types
2. **Update imports** to use the types module
3. **Run TypeScript compiler** to catch type errors
4. **Update tests** to use the new types

```typescript
// Before
interface LoginRequest {
  email: string;
  password: string;
}

// After
import { LoginCredentials } from '../types';
// Use LoginCredentials instead of LoginRequest
```

## Contributing

When adding new types:

1. **Choose the correct domain file** (api.ts, auth.ts, user.ts, etc.)
2. **Follow naming conventions** and existing patterns
3. **Add JSDoc comments** for complex types
4. **Export from index.ts**
5. **Update this README** if adding new domains

```typescript
/**
 * Represents a user's application to adopt a pet
 * @example
 * const application: AdoptionApplication = {
 *   application_id: 'app_123',
 *   user_id: 'user_456',
 *   pet_id: 'pet_789',
 *   status: 'pending'
 * };
 */
interface AdoptionApplication {
  application_id: string;
  user_id: string;
  pet_id: string;
  status: ApplicationStatus;
  submitted_at: Date;
  // ... additional fields
}
``` 