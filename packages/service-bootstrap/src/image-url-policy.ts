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

// Browsers parse with the WHATWG URL algorithm: it drops ASCII tab/LF/CR from
// anywhere in the input and treats `\` as `/` for https. So `/\evil.example`
// or `/<TAB>/evil.example` start with a single `/` yet resolve off-origin.
// Control characters and backslashes have no place in an image URL; reject them
// outright, then decide relative paths by actually resolving them.
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f\\]/;
const PLACEHOLDER_ORIGIN = 'https://placeholder.invalid';

const isSameOriginPath = (value: string): boolean => {
  if (!value.startsWith('/')) {
    return false;
  }
  try {
    return new URL(value, PLACEHOLDER_ORIGIN).origin === PLACEHOLDER_ORIGIN;
  } catch {
    return false;
  }
};

export function isSafeImageUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (UNSAFE_CHARACTERS.test(value)) {
    return false;
  }
  if (isSameOriginPath(value)) {
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
