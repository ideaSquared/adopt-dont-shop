import { vi } from 'vitest';
import { UserType } from '../../models/User';

// ──── Mocks (hoisted before imports) ──────────────────────────────────────────

vi.mock('fs', () => {
  const stat = vi.fn().mockResolvedValue({ mtime: new Date('2024-01-01T00:00:00.000Z') });
  const readFile = vi.fn().mockResolvedValue(Buffer.from('file-content'));
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const unlink = vi.fn().mockResolvedValue(undefined);
  const existsSync = vi.fn().mockReturnValue(true);
  const mkdirSync = vi.fn();
  return {
    default: { existsSync, mkdirSync, promises: { stat, readFile, writeFile, unlink } },
    existsSync,
    mkdirSync,
    promises: { stat, readFile, writeFile, unlink },
  };
});

// Mock the wrapper rather than 'file-type' itself: the wrapper uses
// dynamic import (ADS-491) which bypasses Vitest's module registry for
// the inner 'file-type' specifier.
vi.mock('../../utils/file-type-wrapper', () => ({
  fileTypeFromFile: vi.fn(),
}));

vi.mock('isomorphic-dompurify', () => ({
  default: { sanitize: vi.fn((input: unknown) => input) },
}));

vi.mock('../../models/FileUpload', () => ({
  default: { create: vi.fn(), findByPk: vi.fn() },
}));

vi.mock('../../services/auditLog.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../config', () => ({
  config: {
    storage: {
      local: {
        maxFileSize: 10 * 1024 * 1024, // 10 MB
        directory: '/test-uploads',
      },
    },
  },
}));

// ──── Imports ─────────────────────────────────────────────────────────────────

import fs from 'fs';
import { fileTypeFromFile } from '../../utils/file-type-wrapper';
import DOMPurify from 'isomorphic-dompurify';
import FileUpload from '../../models/FileUpload';
import { AuditLogService } from '../../services/auditLog.service';
import { FileUploadService } from '../../services/file-upload.service';

// ──── Helpers ─────────────────────────────────────────────────────────────────

const makeFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'photo.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  destination: '/test-uploads',
  filename: 'photo_123.jpg',
  path: '/test-uploads/photo_123.jpg',
  buffer: Buffer.from(''),
  stream: {} as NodeJS.ReadableStream,
  ...overrides,
});

const makeMockRecord = (overrides: Record<string, unknown> = {}) => ({
  upload_id: 'upload-abc-123',
  original_filename: 'photo.jpg',
  stored_filename: 'pets_1234_uuid.jpg',
  file_path: 'pets/photo_123.jpg',
  mime_type: 'image/jpeg',
  file_size: 1024,
  url: '/uploads/pets_1234_uuid.jpg',
  thumbnail_url: undefined,
  uploaded_by: 'user-456',
  entity_id: undefined,
  entity_type: undefined,
  purpose: undefined,
  metadata: {
    uploadedAt: '2024-01-01T00:00:00.000Z',
    lastModified: '2024-01-01T00:00:00.000Z',
    checksum: 'abc123',
  },
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  destroy: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

/**
 * Sets up the full happy-path mock chain needed for uploadFile() to succeed:
 * - fileTypeFromFile returns a matching MIME
 * - fs.promises.stat returns file stats with an mtime
 * - fs.promises.readFile returns a buffer (used by generateChecksum)
 * - FileUpload.create returns a mock record
 */
const setupSuccessfulUpload = (mimetype = 'image/jpeg') => {
  vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: mimetype, ext: 'jpg' });
  vi.mocked(fs.promises.stat).mockResolvedValue({
    mtime: new Date('2024-01-01'),
  } as unknown as import('fs').Stats);
  vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('file-content'));
  vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord({ mime_type: mimetype }));
};

// ──── Tests ───────────────────────────────────────────────────────────────────

