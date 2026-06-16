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

  it('strips a UTF-8 BOM from the start of the file', () => {
    const csv = '﻿name,type\nFido,dog\n';
    const result = parseCsv(csv);
    expect(result.headers).toEqual(['name', 'type']);
    expect(result.rows[0]).toEqual({ name: 'Fido', type: 'dog' });
  });

  it('preserves newlines embedded inside quoted fields', () => {
    const csv = 'name,bio\n"Fido","line one\nline two"';
    const result = parseCsv(csv);
    expect(result.rows[0].bio).toBe('line one\nline two');
  });

  it('parses the final row when there is no trailing newline', () => {
    const csv = 'name,type\nFido,dog';
    const result = parseCsv(csv);
    expect(result.rows).toEqual([{ name: 'Fido', type: 'dog' }]);
  });

  it('returns empty headers and rows for empty input', () => {
    const result = parseCsv('');
    expect(result).toEqual({ headers: [], rows: [] });
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

  it('parses falsey booleans (no/0) to false and rejects unrecognised booleans', () => {
    const passes = validateMappedRow(
      { ...fullRow, good_with_children: 'no' },
      fullMapping,
      0,
      RESCUE_ID
    );
    expect(passes.ok).toBe(true);
    if (passes.ok) {
      expect(passes.data.goodWithChildren).toBe(false);
    }

    const fails = validateMappedRow(
      { ...fullRow, good_with_children: 'maybe' },
      fullMapping,
      1,
      RESCUE_ID
    );
    expect(fails.ok).toBe(false);
    if (!fails.ok) {
      expect(fails.errors.some((e) => e.includes('valid boolean'))).toBe(true);
    }
  });

  it('reports a non-integer age value', () => {
    const result = validateMappedRow({ ...fullRow, age_years: 'three' }, fullMapping, 0, RESCUE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('valid integer'))).toBe(true);
    }
  });

  it('surfaces schema-level errors when a field-handled value still fails PetCreateDataSchema', () => {
    // adoptionFee is string-handled (so it passes per-field parsing) but the
    // schema rejects non-numeric fee strings, exercising the final safeParse branch.
    const result = validateMappedRow(
      { ...fullRow, fee: '£150' },
      { ...fullMapping, adoptionFee: 'fee' },
      9,
      RESCUE_ID
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rowIndex).toBe(9);
      expect(result.errors.some((e) => e.includes('adoptionFee'))).toBe(true);
    }
  });

  it('ignores optional unmapped fields without error', () => {
    const minimalMapping: ColumnMapping = {
      name: 'name',
      type: 'type',
      breed: 'breed',
      gender: 'gender',
      size: 'size',
      color: 'color',
    };
    const result = validateMappedRow(fullRow, minimalMapping, 0, RESCUE_ID);
    expect(result.ok).toBe(true);
  });

  it('treats a blank external_id cell as null', () => {
    const result = validateMappedRow(
      { ...fullRow, ext: '   ' },
      { ...fullMapping, externalId: 'ext' },
      0,
      RESCUE_ID
    );
    expect(result.externalId).toBeNull();
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
