# @adopt-dont-shop/lib-api

Pure HTTP transport layer providing the foundation for all domain-specific libraries with authentication, error handling, and interceptors

## 📦 Installation

```bash
# From the workspace root
npm install @adopt-dont-shop/lib-api

# Or add to your package.json
{
  "dependencies": {
    "@adopt-dont-shop/lib-api": "workspace:*"
  }
}
```

## 🚀 Quick Start

```typescript
import { apiService, ApiServiceConfig } from '@adopt-dont-shop/lib-api';

// Basic API calls
const data = await apiService.get('/api/pets');
const newPet = await apiService.post('/api/pets', petData);
const updatedPet = await apiService.put('/api/pets/123', updates);
await apiService.delete('/api/pets/123');

// Custom configuration
const customApi = new ApiService({
  apiUrl: 'https://api.example.com',
  timeout: 10000,
  debug: true,
});
```

## 🔧 Configuration

### ApiServiceConfig

| Property  | Type                     | Default                    | Description                      |
| --------- | ------------------------ | -------------------------- | -------------------------------- |
| `apiUrl`  | `string`                 | `process.env.VITE_API_URL` | Base API URL                     |
| `timeout` | `number`                 | `10000`                    | Request timeout in milliseconds  |
| `retries` | `number`                 | `3`                        | Number of retry attempts         |
| `headers` | `Record<string, string>` | `{}`                       | Default headers for all requests |
| `debug`   | `boolean`                | `false`                    | Enable debug logging             |

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📖 API Reference

### ApiService

#### HTTP Methods

##### `get(url, params?, options?)`

Perform GET requests with query parameters.

```typescript
// Simple GET request
const pets = await apiService.get('/api/pets');

// With query parameters
const filteredPets = await apiService.get('/api/pets', {
  species: 'dog',
  status: 'available',
  limit: 20,
});

// With custom options
const data = await apiService.get('/api/pets', null, {
  timeout: 15000,
  headers: { Accept: 'application/json' },
});
```

##### `post(url, data?, options?)`

Perform POST requests with request body.

```typescript
// Create new resource
const newPet = await apiService.post('/api/pets', {
  name: 'Buddy',
  species: 'dog',
  breed: 'Golden Retriever',
});

// File upload
const formData = new FormData();
formData.append('photo', file);
const uploadResult = await apiService.post('/api/pets/123/photos', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

##### `put(url, data?, options?)`

Perform PUT requests for full resource updates.

```typescript
const updatedPet = await apiService.put('/api/pets/123', {
  name: 'Buddy Updated',
  status: 'adopted',
  description: 'Now in loving home!',
});
```

##### `patch(url, data?, options?)`

Perform PATCH requests for partial updates.

```typescript
const partialUpdate = await apiService.patch('/api/pets/123', {
  status: 'adopted',
});
```

##### `delete(url, options?)`

Perform DELETE requests.

```typescript
await apiService.delete('/api/pets/123');

