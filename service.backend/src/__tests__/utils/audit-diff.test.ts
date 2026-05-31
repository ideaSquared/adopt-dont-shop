import { describe, expect, it } from 'vitest';
import { diffSequelize } from '../../utils/audit-diff';

/**
 * The diff helper only consults Sequelize's `changed()` / `_previousDataValues`
 * shape. We don't need a real Model — a lightweight stand-in with the same
 * shape is sufficient and keeps the test free of DB setup.
 */
type FakeModel = {
  changed: () => string[] | false;
  _previousDataValues: Record<string, unknown>;
  dataValues: Record<string, unknown>;
};

const makeModel = (
  changedFields: string[] | false,
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): FakeModel => ({
  changed: () => changedFields,
  _previousDataValues: previous,
  dataValues: next,
});

describe('diffSequelize', () => {
  it('returns null when nothing changed', () => {
    const model = makeModel(false, { email: 'a@x.test' }, { email: 'a@x.test' });
    expect(diffSequelize(model as never, ['email'])).toBeNull();
  });

  it('returns null when changed array is empty', () => {
    const model = makeModel([], { email: 'a@x.test' }, { email: 'a@x.test' });
    expect(diffSequelize(model as never, ['email'])).toBeNull();
  });

  it('returns before/after pairs for allowlisted changed fields', () => {
    const model = makeModel(
      ['email', 'phone'],
      { email: 'old@x.test', phone: '111' },
      { email: 'new@x.test', phone: '222' }
    );
    const diff = diffSequelize(model as never, ['email', 'phone']);
    expect(diff).toEqual({
      email: { before: 'old@x.test', after: 'new@x.test' },
      phone: { before: '111', after: '222' },
    });
  });

  it('skips changed fields not on the allowlist', () => {
    const model = makeModel(
      ['email', 'lastLoginAt'],
      { email: 'old@x.test', lastLoginAt: new Date('2024-01-01') },
      { email: 'new@x.test', lastLoginAt: new Date('2024-02-01') }
    );
    const diff = diffSequelize(model as never, ['email']);
    expect(diff).toEqual({
      email: { before: 'old@x.test', after: 'new@x.test' },
    });
    expect(diff && 'lastLoginAt' in diff).toBe(false);
  });

  it('serialises Date instances to ISO strings', () => {
    const model = makeModel(
      ['publishedAt'],
      { publishedAt: new Date('2024-01-01T00:00:00.000Z') },
      { publishedAt: new Date('2024-06-15T12:00:00.000Z') }
    );
    const diff = diffSequelize(model as never, ['publishedAt']);
    expect(diff).toEqual({
      publishedAt: { before: '2024-01-01T00:00:00.000Z', after: '2024-06-15T12:00:00.000Z' },
    });
  });

  it('returns null when changed fields exist but none are on the allowlist', () => {
    const model = makeModel(['internalCounter'], { internalCounter: 1 }, { internalCounter: 2 });
    expect(diffSequelize(model as never, ['email'])).toBeNull();
  });

  it('handles null previous values', () => {
    const model = makeModel(['phone'], { phone: null }, { phone: '555-0100' });
    expect(diffSequelize(model as never, ['phone'])).toEqual({
      phone: { before: null, after: '555-0100' },
    });
  });

  it('returns null when given a non-model object', () => {
    expect(diffSequelize({} as never, ['email'])).toBeNull();
  });
});
