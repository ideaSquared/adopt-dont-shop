import { spawnSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

// `import.meta.url === \`file://${process.argv[1]}\`` never matches on Windows
// (backslashes, drive letter, file:/// prefix), so a script guarded that way
// silently skips main() and exits 0. `pnpm tasks:write` wrote nothing and
// `pnpm dev:services` never wrote the Redis secret. Use pathToFileURL instead.
describe('script entry-point guards', () => {
  it('run main() when a script is executed directly', () => {
    const result = spawnSync(
      process.execPath,
      [join(SCRIPTS, 'generate-task-index.mjs'), '--print'],
      {
        encoding: 'utf8',
      }
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('build:libs');
  });

  it('never compare import.meta.url against a hand-built file:// string', () => {
    const naive = readdirSync(SCRIPTS)
      .filter(f => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))
      .filter(f =>
        readFileSync(join(SCRIPTS, f), 'utf8').includes('=== `file://${process.argv[1]}`')
      );
    expect(naive).toEqual([]);
  });
});
