import { describe, expect, it } from 'vitest';

import {
  checkMigrationText,
  findContractingOperations,
  findEnclosingBraceSpan,
  findMatchingParen,
  hasBackcompatMarker,
  MIGRATION_FILE_PATTERN,
} from './check-migration-backcompat.mjs';

describe('findMatchingParen', () => {
  it('finds the matching close paren, skipping nested parens', () => {
    const text = "pgm.addColumn('t', { fn: foo(1, 2) })";
    const open = text.indexOf('(');
    expect(findMatchingParen(text, open)).toBe(text.length - 1);
  });
});

describe('findEnclosingBraceSpan', () => {
  it('returns the innermost object literal around a position', () => {
    const text = '{ col1: { a: 1 }, col2: { notNull: true } }';
    const pos = text.indexOf('notNull');
    const [start, end] = findEnclosingBraceSpan(text, pos);
    expect(text.slice(start, end + 1)).toBe('{ notNull: true }');
  });
});

describe('hasBackcompatMarker', () => {
  it('accepts an expand-phase-of marker', () => {
    expect(hasBackcompatMarker('// backcompat: expand-phase-of ADS-1234\n')).toBe(true);
  });

  it('accepts a contract-approved marker', () => {
    expect(hasBackcompatMarker('// backcompat: contract-approved ADS-42\n')).toBe(true);
  });

  it('rejects a marker missing the ticket number', () => {
    expect(hasBackcompatMarker('// backcompat: contract-approved\n')).toBe(false);
  });

  it('rejects text with no marker at all', () => {
    expect(hasBackcompatMarker('// just a normal comment\n')).toBe(false);
  });
});

describe('findContractingOperations', () => {
  it('finds nothing in a plain createTable migration, even with NOT NULL columns', () => {
    const text = `
      export const up = async (pgm) => {
        pgm.createTable('things', {
          thing_id: { type: 'uuid', primaryKey: true },
          name: { type: 'varchar(255)', notNull: true },
        });
      };
    `;
    expect(findContractingOperations(text)).toEqual([]);
  });

  it('flags dropColumn', () => {
    const text = `pgm.dropColumn('things', 'old_col');`;
    const ops = findContractingOperations(text).map(v => v.op);
    expect(ops).toContain('dropColumn');
  });

  it('flags dropColumns', () => {
    const text = `pgm.dropColumns('things', ['old_col', 'other']);`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('dropColumns');
  });

  it('flags dropTable', () => {
    const text = `pgm.dropTable('things');`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('dropTable');
  });

  it('flags renameColumn', () => {
    const text = `pgm.renameColumn('things', 'old_name', 'new_name');`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('renameColumn');
  });

  it('flags renameTable', () => {
    const text = `pgm.renameTable('old_things', 'new_things');`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('renameTable');
  });

  it('flags a NOT NULL addColumn with no default', () => {
    const text = `
      pgm.addColumn('things', {
        favourite_colour: { type: 'varchar(50)', notNull: true },
      });
    `;
    expect(findContractingOperations(text).map(v => v.op)).toContain('not-null-without-default');
  });

  it('does not flag a NOT NULL addColumn that has a default', () => {
    const text = `
      pgm.addColumn('things', {
        favourite_colour: { type: 'varchar(50)', notNull: true, default: 'green' },
      });
    `;
    expect(findContractingOperations(text)).toEqual([]);
  });

  it('does not flag a nullable addColumn', () => {
    const text = `
      pgm.addColumn('things', {
        nickname: { type: 'varchar(50)' },
      });
    `;
    expect(findContractingOperations(text)).toEqual([]);
  });

  it('flags a NOT NULL alterColumn with no default', () => {
    const text = `pgm.alterColumn('things', 'name', { notNull: true });`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('not-null-without-default');
  });

  it('flags each column independently in a multi-column addColumns call', () => {
    const text = `
      pgm.addColumns('things', {
        safe_col: { type: 'text', notNull: true, default: '' },
        unsafe_col: { type: 'text', notNull: true },
      });
    `;
    const violations = findContractingOperations(text).filter(
      v => v.op === 'not-null-without-default'
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].detail).toContain('unsafe_col');
  });

  it('flags a type change in alterColumn as a possible narrowing', () => {
    const text = `pgm.alterColumn('things', 'age', { type: 'smallint' });`;
    expect(findContractingOperations(text).map(v => v.op)).toContain('alterColumn-type-change');
  });

  it('does not flag type on addColumn (new column, not a change)', () => {
    const text = `pgm.addColumn('things', { age: { type: 'integer' } });`;
    expect(findContractingOperations(text)).toEqual([]);
  });
});

describe('checkMigrationText', () => {
  it('is ok when there are no contracting operations', () => {
    const result = checkMigrationText(
      '001_create_things.ts',
      `pgm.createTable('things', { id: { type: 'uuid', primaryKey: true } });`
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('fails on a contracting operation with no marker', () => {
    const result = checkMigrationText('002_drop_old.ts', `pgm.dropColumn('things', 'legacy');`);
    expect(result.ok).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it('passes a contracting operation carrying an expand-phase-of marker', () => {
    const text = `
      // backcompat: expand-phase-of ADS-999
      pgm.dropColumn('things', 'legacy');
    `;
    const result = checkMigrationText('003_drop_staged.ts', text);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(1); // still reported, just not failing
  });

  it('passes a contracting operation carrying a contract-approved marker', () => {
    const text = `
      // backcompat: contract-approved ADS-1001
      pgm.dropTable('legacy_things');
    `;
    expect(checkMigrationText('004_drop_table.ts', text).ok).toBe(true);
  });
});

describe('MIGRATION_FILE_PATTERN', () => {
  it('matches a well-formed numbered migration path', () => {
    expect(MIGRATION_FILE_PATTERN.test('services/pets/src/migrations/012_add_thing.ts')).toBe(true);
  });

  it('rejects the colocated migrations test file', () => {
    expect(MIGRATION_FILE_PATTERN.test('services/pets/src/migrations/migrations.test.ts')).toBe(
      false
    );
  });

  it('rejects a file outside the migrations directory', () => {
    expect(MIGRATION_FILE_PATTERN.test('services/pets/src/grpc/pet-handlers.ts')).toBe(false);
  });
});
