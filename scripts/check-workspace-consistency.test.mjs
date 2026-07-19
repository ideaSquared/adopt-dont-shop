import { describe, expect, it } from 'vitest';

import { computeExpectedDevVolumeMounts, parseDevVolumesAnchor } from './check-workspace-consistency.mjs';

describe('parseDevVolumesAnchor (ADS-987)', () => {
  it('extracts every mount target listed under the x-dev-volumes anchor', () => {
    const compose = [
      'x-dev-build: &dev-build',
      '  image: foo:latest',
      '',
      'x-dev-volumes: &dev-volumes',
      '  - .:/app',
      '  - /app/node_modules',
      '  - /app/apps/admin/node_modules',
      '  - /app/packages/lib.api/node_modules',
      '',
      'services:',
      '  app-admin:',
      '    volumes: *dev-volumes',
    ].join('\n');

    expect(parseDevVolumesAnchor(compose)).toEqual([
      '.:/app',
      '/app/node_modules',
      '/app/apps/admin/node_modules',
      '/app/packages/lib.api/node_modules',
    ]);
  });

  it('returns null when the anchor is missing', () => {
    expect(parseDevVolumesAnchor('services:\n  app-admin:\n    image: foo\n')).toBeNull();
  });
});

describe('computeExpectedDevVolumeMounts (ADS-987)', () => {
  it('builds one node_modules mount per app, e2e, package, and service, plus the root', () => {
    const mounts = computeExpectedDevVolumeMounts(
      ['app.admin', 'app.client'],
      ['lib.api', 'db'],
      ['gateway', 'auth']
    );

    expect(mounts).toEqual([
      '/app/node_modules',
      '/app/apps/admin/node_modules',
      '/app/apps/client/node_modules',
      '/app/e2e/node_modules',
      '/app/packages/lib.api/node_modules',
      '/app/packages/db/node_modules',
      '/app/services/gateway/node_modules',
      '/app/services/auth/node_modules',
    ]);
  });
});
