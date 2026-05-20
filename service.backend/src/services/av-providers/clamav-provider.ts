import { logger } from '../../utils/logger';
import { BaseAvProvider, ScanResult } from './base-provider';

export type ClamAvConfig = {
  host?: string;
  port?: number;
  timeoutMs?: number;
};

/**
 * ClamAV provider scaffold. Implementation deferred — wire `clamscan`
 * (or equivalent) when ClamAV daemon is available in the deployment.
 *
 * `validateConfiguration` returns true if host/port are set so startup
 * validation can fail fast without a daemon round-trip.
 */
export class ClamAvProvider extends BaseAvProvider {
  private readonly config: ClamAvConfig;

  constructor(config: ClamAvConfig) {
    super();
    this.config = config;
  }

  async scan(filePath: string): Promise<ScanResult> {
    logger.error(
      'ClamAV provider invoked but implementation not wired. Reject file (fail-closed).',
      { filePath, host: this.config.host, port: this.config.port }
    );
    return {
      clean: false,
      details: 'ClamAV provider not implemented — vendor wiring required',
    };
  }

  getName(): string {
    return 'clamav';
  }

  validateConfiguration(): boolean {
    return Boolean(this.config.host && this.config.port);
  }
}
