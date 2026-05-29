import { afterEach, describe, expect, it, vi } from 'vitest';
import { logFormatError } from './log';

describe('logFormatError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('logs the message and error outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const err = new Error('boom');
    logFormatError('Error formatting date:', err);

    expect(spy).toHaveBeenCalledWith('Error formatting date:', err);
  });

  it('stays silent in production so bad server values do not flood logs', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logFormatError('Error formatting currency:', new Error('boom'));

    expect(spy).not.toHaveBeenCalled();
  });
});
