import { beforeEach, describe, expect, it, vi } from 'vitest';

// ──── Mocks (hoisted before imports) ──────────────────────────────────────────

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: class PutObjectCommand {
    constructor(public readonly params: unknown) {}
  },
  DeleteObjectCommand: class DeleteObjectCommand {
    constructor(public readonly params: unknown) {}
  },
  HeadObjectCommand: class HeadObjectCommand {
    constructor(public readonly params: unknown) {}
  },
  GetObjectCommand: class GetObjectCommand {
    constructor(public readonly params: unknown) {}
  },
}));

const { mockGetSignedUrl } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(async () => 'https://signed.example.com/key?sig=abc'),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('../../../utils/uuid-helpers', () => ({
  generateCryptoUuid: vi.fn(() => 'test-uuid-1234'),
}));

// ──── Imports ─────────────────────────────────────────────────────────────────

import { S3Client } from '@aws-sdk/client-s3';
import { S3StorageProvider } from '../../../services/storage/s3-storage-provider';

// ──── Fixtures ────────────────────────────────────────────────────────────────

const validConfig = {
  bucket: 'test-bucket',
  region: 'us-east-1',
  accessKeyId: 'test-access-key',
  secretAccessKey: 'test-secret-key',
};

const withCloudFront = { ...validConfig, cloudFrontDomain: 'cdn.example.com' };

const mockSend = vi.fn();
const mockClient = { send: mockSend } as unknown as S3Client;

const makeProvider = (config = validConfig) => new S3StorageProvider(config, mockClient);

// ──── Tests ───────────────────────────────────────────────────────────────────

