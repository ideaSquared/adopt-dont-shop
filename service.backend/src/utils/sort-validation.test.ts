import { describe, it, expect } from 'vitest';
import { validateSortField, normaliseSortField } from './sort-validation';
import { ApiError } from '../middleware/error-handler';

const ALLOWED = ['createdAt', 'updatedAt', 'status'] as const;
const DEFAULT = 'createdAt';

describe('validateSortField - blocking SQL ORDER BY injection', () => {
  it('returns the field when it is in the allowlist', () => {
    expect(validateSortField('status', ALLOWED, DEFAULT)).toBe('status');
  });

  it('returns the default field when given the default', () => {
    expect(validateSortField('createdAt', ALLOWED, DEFAULT)).toBe('createdAt');
  });

  it('throws ApiError(400) for a field not in the allowlist', () => {
    expect(() => validateSortField('password', ALLOWED, DEFAULT)).toThrow(ApiError);
  });

  it('throws with HTTP 400 status for an invalid field', () => {
    try {
      validateSortField('(SELECT 1)', ALLOWED, DEFAULT);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(400);
    }
  });

  it('rejects SQL injection payloads', () => {
    const injectionAttempts = [
      '(SELECT password FROM users LIMIT 1)',
      "'; DROP TABLE users; --",
      '1=1',
      'createdAt; DROP TABLE users',
    ];
    for (const attempt of injectionAttempts) {
      expect(() => validateSortField(attempt, ALLOWED, DEFAULT)).toThrow(ApiError);
    }
  });

  it('is case-sensitive — rejects fields that differ only in case', () => {
    expect(() => validateSortField('CREATEDAT', ALLOWED, DEFAULT)).toThrow(ApiError);
    expect(() => validateSortField('CreatedAt', ALLOWED, DEFAULT)).toThrow(ApiError);
  });
});

describe('normaliseSortField - silently falling back to safe default', () => {
  it('returns the field when it is in the allowlist', () => {
    expect(normaliseSortField('updatedAt', ALLOWED, DEFAULT)).toBe('updatedAt');
  });

  it('returns the default when field is undefined', () => {
    expect(normaliseSortField(undefined, ALLOWED, DEFAULT)).toBe(DEFAULT);
  });

  it('returns the default when field is not in the allowlist', () => {
    expect(normaliseSortField('password', ALLOWED, DEFAULT)).toBe(DEFAULT);
  });

  it('returns the default for SQL injection payloads instead of throwing', () => {
    expect(normaliseSortField('(SELECT 1)', ALLOWED, DEFAULT)).toBe(DEFAULT);
  });

  it('returns the default for empty string', () => {
    expect(normaliseSortField('', ALLOWED, DEFAULT)).toBe(DEFAULT);
  });
});
