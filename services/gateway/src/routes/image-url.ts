// ADS-979 / ADS-930: image URLs previously accepted any string up to 2048
// chars, including `javascript:`/`data:` schemes. This mirrors assertValidDocumentUrl in
// services/applications/src/grpc/document-handlers.ts — a same-origin
// relative path (the local-storage dev/CI shape), or an https URL on the
// platform's own storage/CDN host. The host allowlist tracks the same env
// vars packages/storage's S3 provider uses to build public URLs.
function allowedImageHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const hosts = new Set<string>();
  const cloudFrontDomain = env.CLOUDFRONT_DOMAIN?.trim();
  if (cloudFrontDomain) {
    hosts.add(cloudFrontDomain);
  }
  const bucket = env.S3_BUCKET_NAME?.trim();
  if (bucket) {
    const region = env.S3_REGION?.trim() || 'us-east-1';
    hosts.add(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return hosts;
}

export const isSafeImageUrl = (value: string): boolean => {
  if (value === '') {
    return true;
  }
  // `//host/...` is protocol-relative — browsers resolve it off-origin, so
  // it's excluded from the same-origin relative-path allowance below.
  if (value.startsWith('/') && !value.startsWith('//')) {
    return true;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && allowedImageHosts().has(parsed.host);
};