describe('S3StorageProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue('https://signed.example.com/key?sig=abc');
  });

  describe('validateConfiguration', () => {
    it('returns true when all required credentials are present', () => {
      expect(new S3StorageProvider(validConfig).validateConfiguration()).toBe(true);
    });

    it('returns false when bucket is missing', () => {
      expect(
        new S3StorageProvider({ ...validConfig, bucket: undefined }).validateConfiguration()
      ).toBe(false);
    });

    it('returns false when region is missing', () => {
      expect(
        new S3StorageProvider({ ...validConfig, region: undefined }).validateConfiguration()
      ).toBe(false);
    });

    it('returns false when accessKeyId is missing', () => {
      expect(
        new S3StorageProvider({ ...validConfig, accessKeyId: undefined }).validateConfiguration()
      ).toBe(false);
    });

    it('returns false when secretAccessKey is missing', () => {
      expect(
        new S3StorageProvider({
          ...validConfig,
          secretAccessKey: undefined,
        }).validateConfiguration()
      ).toBe(false);
    });
  });

  describe('getName', () => {
    it('returns "s3"', () => {
      expect(makeProvider().getName()).toBe('s3');
    });
  });

  describe('supportsSignedUrls', () => {
    it('returns true', () => {
      expect(makeProvider().supportsSignedUrls()).toBe(true);
    });
  });

  describe('uploadFile', () => {
    it('sends PutObjectCommand with the correct bucket, key, body, and content type', async () => {
      const buffer = Buffer.from('image-data');

      await makeProvider().uploadFile(buffer, 'photo.jpg', 'image/jpeg', 'pets');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toEqual(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'pets/test-uuid-1234.jpg',
          Body: buffer,
          ContentType: 'image/jpeg',
        })
      );
    });

    it('returns the S3 URL, filename, and size', async () => {
      const buffer = Buffer.from('image-data');

      const result = await makeProvider().uploadFile(buffer, 'photo.jpg', 'image/jpeg', 'pets');

      expect(result).toEqual({
        url: 'https://test-bucket.s3.us-east-1.amazonaws.com/pets/test-uuid-1234.jpg',
        filename: 'test-uuid-1234.jpg',
        size: buffer.length,
      });
    });

    it('uses CloudFront domain in URL when configured', async () => {
      const result = await makeProvider(withCloudFront).uploadFile(
        Buffer.from('pdf-data'),
        'document.pdf',
        'application/pdf',
        'documents'
      );

      expect(result.url).toBe('https://cdn.example.com/documents/test-uuid-1234.pdf');
    });

    it('defaults category to "documents" when not specified', async () => {
      await makeProvider().uploadFile(Buffer.from('data'), 'file.pdf', 'application/pdf');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toMatchObject({ Key: 'documents/test-uuid-1234.pdf' });
    });

    it('preserves the original file extension in the stored filename', async () => {
      const result = await makeProvider().uploadFile(
        Buffer.from('data'),
        'report.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'documents'
      );

      expect(result.filename).toBe('test-uuid-1234.xlsx');
    });

    it('requests AES256 server-side encryption on every put', async () => {
      await makeProvider().uploadFile(Buffer.from('data'), 'photo.jpg', 'image/jpeg', 'pets');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toMatchObject({ ServerSideEncryption: 'AES256' });
    });

    it('forces Content-Disposition: attachment on non-image uploads to block inline render', async () => {
      await makeProvider().uploadFile(
        Buffer.from('data'),
        'document.pdf',
        'application/pdf',
        'documents'
      );

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toMatchObject({ ContentDisposition: 'attachment' });
    });

    it('omits Content-Disposition for image uploads so they remain embeddable', async () => {
      await makeProvider().uploadFile(Buffer.from('data'), 'photo.jpg', 'image/jpeg', 'pets');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params.ContentDisposition).toBeUndefined();
    });

    it('throws when the S3 send fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 connection refused'));

      await expect(
        makeProvider().uploadFile(Buffer.from('data'), 'photo.jpg', 'image/jpeg', 'pets')
      ).rejects.toThrow('S3 connection refused');
    });

    it('throws when called on a misconfigured provider', async () => {
      const provider = new S3StorageProvider({ ...validConfig, bucket: undefined }, mockClient);

      await expect(
        provider.uploadFile(Buffer.from('data'), 'photo.jpg', 'image/jpeg', 'pets')
      ).rejects.toThrow(/misconfigured/);
    });
  });

  describe('deleteFile', () => {
    it('sends DeleteObjectCommand with the correct bucket and key', async () => {
      await makeProvider().deleteFile('photo.jpg', 'pets');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toEqual({ Bucket: 'test-bucket', Key: 'pets/photo.jpg' });
    });

    it('defaults category to "documents" when not specified', async () => {
      await makeProvider().deleteFile('report.pdf');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toMatchObject({ Key: 'documents/report.pdf' });
    });

    it('throws when the S3 send fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(makeProvider().deleteFile('photo.jpg', 'pets')).rejects.toThrow('Access denied');
    });
  });

  describe('getFileInfo', () => {
    it('returns file info when the object exists', async () => {
      const lastModified = new Date('2024-06-01T12:00:00Z');
      mockSend.mockResolvedValueOnce({ ContentLength: 2048, LastModified: lastModified });

      const info = await makeProvider().getFileInfo('photo.jpg', 'pets');

      const sentCommand = mockSend.mock.calls[0][0];
      expect(sentCommand.params).toEqual({ Bucket: 'test-bucket', Key: 'pets/photo.jpg' });
      expect(info).toEqual({ exists: true, size: 2048, modified: lastModified });
    });

    it('returns { exists: false } when the object does not exist (NotFound)', async () => {
      mockSend.mockRejectedValueOnce(Object.assign(new Error('NotFound'), { name: 'NotFound' }));

      const info = await makeProvider().getFileInfo('missing.jpg', 'pets');

      expect(info).toEqual({ exists: false });
    });

    it('returns { exists: false } when the object does not exist (NoSuchKey)', async () => {
      mockSend.mockRejectedValueOnce(Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' }));

      const info = await makeProvider().getFileInfo('missing.jpg', 'pets');

      expect(info).toEqual({ exists: false });
    });

    it('returns { exists: false } when the response has a 404 status', async () => {
      mockSend.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });

      const info = await makeProvider().getFileInfo('missing.jpg', 'pets');

      expect(info).toEqual({ exists: false });
    });

    it('rethrows non-404 errors so callers do not mistake AccessDenied for not-found', async () => {
      mockSend.mockRejectedValueOnce(
        Object.assign(new Error('AccessDenied'), {
          name: 'AccessDenied',
          $metadata: { httpStatusCode: 403 },
        })
      );

      await expect(makeProvider().getFileInfo('photo.jpg', 'pets')).rejects.toThrow('AccessDenied');
    });

    it('defaults size to 0 when ContentLength is absent in the HeadObject response', async () => {
      mockSend.mockResolvedValueOnce({ LastModified: new Date() });

      const info = await makeProvider().getFileInfo('photo.jpg', 'pets');

      expect(info).toMatchObject({ exists: true, size: 0 });
    });
  });

  describe('getSignedUrl', () => {
    it('delegates to @aws-sdk/s3-request-presigner with the right bucket and key', async () => {
      const provider = makeProvider();

      const url = await provider.getSignedUrl('photo.jpg', 'pets', 120);

      expect(url).toBe('https://signed.example.com/key?sig=abc');
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      const [, command, options] = mockGetSignedUrl.mock.calls[0];
      expect((command as { params: { Bucket: string; Key: string } }).params).toEqual({
        Bucket: 'test-bucket',
        Key: 'pets/photo.jpg',
      });
      expect(options).toEqual({ expiresIn: 120 });
    });

    it('uses a 5-minute default TTL when expiresInSeconds is omitted', async () => {
      await makeProvider().getSignedUrl('photo.jpg', 'pets');

      const [, , options] = mockGetSignedUrl.mock.calls[0];
      expect(options).toEqual({ expiresIn: 5 * 60 });
    });

    it('throws when the provider is misconfigured', async () => {
      const provider = new S3StorageProvider({ ...validConfig, bucket: undefined }, mockClient);

      await expect(provider.getSignedUrl('photo.jpg', 'pets')).rejects.toThrow(/misconfigured/);
    });
  });
});
