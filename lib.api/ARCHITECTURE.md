# lib.api - HTTP Transport Layer

## Architecture Overview

`lib.api` is designed as a **pure HTTP transport layer** that provides the foundation for all domain-specific libraries. It handles:

- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Authentication headers
- Request/Response interceptors
- Error handling and retries
- Timeout management
- Development debugging

## Usage with Domain Libraries

### Example: lib.pets

```typescript
// lib.pets/src/pet-service.ts
import { apiService, ApiError } from '@adopt-dont-shop/lib-api';
import type { Pet, PetSearchFilters, PaginatedResponse } from './types';

export class PetService {
  constructor(private api = apiService) {}

  async searchPets(filters: PetSearchFilters): Promise<PaginatedResponse<Pet>> {
    try {
      return await this.api.get('/api/v1/pets', filters);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return { data: [], pagination: { totalItems: 0 } };
      }
      throw error;
    }
  }

  async getFeaturedPets(limit = 12): Promise<Pet[]> {
    const response = await this.api.get('/api/v1/pets/featured', { limit });
    return response.data || [];
  }

  async getPetById(id: string): Promise<Pet> {
    return await this.api.get(`/api/v1/pets/${id}`);
  }

  async addToFavorites(petId: string): Promise<void> {
    await this.api.post(`/api/v1/pets/${petId}/favorite`);
  }
}

export const petService = new PetService();
```

### Example: lib.auth

```typescript
// lib.auth/src/auth-service.ts
import { apiService, AuthenticationError } from '@adopt-dont-shop/lib-api';
import type { LoginRequest, AuthResponse, User } from './types';

export class AuthService {
  constructor(private api = apiService) {}

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post('/api/v1/auth/login', credentials);

    // Store tokens
    localStorage.setItem('authToken', response.token);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/v1/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async getCurrentUser(): Promise<User> {
    return await this.api.get('/api/v1/auth/me');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new AuthenticationError('No refresh token available');
    }

    return await this.api.post('/api/v1/auth/refresh', { refreshToken });
  }
}

export const authService = new AuthService();
```

## Interceptor Usage

```typescript
// App-specific setup
import { apiService } from '@adopt-dont-shop/lib-api';

// Add token refresh interceptor
apiService.interceptors.addErrorInterceptor(async (error) => {
  if (error instanceof AuthenticationError) {
    // Attempt token refresh
    try {
      const newTokens = await authService.refreshToken();
      localStorage.setItem('authToken', newTokens.token);
      // Retry the original request
      // ... retry logic
    } catch (refreshError) {
      // Redirect to login
      window.location.href = '/login';
    }
  }
  return error;
});

// Add request logging in development
if (import.meta.env.DEV) {
  apiService.interceptors.addRequestInterceptor(async (config) => {
    console.log(`🌐 ${config.method} ${config.url}`);
    return config;
  });
}
```

## App Integration

### app.client

```typescript
// app.client/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';
import { petService } from '@adopt-dont-shop/lib-pets';
import { authService } from '@adopt-dont-shop/lib-auth';

// Configure API for client app
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  debug: import.meta.env.DEV,
});

export { petService, authService };
```

### app.rescue

```typescript
// app.rescue/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';
import { petService } from '@adopt-dont-shop/lib-pets';
import { authService } from '@adopt-dont-shop/lib-auth';
import { rescueService } from '@adopt-dont-shop/lib-rescue';

// Configure API for rescue app
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  headers: { 'X-App': 'rescue' },
});

export { petService, authService, rescueService };
```

### app.admin

```typescript
// app.admin/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';
import { authService } from '@adopt-dont-shop/lib-auth';
import { adminService } from '@adopt-dont-shop/lib-admin';

// Configure API for admin app with longer timeouts
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: { 'X-App': 'admin' },
});

export { authService, adminService };
```

## Benefits

1. **Single Source of Truth**: All HTTP logic in one place
2. **Consistent Error Handling**: Standardized error types across all apps
3. **Reusable Interceptors**: Auth, logging, retry logic shared
4. **Easy Testing**: Mock the API layer for domain service tests
5. **Flexible Configuration**: Each app can configure as needed
6. **Clean Separation**: Transport vs business logic

## Migration Path

1. Keep existing `lib.api` as pure HTTP transport ✅
2. Create domain libraries: `lib.pets`, `lib.auth`, `lib.rescue`, etc.
3. Move domain-specific logic from individual apps to domain libraries
4. Update apps to use domain libraries instead of direct API calls
5. Remove duplicate API service implementations from apps
