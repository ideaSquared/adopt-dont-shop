import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSafeImageUrl } from './image-url.js';

describe('isSafeImageUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts an empty string and same-origin relative paths', () => {
    expect(isSafeImageUrl('')).toBe(true);
    expect(isSafeImageUrl('/uploads/pets/a.jpg')).toBe(true);
  });

  it('rejects protocol-relative, javascript: and data: URLs', () => {
    expect(isSafeImageUrl('//evil.example/a.jpg')).toBe(false);
    expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeImageUrl('data:image/png;base64,AAAA')).toBe(false);
  });

  it('accepts https URLs only on the configured platform hosts', () => {
    vi.stubEnv('CLOUDFRONT_DOMAIN', 'cdn.example.com');
    vi.stubEnv('S3_BUCKET_NAME', 'bucket');
    vi.stubEnv('S3_REGION', 'eu-west-2');

    expect(isSafeImageUrl('https://cdn.example.com/a.jpg')).toBe(true);
    expect(isSafeImageUrl('https://bucket.s3.eu-west-2.amazonaws.com/a.jpg')).toBe(true);
    expect(isSafeImageUrl('https://other.example.com/a.jpg')).toBe(false);
    expect(isSafeImageUrl('http://cdn.example.com/a.jpg')).toBe(false);
  });
});
