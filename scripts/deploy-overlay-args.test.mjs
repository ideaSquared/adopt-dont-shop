import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-overlay-args.sh');

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'deploy-overlay-args-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function runWithEnv(envContents) {
  writeFileSync(join(dir, '.env'), envContents);
  return execFileSync('bash', [SCRIPT], { cwd: dir, encoding: 'utf8' });
}

describe('deploy-overlay-args.sh', () => {
  it('prints no overlay args when both flags are off or absent', () => {
    expect(runWithEnv('POSTGRES_USER=ads\n')).toBe('');
  });

  it('adds the observability overlay when OBSERVABILITY_ENABLED=true', () => {
    expect(runWithEnv('OBSERVABILITY_ENABLED=true\n')).toBe(' -f docker-compose.observability.yml');
  });

  it('adds the glitchtip overlay when GLITCHTIP_ENABLED=true', () => {
    expect(runWithEnv('GLITCHTIP_ENABLED=true\n')).toBe(' -f docker-compose.glitchtip.yml');
  });

  it('adds both overlays when both flags are true', () => {
    const out = runWithEnv('OBSERVABILITY_ENABLED=true\nGLITCHTIP_ENABLED=true\n');
    expect(out).toBe(' -f docker-compose.observability.yml -f docker-compose.glitchtip.yml');
  });

  it('tolerates quotes, whitespace, and inline comments', () => {
    expect(runWithEnv('OBSERVABILITY_ENABLED="true"  # enabled for prod\n')).toBe(
      ' -f docker-compose.observability.yml'
    );
  });

  it('treats any non-"true" value as disabled', () => {
    expect(runWithEnv('OBSERVABILITY_ENABLED=false\n')).toBe('');
  });
});
