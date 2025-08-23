import { ApiService } from '@adopt-dont-shop/lib-api';
import { AuthenticationError } from '@adopt-dont-shop/lib-api';

// Create the global API service instance
export const globalApiService = new ApiService({
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
});

// Add error interceptor for handling 401 responses
globalApiService.interceptors.addErrorInterceptor((error: any) => {
  if (error instanceof AuthenticationError || error?.response?.status === 401) {
    // Clear authentication token
    localStorage.removeItem('authToken');
    
    // Redirect to homepage
    window.location.href = '/';
  }
  
  throw error;
});

// Export the configured API service
export const apiService = globalApiService;

// Export additional API service alias for compatibility
export const api = globalApiService;

// Domain-specific services can be added here as needed
// For example:
// export { createUserService } from '@adopt-dont-shop/lib.users';
// export { createPetService } from '@adopt-dont-shop/lib.pets';