// With confirmation
await apiService.delete('/api/pets/123', {
  headers: { 'X-Confirm': 'true' },
});
```

#### Request Interceptors

##### `interceptors.addRequestInterceptor(interceptor)`

Add request interceptors for preprocessing requests.

```typescript
// Add authentication header
apiService.interceptors.addRequestInterceptor(async config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Add request logging
apiService.interceptors.addRequestInterceptor(async config => {
  console.log(`🌐 ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// Add API version header
apiService.interceptors.addRequestInterceptor(async config => {
  config.headers = {
    ...config.headers,
    'X-API-Version': '1.0',
  };
  return config;
});
```

##### `interceptors.addResponseInterceptor(interceptor)`

Add response interceptors for processing responses.

```typescript
// Transform response data
apiService.interceptors.addResponseInterceptor(async response => {
  // Automatically extract data field if present
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data;
});

// Response logging
apiService.interceptors.addResponseInterceptor(async response => {
  console.log(`✅ Response received for ${response.config?.url}`);
  return response;
});
```

##### `interceptors.addErrorInterceptor(interceptor)`

Add error interceptors for handling failures.

```typescript
// Token refresh on 401 errors
apiService.interceptors.addErrorInterceptor(async error => {
  if (error instanceof AuthenticationError && error.status === 401) {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const newTokens = await refreshAuthToken(refreshToken);
        localStorage.setItem('authToken', newTokens.token);

        // Retry the original request
        return await apiService.request(error.config);
      }
    } catch (refreshError) {
      // Redirect to login
      window.location.href = '/login';
    }
  }
  throw error;
});

// Error logging
apiService.interceptors.addErrorInterceptor(async error => {
  console.error(`❌ API Error: ${error.message}`);
  throw error;
});
```

#### Configuration Management

##### `updateConfig(newConfig)`

Update service configuration at runtime.

```typescript
// Update API URL
apiService.updateConfig({
  apiUrl: 'https://production-api.example.com',
});

// Update headers
apiService.updateConfig({
  headers: {
    'X-App-Version': '2.1.0',
    'X-Client-Type': 'web',
  },
});

// Update timeout and retries
apiService.updateConfig({
  timeout: 15000,
  retries: 5,
});
```

##### `getConfig()`

Get current service configuration.

```typescript
const currentConfig = apiService.getConfig();
console.log('Current API URL:', currentConfig.apiUrl);
console.log('Current timeout:', currentConfig.timeout);
```

#### Error Handling

##### Custom Error Types

```typescript
import {
  ApiError,
  AuthenticationError,
  NetworkError,
  ValidationError,
} from '@adopt-dont-shop/lib-api';

try {
  const data = await apiService.get('/api/protected');
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication issues
    console.log('Authentication failed:', error.message);
    redirectToLogin();
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.log('Validation errors:', error.details);
    showValidationErrors(error.details);
  } else if (error instanceof NetworkError) {
    // Handle network issues
    console.log('Network error:', error.message);
    showOfflineMessage();
  } else if (error instanceof ApiError) {
    // Handle other API errors
    console.log('API error:', error.status, error.message);
    showErrorMessage(error.message);
  }
}
```

## 🏗️ Architecture Design

### Pure HTTP Transport Layer

`lib.api` is designed as a **pure HTTP transport layer** that provides the foundation for all domain-specific libraries. It handles:

- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Authentication headers
- Request/Response interceptors
- Error handling and retries
- Timeout management
- Development debugging

### Usage with Domain Libraries

```typescript
// Example: lib.pets
import { apiService } from '@adopt-dont-shop/lib-api';

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

  async getPetById(id: string): Promise<Pet> {
    return await this.api.get(`/api/v1/pets/${id}`);
  }

  async addToFavorites(petId: string): Promise<void> {
    await this.api.post(`/api/v1/pets/${petId}/favorite`);
  }
}
```

### App Integration

#### app.client

```typescript
// app.client/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';

// Configure API for client app
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  debug: import.meta.env.DEV,
});

// Add client-specific interceptors
apiService.interceptors.addRequestInterceptor(async config => {
  config.headers = {
    ...config.headers,
    'X-App': 'client',
  };
  return config;
});
```

#### app.rescue

```typescript
// app.rescue/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';

// Configure API for rescue app
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  headers: { 'X-App': 'rescue' },
});
```

#### app.admin

```typescript
// app.admin/src/services/index.ts
import { apiService } from '@adopt-dont-shop/lib-api';

// Configure API for admin app with longer timeouts
apiService.updateConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: { 'X-App': 'admin' },
});
```

## 🧪 Testing

The library includes comprehensive Jest tests covering:

- ✅ HTTP method implementations
- ✅ Request/response interceptors
- ✅ Error handling and custom error types
- ✅ Authentication flows
- ✅ Retry logic and timeout handling
- ✅ Configuration management
- ✅ Mock service for testing

Run tests:

```bash
npm run test:lib-api
```

### Testing with Domain Libraries

```typescript
// Testing pet service with mocked API
import { apiService } from '@adopt-dont-shop/lib-api';
import { PetService } from '@adopt-dont-shop/lib-pets';

// Mock the API service
jest.mock('@adopt-dont-shop/lib-api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('PetService', () => {
  let petService: PetService;

  beforeEach(() => {
    petService = new PetService(mockApiService);
  });

  it('should fetch pets', async () => {
    const mockPets = [{ id: '1', name: 'Buddy' }];
    mockApiService.get.mockResolvedValue({ data: mockPets });

    const result = await petService.getAllPets();

    expect(mockApiService.get).toHaveBeenCalledWith('/api/v1/pets', undefined);
    expect(result.data).toEqual(mockPets);
  });
});
```

## 🚀 Key Features

### Unified HTTP Interface

- **Consistent API**: Same interface across all HTTP methods
- **Type Safety**: Full TypeScript support with proper typing
- **Promise-Based**: Modern async/await support
- **Error Handling**: Structured error types for different scenarios

### Flexible Interceptor System

- **Request Interceptors**: Modify requests before sending
- **Response Interceptors**: Transform responses after receiving
- **Error Interceptors**: Handle and transform errors
- **Chain Support**: Multiple interceptors with proper execution order

### Robust Error Handling

- **Custom Error Types**: Specific error classes for different scenarios
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Network Resilience**: Graceful handling of network failures
- **Debug Support**: Comprehensive logging for development

### Performance Optimization

- **Connection Pooling**: Efficient HTTP connection management
- **Request Deduplication**: Prevent duplicate requests
- **Caching Support**: HTTP cache headers and ETags
- **Timeout Management**: Configurable timeouts with fallbacks

## 🔧 Troubleshooting

### Common Issues

**Authentication errors**:

- Check token format and Authorization header
- Verify token refresh logic in error interceptors
- Review authentication flow and token storage

**Network connectivity**:

- Check API URL configuration and reachability
- Verify CORS settings for cross-origin requests
- Review network error handling and retry logic

**Request timeouts**:

- Adjust timeout configuration for slow endpoints
- Implement proper loading states in UI
- Consider request cancellation for component unmounting

### Debug Mode

```typescript
const api = new ApiService({
  debug: true, // Enables comprehensive request/response logging
});

// Or enable debugging on existing instance
apiService.updateConfig({ debug: true });
```

This library provides the foundational HTTP transport layer for the entire adopt-dont-shop ecosystem, enabling consistent API communication across all domain-specific libraries with robust error handling, authentication, and performance optimization.
