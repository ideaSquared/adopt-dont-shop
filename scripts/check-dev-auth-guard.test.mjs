import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findDevAuthHits } from './check-dev-auth-guard.mjs';

describe('findDevAuthHits', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'check-dev-auth-guard-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('finds nothing when no app or lib.* source exists', () => {
    expect(findDevAuthHits(root)).toEqual([]);
  });

  it('flags dev_user in an app production file', () => {
    mkdirSync(join(root, 'apps', 'client', 'src'), { recursive: true });
    writeFileSync(join(root, 'apps', 'client', 'src', 'auth.ts'), 'const user = dev_user;\n');

    expect(findDevAuthHits(root)).toEqual([
      { file: 'apps/client/src/auth.ts', line: 1, text: 'const user = dev_user;' },
    ]);
  });

  it('flags dev-token- in a lib.* production file', () => {
    mkdirSync(join(root, 'packages', 'lib.auth', 'src'), { recursive: true });
    writeFileSync(
      join(root, 'packages', 'lib.auth', 'src', 'token.ts'),
      "const t = 'dev-token-abc';\n"
    );

    expect(findDevAuthHits(root)).toEqual([
      { file: 'packages/lib.auth/src/token.ts', line: 1, text: "const t = 'dev-token-abc';" },
    ]);
  });

  it('ignores non-lib.* packages', () => {
    mkdirSync(join(root, 'packages', 'db', 'src'), { recursive: true });
    writeFileSync(join(root, 'packages', 'db', 'src', 'x.ts'), 'dev_user\n');

    expect(findDevAuthHits(root)).toEqual([]);
  });

  it('ignores test files', () => {
    mkdirSync(join(root, 'apps', 'client', 'src'), { recursive: true });
    writeFileSync(join(root, 'apps', 'client', 'src', 'auth.test.ts'), 'dev_user\n');

    expect(findDevAuthHits(root)).toEqual([]);
  });

  it('ignores the allowed DEV-gated locations', () => {
    mkdirSync(join(root, 'apps', 'client', 'src', 'components', 'dev'), { recursive: true });
    mkdirSync(join(root, 'apps', 'client', 'src', 'utils'), { recursive: true });
    mkdirSync(join(root, 'apps', 'client', 'src', 'contexts', 'base'), { recursive: true });
    mkdirSync(join(root, 'packages', 'lib.auth', 'src', 'contexts'), { recursive: true });

    writeFileSync(
      join(root, 'apps', 'client', 'src', 'components', 'dev', 'panel.tsx'),
      'dev_user\n'
    );
    writeFileSync(join(root, 'apps', 'client', 'src', 'utils', 'devAuth.ts'), 'dev_user\n');
    writeFileSync(
      join(root, 'apps', 'client', 'src', 'contexts', 'base', 'devUtils.ts'),
      'dev_user\n'
    );
    writeFileSync(
      join(root, 'packages', 'lib.auth', 'src', 'contexts', 'AuthContext.tsx'),
      'dev_user\n'
    );

    expect(findDevAuthHits(root)).toEqual([]);
  });
});
