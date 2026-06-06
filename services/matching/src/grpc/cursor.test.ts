import { describe, expect, it } from 'vitest';

import {
  decodeSearchPetsCursor,
  decodeSwipeHistoryCursor,
  encodeSearchPetsCursor,
  encodeSwipeHistoryCursor,
  InvalidCursorError,
} from './cursor.js';

describe('SwipeHistoryCursor', () => {
  it('round-trips a (timestamp, swipeActionId) tuple', () => {
    const original = {
      timestamp: '2026-06-01T00:00:00.000Z',
      swipeActionId: '11111111-1111-1111-1111-111111111111',
    };
    expect(decodeSwipeHistoryCursor(encodeSwipeHistoryCursor(original))).toEqual(original);
  });

  it('rejects malformed base64', () => {
    expect(() => decodeSwipeHistoryCursor('!!!')).toThrowError(InvalidCursorError);
  });

  it('rejects valid base64 that is not JSON', () => {
    const garbage = Buffer.from('not-json', 'utf8').toString('base64url');
    expect(() => decodeSwipeHistoryCursor(garbage)).toThrowError(InvalidCursorError);
  });

  it('rejects JSON missing required fields', () => {
    const partial = Buffer.from(JSON.stringify({ timestamp: 'x' }), 'utf8').toString('base64url');
    expect(() => decodeSwipeHistoryCursor(partial)).toThrowError(InvalidCursorError);
  });
});

describe('SearchPetsCursor', () => {
  it('round-trips a (score, petId) tuple', () => {
    const original = {
      score: 0.87,
      petId: '22222222-2222-2222-2222-222222222222',
    };
    expect(decodeSearchPetsCursor(encodeSearchPetsCursor(original))).toEqual(original);
  });

  it('rejects JSON with wrong field types', () => {
    const wrong = Buffer.from(JSON.stringify({ score: '0.5', petId: 1 }), 'utf8').toString(
      'base64url'
    );
    expect(() => decodeSearchPetsCursor(wrong)).toThrowError(InvalidCursorError);
  });

  it('rejects JSON missing required fields', () => {
    const partial = Buffer.from(JSON.stringify({ score: 0.5 }), 'utf8').toString('base64url');
    expect(() => decodeSearchPetsCursor(partial)).toThrowError(InvalidCursorError);
  });
});
