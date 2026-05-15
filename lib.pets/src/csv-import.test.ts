// Behaviour tests for CSV import (ADS-133).
//
// Covers: happy-path round-trip, header auto-mapping, and the three
// failure modes called out in the acceptance criteria — missing
// required field, bad enum value, invalid date.

import { describe, it, expect } from 'vitest';
import { autoMapColumns, parseCsv, validateMappedRow, type ColumnMapping } from './csv-import';

const RESCUE_ID = 'rescue_abc';

describe('parseCsv', () => {
  it('parses a simple comma-separated file with headers', () => {
    const csv = 'name,type\nFido,dog\nWhiskers,cat\n';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['name', 'type']);
    expect(result.rows).toEqual([
      { name: 'Fido', type: 'dog' },
      { name: 'Whiskers', type: 'cat' },
    ]);
  });

  it('handles quoted fields containing commas and escaped quotes', () => {
    const csv = 'name,description\n' + '"Comma, Cat","She said ""hi"""\n';
    const result = parseCsv(csv);
    expect(result.rows[0]).toEqual({
      name: 'Comma, Cat',
      description: 'She said "hi"',
    });
  });

  it('skips fully blank lines', () => {
    const csv = 'name\nFido\n\nWhiskers\n';
    const result = parseCsv(csv);
    expect(result.rows.map((r) => r.name)).toEqual(['Fido', 'Whiskers']);
  });
});

describe('autoMapColumns', () => {
  it('matches headers by exact key, label, and alias regardless of case/punctuation', () => {
    const mapping = autoMapColumns([
      'Name',
      'animal_type',
      'Primary Breed',
      'Sex',
      'Size',
      'Colour',
      'External ID',
    ]);
    expect(mapping).toMatchObject({
      name: 'Name',
      type: 'animal_type',
      breed: 'Primary Breed',
      gender: 'Sex',
      size: 'Size',
      color: 'Colour',
      externalId: 'External ID',
    });
  });

  it('leaves unmatched fields out of the mapping', () => {
    const mapping = autoMapColumns(['name', 'favourite_food']);
    expect(mapping.name).toBe('name');
    expect(Object.keys(mapping)).toEqual(['name']);
  });
});

describe('validateMappedRow', () => {
  const fullRow = {
    name: 'Fido',
    type: 'dog',
    breed: 'Labrador',
    gender: 'male',
    size: 'large',
    color: 'black',
    intake_date: '2026-01-15',
    good_with_children: 'yes',
    age_years: '3',
  };
  const fullMapping: ColumnMapping = {
    name: 'name',
    type: 'type',
    breed: 'breed',
    gender: 'gender',
    size: 'size',
    color: 'color',
    intakeDate: 'intake_date',
    goodWithChildren: 'good_with_children',
    ageYears: 'age_years',
  };

  it('happy path: returns a valid PetCreateData for a complete row', () => {
    const result = validateMappedRow(fullRow, fullMapping, 0, RESCUE_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Fido');
      expect(result.data.type).toBe('dog');
      expect(result.data.goodWithChildren).toBe(true);
      expect(result.data.ageYears).toBe(3);
      expect(result.data.rescueId).toBe(RESCUE_ID);
      expect(result.data.intakeDate).toMatch(/^2026-01-15T/);
    }
  });

  it('failure: missing required field is reported by name', () => {
    const result = validateMappedRow({ ...fullRow, breed: '' }, fullMapping, 4, RESCUE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rowIndex).toBe(4);
      expect(result.errors.some((e) => e.includes('breed') && e.includes('required'))).toBe(true);
    }
  });

  it('failure: bad enum value lists the allowed options', () => {
    const result = validateMappedRow({ ...fullRow, type: 'dragon' }, fullMapping, 7, RESCUE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const enumErr = result.errors.find((e) => e.startsWith('type:'));
      expect(enumErr).toBeDefined();
      expect(enumErr).toContain('dragon');
      expect(enumErr).toContain('dog');
    }
  });

  it('failure: invalid date is reported clearly', () => {
    const result = validateMappedRow(
      { ...fullRow, intake_date: 'not-a-date' },
      fullMapping,
      2,
      RESCUE_ID
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('intakeDate') && e.includes('valid date'))).toBe(
        true
      );
    }
  });

  it('captures external_id when mapped, for idempotency keying', () => {
    const result = validateMappedRow(
      { ...fullRow, ext: 'PET-001' },
      { ...fullMapping, externalId: 'ext' },
      0,
      RESCUE_ID
    );
    expect(result.externalId).toBe('PET-001');
  });
});
