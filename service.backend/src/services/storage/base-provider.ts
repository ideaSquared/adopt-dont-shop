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
}
