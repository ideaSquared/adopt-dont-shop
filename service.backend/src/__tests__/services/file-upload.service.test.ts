import { vi } from 'vitest';
import { UserType } from '../../models/User';

// ──── Mocks (hoisted before imports) ──────────────────────────────────────────

vi.mock('fs', async () => {
  const { Readable } = await import('stream');
  const stat = vi.fn().mockResolvedValue({ mtime: new Date('2024-01-01T00:00:00.000Z') });
  const readFile = vi.fn().mockResolvedValue(Buffer.from('file-content'));
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const unlink = vi.fn().mockResolvedValue(undefined);
  const rename = vi.fn().mockResolvedValue(undefined);
  const existsSync = vi.fn().mockReturnValue(true);
  const mkdirSync = vi.fn();
  // ADS-751: generateChecksum streams the file through crypto's Hash via
  // stream.pipeline, so the mock must expose a Readable stream factory.
  // Default to deterministic byte content; tests can override per-case.
  const createReadStream = vi.fn(() => Readable.from(Buffer.from('file-content')));
  return {
    default: {
      existsSync,
      mkdirSync,
      createReadStream,
      promises: { stat, readFile, writeFile, unlink, rename },
    },
    existsSync,
    mkdirSync,
    createReadStream,
    promises: { stat, readFile, writeFile, unlink, rename },
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

// Default to local storage so existing tests are unaffected.
// Individual tests that exercise S3 wiring override this with vi.mocked().
vi.mock('../../services/storage', () => ({
  getStorageProvider: vi.fn(() => ({ getName: () => 'local' })),
  StorageCategory: {},
}));

// ──── Imports ─────────────────────────────────────────────────────────────────

import fs from 'fs';
import { fileTypeFromFile } from '../../utils/file-type-wrapper';
import DOMPurify from 'isomorphic-dompurify';
import FileUpload from '../../models/FileUpload';
import { AuditLogService } from '../../services/auditLog.service';
import { FileUploadService } from '../../services/file-upload.service';
import { getStorageProvider } from '../../services/storage';

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
  url: '/uploads/pets/pets_1234_uuid.jpg',
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
const mimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const setupSuccessfulUpload = (mimetype = 'image/jpeg') => {
  vi.mocked(fileTypeFromFile).mockResolvedValue({
    mime: mimetype,
    ext: mimeToExt[mimetype] ?? 'bin',
  });
  vi.mocked(fs.promises.stat).mockResolvedValue({
    mtime: new Date('2024-01-01'),
    // The service now reads the on-disk size after processing so the DB
    // row reflects compressed bytes, not the original multer-reported
    // size. Existing assertions use file.size, so mirror that here.
    size: 2048,
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

    it('normalises the stored filename extension to match the verified MIME, regardless of user-supplied extension', async () => {
      // Attacker uploads with double-extension `evil.exe.pdf` claiming application/pdf;
      // actual bytes are a real PDF. The stored filename must end with `.pdf` (the
      // canonical extension for the verified MIME), so direct-URL access can't
      // present the file with a misleading extension downstream.
      const file = makeFile({
        originalname: 'evil.exe.pdf',
        mimetype: 'application/pdf',
        filename: 'documents_1234_uuid.pdf',
        path: '/test-uploads/documents/documents_1234_uuid.pdf',
      });
      setupSuccessfulUpload('application/pdf');

      const result = await FileUploadService.uploadFile(file, 'documents', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(result.file?.filename).toMatch(/\.pdf$/);
      expect(result.file?.filename).not.toMatch(/\.exe/);
    });

    it('rewrites the on-disk filename when the user-supplied extension does not match the verified MIME', async () => {
      // User-supplied originalname has `.jpg` but the declared+detected MIME is
      // application/pdf. The on-disk filename should be renamed so its extension
      // matches the verified MIME (`.pdf`), not the user-supplied `.jpg`.
      const file = makeFile({
        originalname: 'photo.jpg',
        mimetype: 'application/pdf',
        filename: 'documents_1234_uuid.jpg',
        path: '/test-uploads/documents/documents_1234_uuid.jpg',
      });
      setupSuccessfulUpload('application/pdf');

      const result = await FileUploadService.uploadFile(file, 'documents', {
        uploadedBy: 'user-456',
      });

      expect(result.success).toBe(true);
      expect(result.file?.filename).toBe('documents_1234_uuid.pdf');
      expect(vi.mocked(fs.promises.rename)).toHaveBeenCalledWith(
        '/test-uploads/documents/documents_1234_uuid.jpg',
        '/test-uploads/documents/documents_1234_uuid.pdf'
      );
    });
  });

  describe('SVG uploads rejected at allowlist level (ADS-598)', () => {
    // ADS-598: `image/svg+xml` was dropped from the image allowlist because
    // SVGs execute same-origin and DOMPurify SVG sanitisation has a long
    // CVE history. Any attempt to upload one — clean or malicious — is
    // rejected. The `sanitizeSvgFile` helper is kept as defence-in-depth
    // for non-multer code paths but the normal upload pipeline never
    // reaches it.
    const makeSvgFile = () =>
      makeFile({
        originalname: 'icon.svg',
        mimetype: 'image/svg+xml',
        path: '/test-uploads/icon.svg',
        filename: 'icon_123.svg',
      });

    it('rejects an SVG upload even when the content is clean', async () => {
      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'image/svg+xml', ext: 'svg' });

      await expect(
        FileUploadService.uploadFile(makeSvgFile(), 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow(/image\/svg\+xml/);
      expect(vi.mocked(DOMPurify.sanitize)).not.toHaveBeenCalled();
      expect(vi.mocked(FileUpload.create)).not.toHaveBeenCalled();
    });

    it('rejects an SVG upload containing <script> without ever invoking the sanitiser', async () => {
      const rawSvg = '<svg><script>alert("xss")</script><circle r="5"/></svg>';
      vi.mocked(fileTypeFromFile).mockResolvedValue({ mime: 'image/svg+xml', ext: 'svg' });
      vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from(rawSvg));

      await expect(
        FileUploadService.uploadFile(makeSvgFile(), 'pets', { uploadedBy: 'user-456' })
      ).rejects.toThrow(/image\/svg\+xml/);
      expect(vi.mocked(DOMPurify.sanitize)).not.toHaveBeenCalled();
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

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      expect(result.success).toBe(true);
      expect(result.file?.metadata.checksum).toBeTruthy();
      expect(typeof result.file?.metadata.checksum).toBe('string');
      expect((result.file?.metadata.checksum as string).length).toBeGreaterThan(0);
    });

    it('uses SHA-256 (not MD5) for the upload checksum and tags the algorithm (ADS-751)', async () => {
      const file = makeFile();
      setupSuccessfulUpload();

      const result = await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

      // SHA-256 hex digests are exactly 64 chars; MD5 is 32 chars. This
      // shape assertion catches any regression that swaps the algorithm
      // back without anyone noticing.
      expect(result.file?.metadata.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(result.file?.metadata.checksumAlgo).toBe('sha256');
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

    it('produces URLs that include the on-disk prefix segment', async () => {
      // Regression: the writer used to emit `/uploads/<filename>` while
      // multer placed the file at `<dir>/<prefix>/<filename>`, so the URL
      // 404'd when the client followed it. Cover each upload type.
      const cases: Array<{
        uploadType: 'pets' | 'applications' | 'chat' | 'profiles' | 'documents';
        expectedPrefix: string;
      }> = [
        { uploadType: 'pets', expectedPrefix: '/uploads/pets/' },
        { uploadType: 'applications', expectedPrefix: '/uploads/applications/' },
        { uploadType: 'chat', expectedPrefix: '/uploads/chat/' },
        { uploadType: 'profiles', expectedPrefix: '/uploads/profiles/' },
        { uploadType: 'documents', expectedPrefix: '/uploads/documents/' },
      ];

      for (const { uploadType, expectedPrefix } of cases) {
        const file = makeFile({
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
          filename: `${uploadType}_1234_uuid.pdf`,
          path: `/test-uploads/${uploadType}/${uploadType}_1234_uuid.pdf`,
        });
        setupSuccessfulUpload('application/pdf');

        const result = await FileUploadService.uploadFile(file, uploadType, {
          uploadedBy: 'user-456',
        });

        expect(result.success).toBe(true);
        expect(result.file?.url).toBe(`${expectedPrefix}${uploadType}_1234_uuid.pdf`);
      }
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

    it('allows a super_admin to delete a file they do not own', async () => {
      const superAdmin = { id: 'sa-789', type: UserType.SUPER_ADMIN };
      const mockRecord = makeMockRecord();
      vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await FileUploadService.deleteFile('upload-abc-123', superAdmin);

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
      // Primary is skipped via existsSync; companion cleanup still attempts
      // (`.original` + `.thumb.jpg`) and swallows ENOENT so the delete
      // succeeds regardless.
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

  describe('S3 storage provider wiring', () => {
    const s3ProviderUploadFile = vi.fn();
    const s3ProviderDeleteFile = vi.fn();
    const mockS3Provider = {
      getName: () => 's3',
      uploadFile: s3ProviderUploadFile,
      deleteFile: s3ProviderDeleteFile,
    };

    beforeEach(() => {
      s3ProviderUploadFile.mockResolvedValue({
        url: 'https://bucket.s3.us-east-1.amazonaws.com/pets/uuid.jpg',
        filename: 'uuid.jpg',
        size: 1024,
      });
      s3ProviderDeleteFile.mockResolvedValue(undefined);
      vi.mocked(getStorageProvider).mockReturnValue(
        mockS3Provider as ReturnType<typeof getStorageProvider>
      );
    });

    afterEach(() => {
      vi.mocked(getStorageProvider).mockReturnValue({ getName: () => 'local' } as ReturnType<
        typeof getStorageProvider
      >);
    });

    describe('upload', () => {
      it('uploads the processed file to the S3 provider when STORAGE_PROVIDER=s3', async () => {
        const file = makeFile({ originalname: 'cat.jpg', mimetype: 'image/jpeg' });
        setupSuccessfulUpload();
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('processed-content'));
        vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord());

        const result = await FileUploadService.uploadFile(file, 'pets', {
          uploadedBy: 'user-456',
        });

        expect(result.success).toBe(true);
        expect(s3ProviderUploadFile).toHaveBeenCalledWith(
          expect.any(Buffer),
          'cat.jpg',
          'image/jpeg',
          'pets'
        );
      });

      it('stores the backend-routed /uploads URL — not the direct S3 URL — so the ACL gate still applies', async () => {
        const file = makeFile({ originalname: 'dog.jpg', mimetype: 'image/jpeg' });
        setupSuccessfulUpload();
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('data'));
        vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord());

        await FileUploadService.uploadFile(file, 'pets', { uploadedBy: 'user-456' });

        expect(vi.mocked(FileUpload.create)).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/uploads/pets/uuid.jpg',
          })
        );
      });

      it('routes private-category uploads through /uploads/<category> even though S3 minted a direct URL', async () => {
        s3ProviderUploadFile.mockResolvedValueOnce({
          url: 'https://bucket.s3.us-east-1.amazonaws.com/documents/secret.pdf',
          filename: 'secret.pdf',
          size: 2048,
        });
        const file = makeFile({ originalname: 'app.pdf', mimetype: 'application/pdf' });
        setupSuccessfulUpload('application/pdf');
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('data'));
        vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord());

        await FileUploadService.uploadFile(file, 'applications', { uploadedBy: 'user-456' });

        expect(vi.mocked(FileUpload.create)).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/uploads/documents/secret.pdf',
          })
        );
      });

      it('maps profiles upload type to the "users" S3 category', async () => {
        const file = makeFile({
          originalname: 'avatar.jpg',
          mimetype: 'image/jpeg',
          path: '/test-uploads/avatar.jpg',
          filename: 'avatar_123.jpg',
          destination: '/test-uploads',
        });
        setupSuccessfulUpload();
        vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('data'));
        vi.mocked(FileUpload.create).mockResolvedValue(makeMockRecord());

        await FileUploadService.uploadFile(file, 'profiles', { uploadedBy: 'user-456' });

        expect(s3ProviderUploadFile).toHaveBeenCalledWith(
          expect.any(Buffer),
          'avatar.jpg',
          'image/jpeg',
          'users'
        );
      });
    });

    describe('delete', () => {
      it('delegates deletion to the S3 provider using the stored file path as key', async () => {
        const mockRecord = makeMockRecord({
          file_path: 'pets/photo_123.jpg',
          uploaded_by: 'user-456',
        });
        vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);

        await FileUploadService.deleteFile('upload-abc-123', {
          id: 'user-456',
          type: UserType.ADOPTER,
        });

        expect(s3ProviderDeleteFile).toHaveBeenCalledWith('photo_123.jpg', 'pets');
        expect(vi.mocked(fs.promises.unlink)).not.toHaveBeenCalled();
      });

      it('handles a file_path without a directory segment gracefully', async () => {
        const mockRecord = makeMockRecord({ file_path: 'orphan.jpg', uploaded_by: 'user-456' });
        vi.mocked(FileUpload.findByPk).mockResolvedValue(mockRecord);

        await FileUploadService.deleteFile('upload-abc-123', {
          id: 'user-456',
          type: UserType.ADOPTER,
        });

        expect(s3ProviderDeleteFile).toHaveBeenCalledWith('orphan.jpg', 'documents');
      });
    });
  });
});
