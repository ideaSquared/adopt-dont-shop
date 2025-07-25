import { ChatServiceConfig, ChatServiceOptions, BaseResponse, ErrorResponse } from '../types';

/**
 * ChatService - Handles chat operations
 */
export class ChatService {
  private config: Required<ChatServiceConfig>;
  private cache: Map<string, unknown> = new Map();

  constructor(config: ChatServiceConfig = {}) {
    this.config = {
      apiUrl: process.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000',
      debug: process.env.NODE_ENV === 'development',
      headers: {},
      ...config,
    };

    if (this.config.debug) {
      console.log(`${ChatService.name} initialized with config:`, this.config);
    }
  }

  /**
   * Update service configuration
   */
  updateConfig(config: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.debug) {
      console.log(`${ChatService.name} config updated:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatServiceConfig {
    return { ...this.config };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    
    if (this.config.debug) {
      console.log(`${ChatService.name} cache cleared`);
    }
  }

  /**
   * Example method - customize based on your library's purpose
   */
  async exampleMethod(
    data: Record<string, unknown>,
    options: ChatServiceOptions = {}
  ): Promise<BaseResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first if enabled
      const cacheKey = `example_${JSON.stringify(data)}`;
      if (options.useCache && this.cache.has(cacheKey)) {
        if (this.config.debug) {
          console.log(`${ChatService.name} cache hit for key:`, cacheKey);
        }
        return this.cache.get(cacheKey) as BaseResponse;
      }

      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response: BaseResponse = {
        data: { processed: data, timestamp: new Date().toISOString() },
        success: true,
        message: 'Example operation completed successfully',
        timestamp: new Date().toISOString(),
      };

      // Cache the response if enabled
      if (options.useCache) {
        this.cache.set(cacheKey, response);
      }

      if (this.config.debug) {
        const duration = Date.now() - startTime;
        console.log(`${ChatService.name} exampleMethod completed in ${duration}ms`);
      }

      return response;
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXAMPLE_ERROR',
        timestamp: new Date().toISOString(),
      };

      if (this.config.debug) {
        console.error(`${ChatService.name} exampleMethod failed:`, errorResponse);
      }

      throw errorResponse;
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Implement actual health check logic
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${ChatService.name} health check failed:`, error);
      }
      return false;
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
