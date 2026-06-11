import { normalizeEmail, isSingleScriptLocalPart } from './normalize-email';

describe('normalizeEmail', () => {
  it('lowercases ASCII', () => {
    expect(normalizeEmail('Foo@Example.COM')).toBe('foo@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  foo@example.com  ')).toBe('foo@example.com');
  });

  it('folds full-width ASCII to half-width via NFKC', () => {
    // 'ｆｏｏ＠ｂａｒ．ｃｏｍ' — full-width latin letters and @ and .
    const fullWidth = 'ｆｏｏ＠ｂａｒ．ｃｏｍ';
    expect(normalizeEmail(fullWidth)).toBe('foo@bar.com');
  });

  it('folds the ﬁ ligature to fi via NFKC', () => {
    // U+FB01 (ﬁ) decomposes to f + i under NFKC. Built from a codepoint
    // so source-file editors can't accidentally re-render the ligature.
    const input = `of${String.fromCodePoint(0xfb01)}ce@example.com`;
    expect(normalizeEmail(input)).toBe('office@example.com');
  });

  it('preserves Cyrillic codepoints — NFKC does NOT fold Cyrillic а into Latin a', () => {
    // Cyrillic а (U+0430) is distinct from Latin a (U+0061) after NFKC.
    // Mixed-script detection is what blocks the homograph attack;
    // normalization alone leaves the Cyrillic char untouched.
    const cyrillicA = 'аdmin@example.com';
    const result = normalizeEmail(cyrillicA);
    expect(result.startsWith('а')).toBe(true);
    expect(result.startsWith('a')).toBe(false);
  });
});

describe('isSingleScriptLocalPart', () => {
  it('accepts pure ASCII / Latin', () => {
    expect(isSingleScriptLocalPart('admin')).toBe(true);
    expect(isSingleScriptLocalPart('john.doe+filter')).toBe(true);
  });

  it('accepts accented Latin (é, ñ, ø)', () => {
    expect(isSingleScriptLocalPart('rené')).toBe(true);
    expect(isSingleScriptLocalPart('jürgen')).toBe(true);
  });

  it('accepts pure Cyrillic', () => {
    expect(isSingleScriptLocalPart('админ')).toBe(true); // 'админ'
  });

  it('accepts pure Greek', () => {
    expect(isSingleScriptLocalPart('αβγ')).toBe(true); // 'αβγ'
  });

  it('rejects Latin mixed with Cyrillic (the homograph attack)', () => {
    // 'аdmin' — Cyrillic а (U+0430) + Latin dmin
    expect(isSingleScriptLocalPart('аdmin')).toBe(false);
  });

  it('rejects Latin mixed with Greek', () => {
    // 'admin' with a Greek alpha pretending to be 'a'
    expect(isSingleScriptLocalPart('αdmin')).toBe(false);
  });

  it('treats digits and common email punctuation as script-neutral', () => {
    expect(isSingleScriptLocalPart('user.123+foo_bar-baz')).toBe(true);
  });

  it('accepts an empty / all-common local part (degenerate, not the attack we block)', () => {
    expect(isSingleScriptLocalPart('')).toBe(true);
    expect(isSingleScriptLocalPart('123')).toBe(true);
  });
});
