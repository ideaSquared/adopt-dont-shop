import { describe, expect, it } from 'vitest';

import { fieldWriteGuard } from './field-write-guard.js';

describe('fieldWriteGuard', () => {
  it('allows the write when every supplied field has write access', () => {
    const result = fieldWriteGuard(
      { name: 'Pawsome', phone: '0207' },
      { name: 'write', phone: 'write' }
    );
    expect(result).toEqual({ allowed: true });
  });

  it("blocks the write and names the field when a field is only 'read'", () => {
    const result = fieldWriteGuard({ verifiedBy: 'usr-1' }, { verifiedBy: 'read' });
    expect(result).toEqual({ allowed: false, blockedFields: ['verifiedBy'] });
  });

  it("blocks the write when a field is 'none'", () => {
    const result = fieldWriteGuard(
      { companiesHouseNumber: '123' },
      { companiesHouseNumber: 'none' }
    );
    expect(result).toEqual({ allowed: false, blockedFields: ['companiesHouseNumber'] });
  });

  it('blocks the write when a field is entirely absent from the access map', () => {
    const result = fieldWriteGuard({ unknownField: 'x' }, {});
    expect(result).toEqual({ allowed: false, blockedFields: ['unknownField'] });
  });

  it('lists every blocked field, not just the first', () => {
    const result = fieldWriteGuard(
      { name: 'ok', verifiedBy: 'usr-1', status: 'suspended' },
      { name: 'write', verifiedBy: 'read', status: 'none' }
    );
    expect(result).toEqual({ allowed: false, blockedFields: ['verifiedBy', 'status'] });
  });

  it('allows a request with no fields at all (no-op update)', () => {
    const result = fieldWriteGuard({}, { name: 'write' });
    expect(result).toEqual({ allowed: true });
  });
});
