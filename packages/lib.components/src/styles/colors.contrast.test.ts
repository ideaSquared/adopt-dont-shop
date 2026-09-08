import { describe, expect, it } from 'vitest';
import { brand, warmCream, white } from './colors';
import { lightTheme, normalTheme } from './theme';

/**
 * ADS-1326: axe-core's Playwright smoke gate (e2e/tests/a11y/axe-smoke.spec.ts)
 * caught two text/background token pairs failing WCAG AA (4.5:1) on the
 * `normal` theme's warm-cream body, despite passing on plain white — a real
 * regression these two color tokens (text.tertiary, colors.primaryActive as
 * used by PublicAuthLayout's switchLink) had no coverage against before.
 *
 * These are plain WCAG 2.x relative-luminance / contrast-ratio calculations
 * (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance) — small and
 * self-contained here rather than a new shared export, since nothing else
 * in the codebase needs a general-purpose contrast checker yet.
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const [rs, gs, bs] = [r, g, b]
    .map(c => c / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const contrastRatio = (hexA: string, hexB: string): number => {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
};

const AA_NORMAL_TEXT = 4.5;

describe('text.tertiary contrast against each theme body (ADS-1326)', () => {
  it('meets AA on the light theme (white body)', () => {
    expect(contrastRatio(lightTheme.text.tertiary, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on the normal theme (warm-cream body) — this is what axe caught failing', () => {
    expect(contrastRatio(normalTheme.text.tertiary, warmCream)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT
    );
  });
});

describe('colors.primaryActive contrast against each theme body (ADS-1326)', () => {
  it('meets AA on white (PublicAuthLayout switchLink, light theme)', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (PublicAuthLayout switchLink, normal theme) — this is what axe caught failing for primaryHover', () => {
    expect(contrastRatio(brand.primaryActive, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
