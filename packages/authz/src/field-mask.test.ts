import { describe, expect, it } from 'vitest';

import { fieldMask } from './field-mask.js';

describe('fieldMask', () => {
  it('keeps fields at read or write access', () => {
    const result = fieldMask(
      { name: 'Pawsome', internalNote: 'flagged' },
      { name: 'read', internalNote: 'read' }
    );
    expect(result).toEqual({ name: 'Pawsome', internalNote: 'flagged' });
  });

  it("strips fields whose access level is 'none'", () => {
    const result = fieldMask(
      { name: 'Pawsome', companiesHouseNumber: '12345678' },
      { name: 'read', companiesHouseNumber: 'none' }
    );
    expect(result).toEqual({ name: 'Pawsome' });
    expect('companiesHouseNumber' in result).toBe(false);
  });

  it('strips fields entirely absent from the access map (secure by default)', () => {
    const result = fieldMask({ name: 'Pawsome', secretNote: 'shh' }, { name: 'read' });
    expect(result).toEqual({ name: 'Pawsome' });
  });

  it('returns an empty object when every field is masked out', () => {
    const result = fieldMask({ password: 'hash' }, { password: 'none' });
    expect(result).toEqual({});
  });

  it('does not mutate the input payload', () => {
    const payload = { name: 'Pawsome', hidden: 'x' };
    fieldMask(payload, { name: 'read' });
    expect(payload).toEqual({ name: 'Pawsome', hidden: 'x' });
  });

  it('passes through fields at write access (write implies at least read)', () => {
    const result = fieldMask({ email: 'a@b.com' }, { email: 'write' });
    expect(result).toEqual({ email: 'a@b.com' });
  });
});
