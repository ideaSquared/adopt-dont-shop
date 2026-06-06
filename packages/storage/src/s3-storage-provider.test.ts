import { afterEach, describe, expect, it, vi } from 'vitest';
import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageProvider } from './s3-storage-provider.js';
import type { S3StorageConfig } from './config.js';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example/object?sig=abc'),
}));

const fullConfig: S3StorageConfig = {
  bucket: 'my-bucket',
  region: 'eu-west-2',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
};

type FakeClient = { send: ReturnType<typeof vi.fn> };

const makeClient = (): FakeClient => ({ send: vi.fn(async () => ({})) });

// The provider only depends on S3Client's `send`; a stub satisfies the contract
// without an `any` cast at the call site.
const asClient = (client: FakeClient): S3Client => client as unknown as S3Client;

afterEach(() => {
  vi.clearAllMocks();
});

describe('S3StorageProvider', () => {
  it('issues a PutObject and returns the S3 URL on upload', async () => {
    const client = makeClient();
    const provider = new S3StorageProvider(fullConfig, undefined, asClient(client));

    const result = await provider.uploadFile(
      Buffer.from('bytes'),
      'photo.jpg',
      'image/jpeg',
      'pets'
    );

    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input.Bucket).toBe('my-bucket');
    expect(command.input.Key).toBe(`pets/${result.filename}`);
    expect(command.input.ServerSideEncryption).toBe('AES256');
    expect(result.url).toBe(`https://my-bucket.s3.eu-west-2.amazonaws.com/pets/${result.filename}`);
    expect(result.size).toBe(5);
  });

  it('returns a CloudFront URL when a domain is configured', async () => {
    const client = makeClient();
    const provider = new S3StorageProvider(
      { ...fullConfig, cloudFrontDomain: 'cdn.example.com' },
      undefined,
      asClient(client)
    );

    const result = await provider.uploadFile(
      Buffer.from('x'),
      'doc.pdf',
      'application/pdf',
      'documents'
    );

    expect(result.url).toBe(`https://cdn.example.com/documents/${result.filename}`);
  });

  it('mints a signed url via the presigner', async () => {
    const client = makeClient();
    const provider = new S3StorageProvider(fullConfig, undefined, asClient(client));

    const url = await provider.getSignedUrl('file.jpg', 'pets', 120);

    expect(url).toBe('https://signed.example/object?sig=abc');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 120,
    });
  });

  it('identifies itself and supports signed urls', () => {
    const provider = new S3StorageProvider(fullConfig, undefined, asClient(makeClient()));
    expect(provider.getName()).toBe('s3');
    expect(provider.supportsSignedUrls()).toBe(true);
    expect(provider.validateConfiguration()).toBe(true);
  });

  it('reports misconfiguration and throws when used without full credentials', async () => {
    const provider = new S3StorageProvider(
      { bucket: 'only-bucket' },
      undefined,
      asClient(makeClient())
    );
    expect(provider.validateConfiguration()).toBe(false);
    await expect(
      provider.uploadFile(Buffer.from('x'), 'a.jpg', 'image/jpeg', 'pets')
    ).rejects.toThrow(/misconfigured/);
  });
});
