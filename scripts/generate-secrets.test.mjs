import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regression test for ADS-1232: importing this module must not print
// anything — only running it directly (`pnpm secrets:generate`) should.
// vi.resetModules() forces vitest to re-evaluate the module's top-level code
// on the next import, the same way bootstrap.mjs's static import does on a
// fresh process.
describe('generate-secrets.mjs import side effects', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('produces no stdout output when imported', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await import('./generate-secrets.mjs');

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('still exports SECRET_KEYS, generateSecret and generateSecretsBlock with no side effect', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const mod = await import('./generate-secrets.mjs');

    expect(mod.SECRET_KEYS).toContain('JWT_SECRET');
    expect(typeof mod.generateSecret).toBe('function');
    expect(typeof mod.generateSecretsBlock).toBe('function');
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
