import { describe, expect, it } from 'vitest';
import { sampleCatalog } from '../test-support.js';
import {
  buildEnumShortNames,
  cellOf,
  enumPrefix,
  findRows,
  formatDuration,
  formatTimeLeft,
  formatTimestamp,
  headerLabel,
  renderTable,
  renderValue,
  shortEnumName,
  truncate,
  type FormatContext,
} from './format.js';
import { createTheme, stripAnsi } from './theme.js';

const theme = createTheme({ color: false, unicode: true });
const ctx = (columns = 100): FormatContext => ({
  theme,
  enums: buildEnumShortNames(sampleCatalog),
  columns,
  timeZone: 'UTC',
});
const text = (lines: readonly string[]) => stripAnsi(lines.join('\n'));
const ID = '0b1c2d3e-0000-4000-8000-000000000001';

describe('timestamps', () => {
  it('formats en-GB like "12 Oct 2026, 14:03"', () => {
    expect(formatTimestamp('2026-10-12T14:03:00.000Z', 'UTC')).toBe('12 Oct 2026, 14:03');
    expect(formatTimestamp('2026-09-01T09:05:00Z', 'UTC')).toBe('1 Sep 2026, 09:05');
  });

  it('applies the time zone', () => {
    expect(formatTimestamp('2026-07-01T23:30:00Z', 'Europe/London')).toBe('2 Jul 2026, 00:30');
  });

  it('returns the input when it is not a date', () => {
    expect(formatTimestamp('nope')).toBe('nope');
  });

  it('describes time left', () => {
    const now = Date.parse('2026-10-12T14:00:00Z');
    expect(formatTimeLeft('2026-10-12T21:54:30Z', now)).toBe('7h 54m');
    expect(formatTimeLeft('2026-10-12T14:14:30Z', now)).toBe('14 min');
    expect(formatTimeLeft('2026-10-12T14:00:30Z', now)).toBe('under a minute');
    expect(formatTimeLeft('2026-10-12T13:00:00Z', now)).toBe('expired');
  });

  it('formats durations', () => {
    expect(formatDuration(42.4)).toBe('42ms');
    expect(formatDuration(1520)).toBe('1.5s');
  });
});

describe('enum short names', () => {
  it('strips the enum prefix and lowercases', () => {
    const values = ['PET_STATUS_UNSPECIFIED', 'PET_STATUS_ADOPTED'];
    expect(shortEnumName('a.b.PetStatus', values, 'PET_STATUS_ADOPTED')).toBe('adopted');
  });

  it('falls back to the longest shared prefix when the name does not match', () => {
    const values = ['KIND_DOG', 'KIND_CAT'];
    expect(enumPrefix('a.b.Species', values)).toBe('KIND_');
  });

  it('keeps single-value enums whole', () => {
    expect(enumPrefix('a.b.Lonely', ['ONLY_ONE'])).toBe('');
  });

  it('indexes every enum value in a catalog', () => {
    expect(buildEnumShortNames(sampleCatalog).get('PET_STATUS_ADOPTED')).toBe('adopted');
  });
});

describe('cellOf', () => {
  it('renders the hidden marker', () => {
    expect(cellOf({ $hidden: true }, ctx())).toEqual({ text: '‹hidden›', tone: 'hidden' });
  });

  it('classifies ids, timestamps, enums, booleans and blanks', () => {
    expect(cellOf(ID, ctx()).tone).toBe('id');
    expect(cellOf('2026-10-12T14:03:00Z', ctx()).text).toBe('12 Oct 2026, 14:03');
    expect(cellOf('PET_STATUS_ADOPTED', ctx())).toEqual({ text: 'adopted', tone: 'enum' });
    expect(cellOf('SOME_UNKNOWN_VALUE', ctx()).text).toBe('some_unknown_value');
    expect(cellOf(true, ctx()).text).toBe('yes');
    expect(cellOf(false, ctx()).text).toBe('no');
    expect(cellOf(null, ctx()).text).toBe('-');
    expect(cellOf(7, ctx()).text).toBe('7');
  });

  it('summarises arrays', () => {
    expect(cellOf(['a', 'b'], ctx()).text).toBe('a, b');
    expect(cellOf([], ctx()).text).toBe('-');
    expect(cellOf([{ a: 1 }], ctx()).text).toBe('[1 items]');
    expect(cellOf({ a: 1 }, ctx()).text).toBe('{…}');
  });
});

