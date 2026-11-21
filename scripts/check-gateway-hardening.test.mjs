import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findHardeningGaps } from './check-gateway-hardening.mjs';

describe('the real edge gateway compose file', () => {
  it('has no hardening gaps', () => {
    expect(findHardeningGaps()).toEqual([]);
  });
});

describe('findHardeningGaps', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'gateway-hardening-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const hardenedNginx = [
    '  nginx:',
    '    read_only: true',
    '    tmpfs:',
    '      - /var/cache/nginx',
    '      - /var/run',
  ];
  const hardenedCertbot = [
    '  certbot:',
    '    cap_drop:',
    '      - ALL',
    '    security_opt:',
    '      - no-new-privileges:true',
  ];

  const check = (nginx, certbot) => {
    writeFileSync(
      join(root, 'c.yml'),
      ['services:', ...nginx, ...certbot, 'volumes:', ''].join('\n')
    );
    return findHardeningGaps('c.yml', root);
  };

  it('passes when both services are hardened', () => {
    expect(check(hardenedNginx, hardenedCertbot)).toEqual([]);
  });

  it('flags an nginx without a read-only rootfs', () => {
    expect(
      check(
        hardenedNginx.filter(l => !l.includes('read_only')),
        hardenedCertbot
      )
    ).toEqual(['nginx: read_only: true is missing']);
  });

  it('flags missing nginx tmpfs mounts', () => {
    expect(check([...hardenedNginx.slice(0, 2)], hardenedCertbot)).toEqual([
      'nginx: tmpfs /var/cache/nginx is missing',
      'nginx: tmpfs /var/run is missing',
    ]);
  });

  it('flags a tmpfs over the nginx log directory', () => {
    expect(check([...hardenedNginx, '      - /var/log/nginx'], hardenedCertbot)).toEqual([
      'nginx: /var/log/nginx must not be a tmpfs (hides the stdout log symlinks)',
    ]);
  });

  it('flags an unconfined certbot', () => {
    expect(check(hardenedNginx, ['  certbot:', '    restart: unless-stopped'])).toEqual([
      'certbot: cap_drop ALL is missing',
      'certbot: no-new-privileges:true is missing',
    ]);
  });
});
