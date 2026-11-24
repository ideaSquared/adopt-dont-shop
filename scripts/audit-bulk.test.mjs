import { describe, it, expect } from 'vitest';

import { parseLockfilePackages } from './audit-bulk.mjs';

const LOCKFILE = `---
lockfileVersion: '9.0'

packages:

  '@pnpm/exe.linux-x64@12.22.0':
    resolution: {integrity: sha512-aaa}

---
lockfileVersion: '9.0'

importers:

  .: {}

packages:

  '@scope/name@1.2.3':
    resolution: {integrity: sha512-bbb}

  lodash@4.17.21:
    resolution: {integrity: sha512-ccc}

snapshots:

  lodash@4.17.21: {}
`;

describe('parseLockfilePackages', () => {
  it('reads the packages section of every lockfile document', () => {
    const byName = parseLockfilePackages(LOCKFILE);
    expect([...byName.get('@pnpm/exe.linux-x64')]).toEqual(['12.22.0']);
    expect([...byName.get('@scope/name')]).toEqual(['1.2.3']);
    expect([...byName.get('lodash')]).toEqual(['4.17.21']);
  });
});
