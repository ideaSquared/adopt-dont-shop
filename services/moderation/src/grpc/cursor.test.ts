import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';

describe('cursor', () => {
  it('round-trips a (createdAt, id) tuple', () => {
    const original = {
      createdAt: '2026-06-01T00:00:00.000Z',
      id: '11111111-1111-1111-1111-111111111111',
    };
    expect(decodeCursor(encodeCursor(original))).toEqual(original);
  });

  it('rejects malformed base64url', () => {
    expect(() => decodeCursor('!!! not base64 !!!')).toThrowError(InvalidCursorError);
  });

  it('rejects valid base64 that does not decode to JSON', () => {
    const garbage = Buffer.from('not-json', 'utf8').toString('base64url');
    expect(() => decodeCursor(garbage)).toThrowError(InvalidCursorError);
  });

  it('rejects JSON missing required fields', () => {
    const partial = Buffer.from(JSON.stringify({ createdAt: '2026-06-01' }), 'utf8').toString(
      'base64url'
    );
    expect(() => decodeCursor(partial)).toThrowError(InvalidCursorError);
  });

  it('rejects JSON with wrong field types', () => {
    const wrong = Buffer.from(JSON.stringify({ createdAt: 1, id: 2 }), 'utf8').toString(
      'base64url'
    );
    expect(() => decodeCursor(wrong)).toThrowError(InvalidCursorError);
  });
});
