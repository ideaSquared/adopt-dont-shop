import { ExampleServiceConfig, ExampleResult } from './types';

/**
 * ExampleService demonstrates the shared library service pattern.
 *
 * Pattern highlights:
 * - Constructor accepts a Partial<Config> so all fields are optional
 * - Debug logging gated behind config.debug flag
 * - Public getConfig/updateConfig for runtime reconfiguration
 * - Synchronous and async methods showing both patterns
 * - healthCheck() returns boolean - useful for orchestration
 *
 * To create a real library, copy this file, rename the class, and
 * replace processItem() with your domain logic.
 */
export class ExampleService {
  private config: ExampleServiceConfig;

  constructor(config: Partial<ExampleServiceConfig> = {}) {
    this.config = {
      debug: false,
      apiUrl: process.env['VITE_API_BASE_URL'] ?? 'http://localhost:5000',
      ...config,
    };

    if (this.config.debug) {
      console.info(`${ExampleService.name} initialized`, this.config);
    }
  }

  public getConfig(): ExampleServiceConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ExampleServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Synchronous example that transforms input into a result.
   * Replace with your domain logic.
   */
  public processItem(input: string): ExampleResult {
    if (!input || input.trim().length === 0) {
      return {
        success: false,
        data: null,
        message: 'Input must be a non-empty string',
        timestamp: new Date().toISOString(),
      };
    }

    const processed = input.trim().toUpperCase();

    return {
      success: true,
      data: {
        original: input,
        processed,
        length: processed.length,
      },
      message: 'Item processed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = this.processItem('health-check-probe');
      return result.success;
    } catch {
      return false;
    }
  }
}
