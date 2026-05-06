import {
  validateSortField,
  validateSortOrder,
  normaliseSortField,
} from '../../utils/sort-validation';
import { ApiError } from '../../middleware/error-handler';

describe('sort-validation', () => {
  describe('validateSortField', () => {
    const ALLOWED = ['createdAt', 'updatedAt'] as const;

    it('returns the field when it is in the allowlist', () => {
      expect(validateSortField('createdAt', ALLOWED, 'createdAt')).toBe('createdAt');
    });

    it('throws ApiError(400) when the field is not in the allowlist', () => {
      try {
        validateSortField('password', ALLOWED, 'createdAt');
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).statusCode).toBe(400);
      }
    });
  });

  describe('validateSortOrder', () => {
    it('accepts ASC and DESC (any case) and uppercases', () => {
      expect(validateSortOrder('ASC')).toBe('ASC');
      expect(validateSortOrder('asc')).toBe('ASC');
      expect(validateSortOrder('DESC')).toBe('DESC');
      expect(validateSortOrder('desc')).toBe('DESC');
    });

    it('returns DESC default when input is not a string', () => {
      expect(validateSortOrder(undefined)).toBe('DESC');
      expect(validateSortOrder(null)).toBe('DESC');
      expect(validateSortOrder(42)).toBe('DESC');
    });

    it('throws ApiError(400) on a non-ASC/DESC string (injection guard)', () => {
      try {
        validateSortOrder('ASC; DROP TABLE users');
        throw new Error('expected throw');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).statusCode).toBe(400);
      }
    });
  });

  describe('normaliseSortField', () => {
    const ALLOWED = ['a', 'b'] as const;
    it('returns the field when allowlisted', () => {
      expect(normaliseSortField('a', ALLOWED, 'b')).toBe('a');
    });
    it('returns default for undefined or unknown', () => {
      expect(normaliseSortField(undefined, ALLOWED, 'b')).toBe('b');
      expect(normaliseSortField('z', ALLOWED, 'b')).toBe('b');
    });
  });
});
