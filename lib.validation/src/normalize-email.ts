/**
 * Unicode-aware email normalization + homograph defense.
 *
 * `normalizeEmail` applies NFKC compatibility normalization, lowercases,
 * and trims surrounding whitespace. NFKC folds compatibility variants
 * (full-width ASCII, ligatures like ﬁ→fi, mathematical letterlikes like
 * ℂ→C) into their canonical form so visually-identical inputs collapse
 * to the same string before the uniqueness check.
 *
 * NFKC alone does NOT collapse cross-script lookalikes — Cyrillic а
 * (U+0430) is a distinct codepoint from Latin a (U+0061) and survives
 * normalization. The homograph attack ("аdmin@example.com" appearing
 * as "admin@example.com") is blocked by `isSingleScriptLocalPart`,
 * which rejects local parts that mix characters from more than one
 * named Unicode script. Digits and ASCII punctuation are "Common" and
 * are always allowed alongside a single script.
 *
 * Both helpers are imported by the canonical Zod EmailSchema and by
 * the User model's beforeValidate hook (defense in depth: callers that
 * bypass the schema still hit the model gate).
 */

export const normalizeEmail = (email: string): string =>
  email.normalize('NFKC').trim().toLowerCase();

/**
 * Codepoint ranges for the named scripts we recognize. A character
 * outside every range and outside Common (digits, ASCII punctuation,
 * whitespace) is classified as 'other' and counts as its own script.
 *
 * Intentionally narrow: we don't try to identify every Unicode script,
 * only enough to detect the practical mixed-script attacks (Latin vs
 * Cyrillic vs Greek, the three most common confusable scripts). Any
 * unknown character pairs as 'other' and triggers the mixed-script
 * rejection the moment it appears alongside Latin/Cyrillic/Greek.
 */
type Script = 'latin' | 'cyrillic' | 'greek' | 'other';

const isCommon = (cp: number): boolean => {
  // ASCII digits, common email punctuation (., -, _, +, @), and whitespace.
  // These appear in every script's email and must not count as their own
  // script for the mixing check.
  if (cp >= 0x30 && cp <= 0x39) return true; // 0-9
  if (cp === 0x2e || cp === 0x2d || cp === 0x5f || cp === 0x2b) return true; // . - _ +
  if (cp === 0x20 || cp === 0x09) return true; // space, tab
  return false;
};

const classify = (cp: number): Script | null => {
  if (isCommon(cp)) {
    return null;
  }
  // Latin: Basic Latin letters + Latin-1 Supplement letters + Latin
  // Extended-A/B. Covers ASCII a-z/A-Z and accented characters like é, ñ, ø.
  if (
    (cp >= 0x41 && cp <= 0x5a) || // A-Z
    (cp >= 0x61 && cp <= 0x7a) || // a-z
    (cp >= 0xc0 && cp <= 0xff && cp !== 0xd7 && cp !== 0xf7) || // Latin-1 Supplement letters
    (cp >= 0x100 && cp <= 0x17f) || // Latin Extended-A
    (cp >= 0x180 && cp <= 0x24f) // Latin Extended-B
  ) {
    return 'latin';
  }
  if (cp >= 0x400 && cp <= 0x4ff) {
    return 'cyrillic';
  }
  if (cp >= 0x370 && cp <= 0x3ff) {
    return 'greek';
  }
  return 'other';
};

/**
 * Returns true if every non-common character in `localPart` belongs to
 * the same Unicode script. Empty / all-common input is considered
 * single-script (degenerate cases are not the attack we're blocking).
 */
export const isSingleScriptLocalPart = (localPart: string): boolean => {
  const scripts = new Set<Script>();
  for (const char of localPart) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    const script = classify(cp);
    if (script === null) continue;
    scripts.add(script);
    if (scripts.size > 1) {
      return false;
    }
  }
  return true;
};
