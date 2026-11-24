import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMMITLINT = join(REPO_ROOT, 'node_modules', '.bin', 'commitlint');

// Runs the repo's real commitlint config over one message, the way CI does.
const lintMessage = message => {
  const result = spawnSync(COMMITLINT, [], { cwd: REPO_ROOT, input: message, encoding: 'utf8' });
  return { valid: result.status === 0, output: `${result.stdout}${result.stderr}` };
};

const DEPENDABOT_BODY = [
  'Bumps [sanitize-html](https://github.com/apostrophecms/apostrophe/tree/HEAD/packages/sanitize-html) from 2.18.0 to 2.18.1.',
  '- [Changelog](https://github.com/apostrophecms/apostrophe/blob/main/packages/sanitize-html/CHANGELOG.md)',
  '',
  '---',
  'updated-dependencies:',
  '- dependency-name: sanitize-html',
  '...',
  '',
  'Signed-off-by: dependabot[bot] <support@github.com>',
].join('\n');

describe('commitlint config', () => {
  it('accepts a Dependabot bump commit signed off by the Dependabot bot', () => {
    const result = lintMessage(
      `chore(deps): Bump sanitize-html from 2.18.0 to 2.18.1\n\n${DEPENDABOT_BODY}`
    );
    expect(result.valid).toBe(true);
  });

  it('accepts a sentence-case Dependabot group bump signed off by the Dependabot bot', () => {
    const result = lintMessage(
      `chore(deps): Bump the minor-and-patch group across 1 directory with 10 updates\n\n${DEPENDABOT_BODY}`
    );
    expect(result.valid).toBe(true);
  });

  it('accepts a lowercase Dependabot group bump signed off by the Dependabot bot', () => {
    const result = lintMessage(
      `chore(deps): bump the minor-and-patch group with 3 updates\n\n${DEPENDABOT_BODY}`
    );
    expect(result.valid).toBe(true);
  });

  it('accepts a lowercase Dependabot single bump signed off by the Dependabot bot', () => {
    const result = lintMessage(
      `chore(deps): bump sanitize-html from 2.18.0 to 2.18.1\n\n${DEPENDABOT_BODY}`
    );
    expect(result.valid).toBe(true);
  });

  it('still rejects a sentence-case bump subject without the Dependabot sign-off', () => {
    const result = lintMessage('build(deps): Bump fastify from 5.12.5 to 5.12.6');
    expect(result.valid).toBe(false);
    expect(result.output).toContain('subject-case');
  });

  it('still rejects a non-bump commit that carries the Dependabot sign-off', () => {
    const result = lintMessage(
      'fix: Something Broke\n\nSigned-off-by: dependabot[bot] <support@github.com>'
    );
    expect(result.valid).toBe(false);
  });

  it('accepts an ordinary conventional commit', () => {
    const result = lintMessage('fix(gateway): reject blank tokens (ADS-1255)');
    expect(result.valid).toBe(true);
  });
});
