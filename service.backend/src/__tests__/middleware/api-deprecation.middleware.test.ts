import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { deprecate } from '../../middleware/api-deprecation';

describe('deprecate middleware (ADS-515)', () => {
  it('sets Deprecation and Sunset headers and forwards', () => {
    const sunset = new Date('2027-01-01T00:00:00Z').toUTCString();
    const middleware = deprecate({ sunset });
    const setHeader = vi.fn();
    const next: NextFunction = vi.fn();

    middleware({} as Request, { setHeader } as unknown as Response, next);

    expect(setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    expect(setHeader).toHaveBeenCalledWith('Sunset', sunset);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('emits an optional Link header when documentation URL provided', () => {
    const sunset = new Date('2027-01-01T00:00:00Z').toUTCString();
    const middleware = deprecate({ sunset, link: 'https://docs.example.com/v2-migration' });
    const setHeader = vi.fn();
    const next: NextFunction = vi.fn();

    middleware({} as Request, { setHeader } as unknown as Response, next);

    expect(setHeader).toHaveBeenCalledWith(
      'Link',
      '<https://docs.example.com/v2-migration>; rel="deprecation"'
    );
  });
});
