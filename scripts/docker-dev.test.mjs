import { describe, expect, it } from 'vitest';

import { resolveProfiles } from './docker-dev.mjs';

// resolveProfiles maps the requested `--profile` onto the real compose profiles
// `pnpm docker:dev` enables. The behaviour that matters to a developer booting
// the stack: the default is lean (no observability/nginx), a single frontend
// still drags the gateway in, and `full` is the escape hatch for everything.
describe('resolveProfiles', () => {
  it('expands the default `dev` profile to every app + service, without observability or nginx', () => {
    const profiles = resolveProfiles('dev');
    expect(profiles).toEqual(['client', 'admin', 'rescue', 'services']);
    // The observability/nginx-only profiles must NOT be pulled into the default.
    expect(profiles).not.toContain('full');
    expect(profiles).not.toContain('observability');
    expect(profiles).not.toContain('proxy');
  });

  it.each(['client', 'admin', 'rescue'])(
    'enables the `services` profile alongside a single frontend (%s) so /api does not 502',
    frontend => {
      expect(resolveProfiles(frontend)).toEqual([frontend, 'services']);
    }
  );

  it('passes `full` through untouched so it still starts observability + nginx', () => {
    expect(resolveProfiles('full')).toEqual(['full']);
  });

  it('passes any other profile through unchanged', () => {
    expect(resolveProfiles('observability')).toEqual(['observability']);
  });
});
