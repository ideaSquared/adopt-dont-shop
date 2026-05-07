/**
 * Behaviour tests for the timeout/abort handling in
 * companies-house.service.ts and charity-commission.service.ts.
 *
 * Drives the real services with `global.fetch` stubbed out so we can
 * simulate slow/never-resolving responses without hitting the network.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  loggerHelpers: { logBusiness: vi.fn(), logExternalService: vi.fn() },
}));

import { verifyCompaniesHouseNumber } from '../../services/companies-house.service';
import { verifyCharityRegistrationNumber } from '../../services/charity-commission.service';

const ORIGINAL_FETCH = global.fetch;

beforeEach(() => {
  process.env.COMPANIES_HOUSE_API_KEY = 'test-ch-key';
  process.env.CHARITY_COMMISSION_API_KEY = 'test-cc-key';
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  delete process.env.COMPANIES_HOUSE_API_KEY;
  delete process.env.CHARITY_COMMISSION_API_KEY;
});

describe('verifyCompaniesHouseNumber timeout handling', () => {
  it('returns a structured timeout result when fetch never resolves', async () => {
    // fetch that respects the abort signal but otherwise never resolves
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = opts?.signal;
        signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const start = Date.now();
    const result = await verifyCompaniesHouseNumber('00000001');
    const elapsed = Date.now() - start;

    expect(result).toEqual({ verified: false, reason: 'Companies House API timeout' });
    // The total budget is 7s; the per-request timeout is 5s. Either way we
    // must NOT exceed the total budget by more than a small skew.
    expect(elapsed).toBeLessThan(8_000);
  }, 10_000);

  it('does not retry on transport errors (only on 429)', async () => {
    let calls = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      calls += 1;
      return Promise.reject(new Error('ECONNREFUSED'));
    }) as unknown as typeof fetch;

    const result = await verifyCompaniesHouseNumber('00000001');
    expect(result.verified).toBe(false);
    expect(calls).toBe(1);
  });

  it('returns "API key not configured" when env var missing', async () => {
    delete process.env.COMPANIES_HOUSE_API_KEY;
    const result = await verifyCompaniesHouseNumber('00000001');
    expect(result).toEqual({
      verified: false,
      reason: 'Companies House API key not configured',
    });
  });
});

describe('verifyCharityRegistrationNumber timeout handling', () => {
  it('returns a structured timeout result when fetch never resolves', async () => {
    global.fetch = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = opts?.signal;
        signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as typeof fetch;

    const start = Date.now();
    const result = await verifyCharityRegistrationNumber('1234567');
    const elapsed = Date.now() - start;

    expect(result).toEqual({ verified: false, reason: 'Charity Commission API timeout' });
    expect(elapsed).toBeLessThan(8_000);
  }, 10_000);

  it('returns "API key not configured" when env var missing', async () => {
    delete process.env.CHARITY_COMMISSION_API_KEY;
    const result = await verifyCharityRegistrationNumber('1234567');
    expect(result).toEqual({
      verified: false,
      reason: 'Charity Commission API key not configured',
    });
  });
});
