# @adopt-dont-shop/lib-api

A **pure HTTP transport layer** for the Adopt Don't Shop application ecosystem. This library provides the foundation for all domain-specific API libraries with type-safe HTTP client functionality, authentication, interceptors, and error handling.

## 🏗️ Architecture

`lib.api` is designed as the **infrastructure layer** that other domain libraries build upon:

```
┌─────────────────────────────────────────┐
│        Application Layer                 │
│  app.client │ app.rescue │ app.admin    │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│         Domain Libraries                 │
│ lib.pets │ lib.auth │ lib.rescue │ ... │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│       Infrastructure Layer              │
│              lib.api                    │
│   HTTP • Auth • Interceptors • Errors  │
└─────────────────────────────────────────┘
```

## Features

- ✅ **Pure HTTP Transport**: GET, POST, PUT, PATCH, DELETE methods
- ✅ **Request/Response Interceptors**: Extensible middleware system
- ✅ **Error Handling**: Structured error types with HTTP status mapping
- ✅ **Authentication**: Automatic token injection and management
- ✅ **Timeout Management**: Configurable request timeouts with AbortController
- ✅ **Development Tools**: Debug logging and request tracking
- ✅ **TypeScript**: Full type safety and IntelliSense support

- **Type-safe API client** with TypeScript support
- **Authentication management** with token handling and refresh
- **Automatic data transformation** for pet data (snake_case ↔ camelCase)
- **Request/response interceptors** for consistent error handling
- **File upload support** with FormData handling
- **Caching capabilities** for improved performance
- **Environment variable support** for different deployment scenarios
- **PostGIS geometry handling** for location data

## Installation

```bash
npm install @adopt-dont-shop/lib-api
```

## Quick Start

### Basic API Usage

```typescript
import { apiService, authService } from '@adopt-dont-shop/lib-api';

// Configure the API service
apiService.updateConfig({
  apiUrl: 'https://api.adopt-dont-shop.com',
  debug: true,
  timeout: 15000
});

// Make authenticated requests
const pets = await apiService.get('/api/v1/pets');
const pet = await apiService.get('/api/v1/pets/123');
```

### Authentication

```typescript
import { authService } from '@adopt-dont-shop/lib-api';

// Login
const authResponse = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Check authentication status
if (authService.isAuthenticated()) {
  const currentUser = authService.getCurrentUser();
  console.log('Logged in as:', currentUser?.email);
}

// Register new user
const newUser = await authService.register({
  email: 'newuser@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  agreeToTerms: true,
  agreeToPrivacyPolicy: true
});
```

### Pet Data Management

```typescript
// Fetch pets with automatic data transformation
const petsResponse = await apiService.get('/api/v1/pets', {
  page: 1,
  limit: 20,
  species: 'dog'
});

// Data is automatically transformed from snake_case to camelCase
// pet.short_description becomes pet.shortDescription
// pet.images becomes pet.photos with proper typing

// Upload pet photo
const file = new File(['...'], 'pet-photo.jpg', { type: 'image/jpeg' });
const uploadResponse = await apiService.uploadFile('/api/v1/pets/123/photos', file, {
  caption: 'Cute photo of Max',
  isPrimary: true
});
```

## API Reference

### ApiService

The main API client for making HTTP requests.

#### Methods

- `get<T>(url: string, params?: object): Promise<T>` - GET request with query parameters
- `post<T>(url: string, data?: unknown): Promise<T>` - POST request with JSON body
- `put<T>(url: string, data?: unknown): Promise<T>` - PUT request with JSON body
- `patch<T>(url: string, data?: unknown): Promise<T>` - PATCH request with JSON body
- `delete<T>(url: string): Promise<T>` - DELETE request
- `uploadFile<T>(url: string, file: File, additionalData?: object): Promise<T>` - File upload
- `healthCheck(): Promise<boolean>` - Check API health status

#### Configuration

```typescript
interface ApiServiceConfig {
  apiUrl?: string;          // Base API URL
  debug?: boolean;          // Enable debug logging
  timeout?: number;         // Request timeout in milliseconds
  headers?: Record<string, string>; // Default headers
}
```

### AuthService

Handles authentication and user management.

#### Methods

- `login(credentials: LoginRequest): Promise<AuthResponse>` - User login
- `register(userData: RegisterRequest): Promise<AuthResponse>` - User registration
- `logout(): Promise<void>` - User logout
- `getCurrentUser(): User | null` - Get current user from storage
- `isAuthenticated(): boolean` - Check authentication status
- `refreshToken(): Promise<AuthResponse | null>` - Refresh access token
- `verifyToken(): Promise<boolean>` - Verify token validity
- `updateProfile(userData: Partial<User>): Promise<User>` - Update user profile
- `changePassword(oldPassword: string, newPassword: string): Promise<void>` - Change password

## Data Transformation

The library automatically transforms data between different naming conventions:

### Pet Data Transformation

```typescript
// API Response (snake_case)
{
  pet_id: "123",
  short_description: "Friendly dog",
  images: [
    {
      image_id: "456",
      is_primary: true,
      order_index: 0
    }
  ],
  created_at: "2023-01-01T00:00:00Z"
}

// Transformed Data (camelCase)
{
  petId: "123",
  shortDescription: "Friendly dog",
  photos: [
    {
      photoId: "456",
      isPrimary: true,
      order: 0
    }
  ],
  createdAt: "2023-01-01T00:00:00Z"
}
```

### Location Handling

PostGIS geometry objects are automatically converted to readable strings:

```typescript
// API Response
{
  location: {
    type: "Point",
    coordinates: [-122.4194, 37.7749]
  }
}

// Transformed Data
{
  location: "37.7749, -122.4194"
}
```

## Environment Variables

The library supports multiple environment variable naming conventions:

- `VITE_API_URL` - Vite-based applications
- `REACT_APP_API_URL` - Create React App applications
- `NODE_ENV` - Determines debug mode

## Error Handling

The library provides comprehensive error handling:

```typescript
try {
  const pets = await apiService.get('/api/v1/pets');
} catch (error) {
  if (error.message.includes('401')) {
    // Handle authentication error
    await authService.logout();
    // Redirect to login
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

## TypeScript Support

The library is written in TypeScript and provides full type safety:

```typescript
import type { 
  User, 
  Pet, 
  AuthResponse, 
  PaginatedResponse 
} from '@adopt-dont-shop/lib-api';

// Fully typed responses
const user: User = await authService.getCurrentUser();
const pets: PaginatedResponse<Pet> = await apiService.get('/api/v1/pets');
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Migration from app.client

If you're migrating from the original `app.client` API code, the usage patterns remain the same:

```typescript
// Before (app.client)
import { apiService } from '../services/api';

// After (lib.api)
import { apiService } from '@adopt-dont-shop/lib-api';

// All method signatures and functionality remain identical
```

## Contributing

1. Follow the existing code style and patterns
2. Add appropriate TypeScript types for new features
3. Update this README for any new functionality
4. Test your changes thoroughly

## License

This package is part of the Adopt Don't Shop project.