describe('FileUploadService', () => {
  beforeEach(() => {
    // scanForMalware is a private method; spy on it so upload tests exercise
    // validation/processing logic independently of the AV scanner state.
    vi.spyOn(
      FileUploadService as unknown as { scanForMalware: (path: string) => Promise<boolean> },
      'scanForMalware'
    ).mockResolvedValue(true);
  });

  describe('malware scan (fail-closed)', () => {
    it('rejects upload when scanner reports file as infected', async () => {
      vi.spyOn(
        FileUploadService as unknown as { scanForMalware: (path: string) => Promise<boolean> },
        'scanForMalware'
      ).mockResolvedValue(false);

      const file = makeFile();
      setupSuccessfulUpload();

      await expect(
        FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('File failed malware scan');
    });
  });

  describe('validateFile() — file size enforcement', () => {
    it('rejects a file that exceeds the 10 MB size limit', async () => {
      const file = makeFile({ size: 10 * 1024 * 1024 + 1 });

      await expect(
        FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('File upload failed');
    });

    it('accepts a file exactly at the 10 MB size boundary', async () => {
      const file = makeFile({ size: 10 * 1024 * 1024 });
      setupSuccessfulUpload();

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(result.success).toBe(true);
    });

    it('rejects a file with a disallowed MIME type', async () => {
      const file = makeFile({ mimetype: 'application/x-msdownload' });

      await expect(
        FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('File upload failed');
    });
  });

  describe('validateFileContent() — MIME spoofing detection', () => {
    it('accepts a JPEG file whose magic bytes match the declared MIME type', async () => {
      const file = makeFile({ mimetype: 'image/jpeg' });
      setupSuccessfulUpload('image/jpeg');

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(result.success).toBe(true);
      expect(vi.mocked(fileTypeFromFile)).toHaveBeenCalledWith(file.path);
    });

    it('rejects a file declared as image/jpeg whose magic bytes resolve to application/pdf', async () => {
      const file = makeFile({ mimetype: 'image/jpeg' });
      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });

      await expect(
        FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('MIME type spoofing');
    });

    it('allows text/plain files that have no detectable magic bytes', async () => {
      const file = makeFile({
        originalname: 'readme.txt',
        mimetype: 'text/plain',
        path: '/test-uploads/readme.txt',
        filename: 'readme_123.txt',
      });
      vi.mocked(fileTypeFromFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({
        mtime: new Date('2024-01-01'),
      } as unknown as import('fs').Stats);
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('hello world'));
      vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord({ mime_type: 'text/plain' }));

      const result = await FileUploadService.uploadFile(file, 'documents', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
    });

    it('allows text/csv files that have no detectable magic bytes', async () => {
      const file = makeFile({
        originalname: 'data.csv',
        mimetype: 'text/csv',
        path: '/test-uploads/data.csv',
        filename: 'data_123.csv',
      });
      vi.mocked(fileTypeFromFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({
        mtime: new Date('2024-01-01'),
      } as unknown as import('fs').Stats);
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('a,b,c'));
      vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord({ mime_type: 'text/csv' }));

      const result = await FileUploadService.uploadFile(file, 'documents', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
    });

    it('rejects a non-text file when magic bytes cannot be detected', async () => {
      const file = makeFile({ mimetype: 'image/png', originalname: 'image.png' });
      vi.mocked(fileTypeFromFile).mockResolvedValue(undefined);

      await expect(
        FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('File upload failed');
    });
  });

  describe('sanitizeSvgFile() — XSS prevention', () => {
    const makeSvgFile = () =>
      makeFile({
        originalname: 'icon.svg',
        mimetype: 'image/svg+xml',
        path: '/test-uploads/icon.svg',
        filename: 'icon_123.svg',
      });

    const setupSvgUpload = (rawSvg: string, sanitizedSvg: string) => {
      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'image/svg+xml', ext: 'svg' });
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from(rawSvg));
      vi.mocked(DOMPurify.sanitize).mockReturnValue(sanitizedSvg);
      vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({
        mtime: new Date('2024-01-01'),
      } as unknown as import('fs').Stats);
      vi.mocked(FileUpload.create).mockResolvedValue(
        makeMockRecord({ mime_type: 'image/svg+xml' })
      );
    };

    it('strips script tags from SVG content and allows the upload', async () => {
      const rawSvg = '<svg><script>alert("xss")</script><circle r="5"/></svg>';
      const cleanSvg = '<svg><circle r="5"/></svg>';
      setupSvgUpload(rawSvg, cleanSvg);

      const result = await FileUploadService.uploadFile(makeSvgFile(), 'pets', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalledWith(
        '/test-uploads/icon.svg',
        cleanSvg,
        'utf-8'
      );
    });

    it('strips event handler attributes from SVG content', async () => {
      const rawSvg = '<svg><circle onclick="evil()" r="5"/></svg>';
      const cleanSvg = '<svg><circle r="5"/></svg>';
      setupSvgUpload(rawSvg, cleanSvg);

      const result = await FileUploadService.uploadFile(makeSvgFile(), 'pets', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(DOMPurify.sanitize)).toHaveBeenCalled();
    });

    it('rejects an SVG when sanitisation removes all meaningful content', async () => {
      setupSvgUpload('<svg><script>alert(1)</script></svg>', '');

      await expect(
        FileUploadService.uploadFile(makeSvgFile(), 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow('File upload failed');
    });

    it('passes a clean SVG through unchanged', async () => {
      const cleanSvg =
        '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5"/></svg>';
      setupSvgUpload(cleanSvg, cleanSvg);

      const result = await FileUploadService.uploadFile(makeSvgFile(), 'pets', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalledWith(
        '/test-uploads/icon.svg',
        cleanSvg,
        'utf-8'
      );
    });
  });

  describe('uploadFile()', () => {
    it('creates a FileUpload DB record with correct metadata after a successful upload', async () => {
      const file = makeFile({
        originalname: 'cat.jpg',
        size: 2048,
        mimetype: 'image/jpeg',
      });
      setupSuccessfulUpload();

      await FileUploadService.uploadFile(file, 'pets', {
        uploadedBy: 'user-456',
        entityId: 'pet-789',
        entityType: 'pet',
        purpose: 'image',
      });

      expect(vi.mocked(FileUpload.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          original_filename: 'cat.jpg',
          mime_type: 'image/jpeg',
          file_size: 2048,
          uploaded_by: 'user-456',
          entity_id: 'pet-789',
          entity_type: 'pet',
          purpose: 'image',
        })
      );
    });

    it('logs an audit entry with FILE_UPLOAD action after a successful upload', async () => {
      const file = makeFile();
      setupSuccessfulUpload();

      await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(vi.mocked(AuditLogService.log)).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_UPLOAD',
          entity: 'FILE',
          userId: 'user-456',
        })
      );
    });

    it('returns a result with a non-empty checksum in the file metadata', async () => {
      const file = makeFile();
      setupSuccessfulUpload();
      // Provide real buffer content so the MD5 hash produces a non-empty hex string
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('real-file-content'));

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(result.success).toBe(true);
      expect(result.file?.metadata.checksum).toBeTruthy();
      expect(typeof result.file?.metadata.checksum).toBe('string');
      expect((result.file?.metadata.checksum as string).length).toBeGreaterThan(0);
    });

    it('returns upload record and file metadata on success', async () => {
      const file = makeFile({ originalname: 'dog.jpg', size: 512 });
      setupSuccessfulUpload();

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(result.success).toBe(true);
      expect(result.upload).toBeDefined();
      expect(result.file).toBeDefined();
      expect(result.file?.originalName).toBe('dog.jpg');
    });
  });

  describe('uploadMultipleFiles()', () => {
    it('returns a success result for each file that passes validation', async () => {
      const files = [
        makeFile({ originalname: 'a.jpg', path: '/test-uploads/a.jpg', filename: 'a_123.jpg' }),
        makeFile({ originalname: 'b.jpg', path: '/test-uploads/b.jpg', filename: 'b_123.jpg' }),
      ];
      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });
      vi.mocked(fs.promises.stat).mockResolvedValue({
        mtime: new Date(),
      } as unknown as import('fs').Stats);
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('content'));
      vi.mocked(FileUpload.create)
        .mockResolvedValueOnce(
          makeMockRecord({ upload_id: 'upload-1', original_filename: 'a.jpg' })
        )
        .mockResolvedValueOnce(
          makeMockRecord({ upload_id: 'upload-2', original_filename: 'b.jpg' })
        );

      const results = await FileUploadService.uploadMultipleFiles(files, 'pets', {
        uploadedBy: 'user-456',
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('continues processing after a failed file and returns mixed results', async () => {
      const goodFile = makeFile({
        originalname: 'good.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        path: '/test-uploads/good.jpg',
        filename: 'good_123.jpg',
      });
      // Bad file fails at the MIME-type check — fileTypeFromFile is never reached
      const badFile = makeFile({
        originalname: 'bad.exe',
        mimetype: 'application/x-msdownload',
        size: 1024,
      });

      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });
      vi.mocked(fs.promises.stat).mockResolvedValue({
        mtime: new Date(),
      } as unknown as import('fs').Stats);
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('content'));
      vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord());

      const results = await FileUploadService.uploadMultipleFiles([goodFile, badFile], 'pets', {
        uploadedBy: 'user-456',
      });

      expect(results).toHaveLength(2);
      expect(results.filter(r => r.success)).toHaveLength(1);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });

    it('records the filename and error message in the failure result', async () => {
      const badFile = makeFile({
        originalname: 'rejected.exe',
        mimetype: 'application/x-msdownload',
      });

      const results = await FileUploadService.uploadMultipleFiles([badFile], 'pets', {
        uploadedBy: 'user-456',
      });

      expect(results[0].success).toBe(false);
      expect(results[0].filename).toBe('rejected.exe');
      expect(results[0].error).toBeTruthy();
    });
  });

  describe('deleteFile()', () => {
    const owner = { id: 'user-456', type: UserType.ADOPTER };
    const admin = { id: 'admin-789', type: UserType.ADMIN };
    const stranger = { id: 'other-user', type: UserType.ADOPTER };

    it('removes the physical file and the DB record for the file owner', async () => {
      const mockRecord = makeMockRecord({ file_path: 'pets/photo_123.jpg' });
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await FileUploadService.deleteFile('upload-abc-123', owner);

      expect(result.success).toBe(true);
      expect(vi.mocked(fs.promises.unlink)).toHaveBeenCalled();
      expect(mockRecord.destroy).toHaveBeenCalled();
    });

    it('allows an admin to delete a file they do not own', async () => {
      const mockRecord = makeMockRecord();
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await FileUploadService.deleteFile('upload-abc-123', admin);

      expect(result.success).toBe(true);
    });

    it('throws 403 when a non-owner non-admin attempts deletion', async () => {
      const mockRecord = makeMockRecord();
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);

      await expect(FileUploadService.deleteFile('upload-abc-123', stranger)).rejects.toThrow(
        'Not allowed to delete this file'
      );
    });

    it('succeeds gracefully when the physical file is already missing from disk', async () => {
      const mockRecord = makeMockRecord();
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await FileUploadService.deleteFile('upload-abc-123', owner);

      expect(result.success).toBe(true);
      expect(vi.mocked(fs.promises.unlink)).not.toHaveBeenCalled();
      expect(mockRecord.destroy).toHaveBeenCalled();
    });

    it('throws when the uploadId is not found in the database', async () => {
      vi.mocked(FileUpload.findByPk).mockResolvedValue(null);

      await expect(FileUploadService.deleteFile('nonexistent-id', owner)).rejects.toThrow(
        'File deletion failed'
      );
    });

    it('logs an audit entry with FILE_DELETE action after a successful deletion', async () => {
      const mockRecord = makeMockRecord();
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await FileUploadService.deleteFile('upload-abc-123', owner);

      expect(vi.mocked(AuditLogService.log)).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_DELETE',
          entity: 'FILE',
          entityId: 'upload-abc-123',
          userId: 'user-456',
        })
      );
    });
  });
});
