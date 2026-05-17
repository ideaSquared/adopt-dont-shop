export type ScanResult = {
  clean: boolean;
  details?: string;
};

export interface AvProvider {
  scan(filePath: string): Promise<ScanResult>;
  getName(): string;
  validateConfiguration(): boolean;
}

export abstract class BaseAvProvider implements AvProvider {
  abstract scan(filePath: string): Promise<ScanResult>;
  abstract getName(): string;
  abstract validateConfiguration(): boolean;
}
