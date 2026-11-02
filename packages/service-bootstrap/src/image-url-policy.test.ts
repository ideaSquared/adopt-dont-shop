import { describe, expect, it } from 'vitest';

import { allowedImageHosts, isSafeImageUrl } from './image-url-policy.js';

const env = (vars: Record<string, string>): NodeJS.ProcessEnv => vars;

describe('allowedImageHosts', () => {
  it('is empty when no storage host is configured', () => {
    expect(allowedImageHosts(env({}))).toEqual(new Set());
  });

  it('allows the CloudFront domain and the S3 bucket host', () => {
    expect(
      allowedImageHosts(
        env({
          CLOUDFRONT_DOMAIN: ' d1.cloudfront.net ',
          S3_BUCKET_NAME: 'b',
          S3_REGION: 'eu-west-2',
        })
      )
    ).toEqual(new Set(['d1.cloudfront.net', 'b.s3.eu-west-2.amazonaws.com']));
  });

  it('defaults the S3 region to us-east-1', () => {
    expect(allowedImageHosts(env({ S3_BUCKET_NAME: 'b' }))).toEqual(
      new Set(['b.s3.us-east-1.amazonaws.com'])
    );
  });
});

describe('isSafeImageUrl', () => {
  const configured = env({ CLOUDFRONT_DOMAIN: 'cdn.example.com' });

  it('accepts same-origin upload paths', () => {
    expect(isSafeImageUrl('/uploads/pets/a.jpg', env({}))).toBe(true);
  });

  it('accepts https urls on an allowed host', () => {
    expect(isSafeImageUrl('https://cdn.example.com/a.jpg', configured)).toBe(true);
  });

  it('rejects https urls on any other host, or when no host is configured', () => {
    expect(isSafeImageUrl('https://evil.example.com/a.jpg', configured)).toBe(false);
    expect(isSafeImageUrl('https://cdn.example.com/a.jpg', env({}))).toBe(false);
  });

  it('rejects non-https schemes, protocol-relative urls and garbage', () => {
    expect(isSafeImageUrl('http://cdn.example.com/a.jpg', configured)).toBe(false);
    expect(isSafeImageUrl('//cdn.example.com/a.jpg', configured)).toBe(false);
    expect(isSafeImageUrl('javascript:alert(1)', configured)).toBe(false);
    expect(isSafeImageUrl('a.jpg', configured)).toBe(false);
    expect(isSafeImageUrl('', configured)).toBe(false);
  });
});
