import { ApiService } from '@adopt-dont-shop/lib.api';
import { {{SERVICE_NAME}}Config } from '../types';

/**
 * {{SERVICE_NAME}} - Handles {{LIB_NAME}} operations
 */
export class {{SERVICE_NAME}} {
  private config: {{SERVICE_NAME}}Config;
  private apiService: ApiService;

  constructor(
    config: Partial<{{SERVICE_NAME}}Config> = {},
    apiService?: ApiService
  ) {
    this.config = {
      debug: false,
      ...config,
    };
    
    this.apiService = apiService || new ApiService();

    if (this.config.debug) {
      console.log(`${{{SERVICE_NAME}}.name} initialized with config:`, this.config);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): {{SERVICE_NAME}}Config {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  public updateConfig(updates: Partial<{{SERVICE_NAME}}Config>): void {
    this.config = { ...this.config, ...updates };
    
    if (this.config.debug) {
      console.log(`${{{SERVICE_NAME}}.name} config updated:`, this.config);
    }
  }

  /**
   * Example API method - customize based on your library's purpose
   * TODO: Replace with actual {{LIB_NAME}} functionality
   */
  public async exampleGet(id: string): Promise<any> {
    try {
      const response = await this.apiService.get(`/api/v1/{{LIB_NAME}}/${id}`);
      
      if (this.config.debug) {
        console.log(`${{{SERVICE_NAME}}.name} exampleGet completed for id:`, id);
      }
      
      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${{{SERVICE_NAME}}.name} exampleGet failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Example POST method
   * TODO: Replace with actual {{LIB_NAME}} functionality
   */
  public async exampleCreate(data: Record<string, unknown>): Promise<any> {
    try {
      const response = await this.apiService.post(`/api/v1/{{LIB_NAME}}`, data);
      
      if (this.config.debug) {
        console.log(`${{{SERVICE_NAME}}.name} exampleCreate completed`);
      }
      
      return response;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${{{SERVICE_NAME}}.name} exampleCreate failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Implement actual health check logic using apiService
      await this.apiService.get('/api/v1/health');
      return true;
    } catch (error) {
      if (this.config.debug) {
        console.error(`${{{SERVICE_NAME}}.name} health check failed:`, error);
      }
      return false;
    }
  }
}
