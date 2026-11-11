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

// WHATWG URL parsing strips tab/LF/CR anywhere in the input and treats `\` as
// `/` for https, so a string that starts with a single `/` can still resolve
// off-origin. Every case below is checked against the real parser too.
describe('isSafeImageUrl bypass resistance', () => {
  const configured = env({ CLOUDFRONT_DOMAIN: 'cdn.example.com' });
  const appOrigin = 'https://app.example';

  const rejected: ReadonlyArray<readonly [string, string]> = [
    ['backslash after slash', '/\\evil.example/a.png'],
    ['double backslash', '/\\\\evil.example'],
    ['tab between slashes', '/\t/evil.example'],
    ['newline between slashes', '/\n/evil.example'],
    ['carriage return between slashes', '/\r/evil.example'],
    ['tab then backslash', '/\t\\evil.example'],
    ['NUL byte', '/\u0000/evil.example'],
    ['DEL byte', '/\u007f/x'],
    ['leading backslash', '\\evil.example/a.png'],
    ['leading backslash-slash', '\\/evil.example/a.png'],
    ['protocol-relative', '//evil.example/a.png'],
    ['userinfo pointing off-host', 'https://cdn.example.com@evil.example/a.png'],
    ['userinfo, unrelated host', 'https://good.example@evil.example/'],
    ['backslash inside absolute url', 'https://cdn.example.com\\@evil.example/a.png'],
    ['single-slash https', 'https:/\\evil.example'],
    ['http scheme', 'http://cdn.example.com/a.jpg'],
    ['non-default port', 'https://cdn.example.com:8443/a.jpg'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:image/png;base64,AAAA'],
    ['bare relative', 'a.jpg'],
    ['empty', ''],
  ];

  const accepted: ReadonlyArray<readonly [string, string]> = [
    ['upload path', '/uploads/pets/a.jpg'],
    ['percent-encoded backslash (parser does not decode it)', '/%5Cevil.example/a.png'],
    ['dot-dot stays on origin', '/../uploads/a.png'],
    ['double slash after dot-dot stays a path', '/..//evil.example/a.png'],
    ['space in path', '/uploads/a b.jpg'],
    ['allowed host', 'https://cdn.example.com/a.jpg'],
    ['allowed host, mixed case', 'HTTPS://CDN.Example.com/a.jpg'],
    ['allowed host, explicit default port', 'https://cdn.example.com:443/a.jpg'],
  ];

  it.each(rejected)('rejects %s', (_label, candidate) => {
    expect(isSafeImageUrl(candidate, configured)).toBe(false);
  });

  it.each(accepted)('accepts %s', (_label, candidate) => {
    expect(isSafeImageUrl(candidate, configured)).toBe(true);
  });

  it('never accepts a path that resolves to another origin', () => {
    const offOrigin = [...rejected, ...accepted]
      .map(([, candidate]) => candidate)
      .filter(candidate => {
        try {
          return new URL(candidate, appOrigin).origin !== appOrigin;
        } catch {
          return false;
        }
      })
      .filter(candidate => !candidate.startsWith('http') && !candidate.startsWith('HTTP'));
    expect(offOrigin.length).toBeGreaterThan(0);
    offOrigin.forEach(candidate => expect(isSafeImageUrl(candidate, configured)).toBe(false));
  });
});
