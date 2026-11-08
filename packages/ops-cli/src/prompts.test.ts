import { describe, expect, it, vi } from 'vitest';

const clackText = vi.fn();

vi.mock('@clack/prompts', () => ({
  text: (...args: unknown[]) => clackText(...args),
  isCancel: () => false,
  cancel: vi.fn(),
}));

const { createClackPrompts } = await import('./prompts.js');

describe('clack text prompt', () => {
  it('returns an empty string when the person submits an empty answer', async () => {
    // @clack/prompts resolves text() to undefined on an empty submit.
    clackText.mockResolvedValueOnce(undefined);

    const answer = await createClackPrompts().text({ message: 'rescueIdFilter (optional)' });

    expect(answer).toBe('');
  });

  it('returns what the person typed', async () => {
    clackText.mockResolvedValueOnce('abc');

    const answer = await createClackPrompts().text({ message: 'petId' });

    expect(answer).toBe('abc');
  });
});
