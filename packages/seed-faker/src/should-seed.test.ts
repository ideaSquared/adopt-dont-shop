import { afterEach, describe, expect, it, vi } from 'vitest';

import { seedOnlyIfEmpty, shouldSeed } from './should-seed.js';

afterEach(() => vi.unstubAllEnvs());

describe('seedOnlyIfEmpty', () => {
  it('is true only when SEED_ONLY_IF_EMPTY is exactly "true"', () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    expect(seedOnlyIfEmpty()).toBe(true);
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '1');
    expect(seedOnlyIfEmpty()).toBe(false);
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '');
    expect(seedOnlyIfEmpty()).toBe(false);
  });
});

describe('shouldSeed', () => {
  it('always seeds (without probing) when the flag is unset — the manual command', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', '');
    const anchor = vi.fn(async () => true);

    await expect(shouldSeed(anchor)).resolves.toBe(true);
    // The manual path must not even probe — it always (re)populates.
    expect(anchor).not.toHaveBeenCalled();
  });

  it('skips on boot when the anchor row already exists (existing db)', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    await expect(shouldSeed(async () => true)).resolves.toBe(false);
  });

  it('seeds on boot when the anchor row is absent (fresh db)', async () => {
    vi.stubEnv('SEED_ONLY_IF_EMPTY', 'true');
    await expect(shouldSeed(async () => false)).resolves.toBe(true);
  });
});
