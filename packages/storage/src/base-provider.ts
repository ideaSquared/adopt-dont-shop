export type StorageCategory = 'pets' | 'users' | 'documents';

export type UploadResult = {
  url: string;
  filename: string;
  size: number;
};

export type FileInfo = { exists: true; size: number; modified: Date } | { exists: false };

export interface StorageProvider {
  uploadFile(
    file: Buffer,
    originalName: string,
    contentType: string,
    category?: StorageCategory
  ): Promise<UploadResult>;
  deleteFile(filename: string, category?: string): Promise<void>;
  getFileInfo(filename: string, category?: string): Promise<FileInfo>;
  getName(): string;
  validateConfiguration(): boolean;
  // Returns true when the provider serves content via signed redirect rather than
  // streaming bytes through Node. Drives the serve route's redirect-vs-stream branch.
  supportsSignedUrls(): boolean;
  // Mints a short-lived URL for direct client access. Only meaningful when
  // supportsSignedUrls() returns true; local provider throws.
  getSignedUrl(filename: string, category?: string, expiresInSeconds?: number): Promise<string>;
}
