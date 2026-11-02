// Which image URLs the platform will store and render. Photo URLs end up in
// every viewer's browser, so an arbitrary host would leak viewers' IP
// addresses (ADS-1343). Same-origin upload paths are always fine; https URLs
// only when the host is the platform's own storage (CloudFront domain or the
// S3 bucket host). Shared so the write boundary (service.pets) and the read
// boundary (service.matching) enforce the exact same rule.

export function allowedImageHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
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

export function isSafeImageUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
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
  return parsed.protocol === 'https:' && allowedImageHosts(env).has(parsed.host);
}