describe('truncate', () => {
  it('adds an ellipsis only when needed', () => {
    expect(truncate('abcdef', 6)).toBe('abcdef');
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abcdef', 1)).toBe('a');
  });
});

describe('key/value blocks', () => {
  it('aligns keys and formats values', () => {
    const out = text(
      renderValue(
        { petId: ID, name: 'Biscuit', createdAt: '2026-10-12T14:03:00Z', ok: true },
        ctx()
      )
    );
    expect(out).toContain(`petId      ${ID}`);
    expect(out).toContain('name       Biscuit');
    expect(out).toContain('createdAt  12 Oct 2026, 14:03');
    expect(out).toContain('ok         yes');
  });

  it('indents nested objects and shows hidden markers', () => {
    const out = text(renderValue({ pet: { name: 'Biscuit', email: { $hidden: true } } }, ctx()));
    expect(out).toBe(['  pet', '    name   Biscuit', '    email  ‹hidden›'].join('\n'));
  });

  it('puts arrays of objects in a table under a counted heading', () => {
    const out = text(renderValue({ pets: [{ name: 'A' }, { name: 'B' }], total: 2 }, ctx()));
    expect(out).toContain('pets (2)');
    expect(out).toContain('NAME');
    expect(out).toMatch(/total {2}2/);
  });

  it('indents continuation lines of multi-line strings', () => {
    const out = text(renderValue({ note: 'one\ntwo' }, ctx()));
    expect(out).toBe('  note  one\n        two');
  });

  it('stops recursing at the depth limit', () => {
    const deep = { a: { a: { a: { a: { a: { a: { a: { a: 1 } } } } } } } };
    expect(text(renderValue(deep, ctx()))).toContain('{…}');
  });

  it('renders a bare scalar', () => {
    expect(text(renderValue('hello', ctx()))).toBe('  hello');
  });
});

describe('tables', () => {
  const rows = [
    { petId: ID, name: 'Biscuit', status: 'PET_STATUS_AVAILABLE', age: 6, notes: 'x'.repeat(80) },
    { petId: ID, name: 'Marmalade', status: 'PET_STATUS_ADOPTED', age: 11, notes: 'y' },
  ];

  it('puts id columns first, then name/status, with readable headers', () => {
    const [header] = renderTable(rows, ctx(200));
    expect(
      stripAnsi(header ?? '')
        .trim()
        .split(/\s{2,}/)
    ).toEqual(['PET ID', 'NAME', 'STATUS', 'AGE', 'NOTES']);
  });

  it('truncates cells to the terminal width and says how many columns were dropped', () => {
    const lines = renderTable(rows, ctx(60));
    const widest = Math.max(...lines.map(l => stripAnsi(l).length));
    expect(widest).toBeLessThanOrEqual(60);
    expect(text(lines)).toMatch(/\+\d more columns? \(use --output json\)/);
  });

  it('keeps full ids when the terminal is wide enough', () => {
    expect(text(renderTable(rows, ctx(120)))).toContain(ID);
  });

  it('shrinks the widest columns rather than overflowing', () => {
    const wide = [{ name: 'n'.repeat(60), status: 's'.repeat(60) }];
    const lines = renderTable(wide, ctx(50));
    expect(Math.max(...lines.map(l => stripAnsi(l).length))).toBeLessThanOrEqual(50);
    expect(text(lines)).toContain('…');
  });

  it('skips columns that are empty everywhere', () => {
    const out = text(renderTable([{ name: 'A', gone: null }], ctx()));
    expect(out).not.toContain('GONE');
  });

  it('shows hidden markers in cells', () => {
    expect(text(renderTable([{ name: 'A', email: { $hidden: true } }], ctx()))).toContain(
      '‹hidden›'
    );
  });

  it('labels headers by splitting camelCase', () => {
    expect(headerLabel('createdAt')).toBe('CREATED AT');
  });

  it('finds the first array of objects in a response', () => {
    expect(findRows({ total: 1, pets: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(findRows({ a: 1 })).toBeUndefined();
    expect(findRows('x')).toBeUndefined();
  });
});
