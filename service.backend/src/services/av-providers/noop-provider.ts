import { logger } from '../../utils/logger';
import { BaseAvProvider, ScanResult } from './base-provider';

export class NoopAvProvider extends BaseAvProvider {
  async scan(filePath: string): Promise<ScanResult> {
    logger.debug('AV (noop): passing file without scanning', { filePath });
    return { clean: true, details: 'noop-provider: not scanned' };
  }

  getName(): string {
    return 'noop';
  }

  validateConfiguration(): boolean {
    return true;
  }
}
