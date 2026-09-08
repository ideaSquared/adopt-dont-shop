import { describe, expect, it } from 'vitest';
import { brand, warmCream, white } from './colors';
import { lightTheme, normalTheme } from './theme';

/**
 * ADS-1326: axe-core's Playwright smoke gate (e2e/tests/a11y/axe-smoke.spec.ts)
 * caught text/background token pairs failing WCAG AA (4.5:1) on the `normal`
 * theme's warm-cream body (text.tertiary), and colors.primary failing
 * outright on both white and cream (packages/lib.auth's LoginForm backLink)
 * — real regressions these tokens had no coverage against before.
 * colors.primaryActive is the fix for both that usage and apps/client's
 * PublicAuthLayout switchLink, which had the same colors.primary /
 * primaryHover under-contrast problem. The same gate later caught the
 * Button component's `outline` variant (same primaryHover problem, this
 * time on the client home page's "View All Pets" button) and `secondary`
 * variant (colors.secondary against white text measured ~2.49:1, fixed
 * with secondaryActive).
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
  // colors.primaryActive is the same token value for every consumer, so
  // these two assertions cover both: apps/client's PublicAuthLayout
  // switchLink (previously colors.primaryHover) and packages/lib.auth's
  // LoginForm backLink (previously colors.primary) — kept as separate `it`s
  // per consumer so a future regression names the right UI element.
  it('meets AA on white (PublicAuthLayout switchLink, light theme)', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (PublicAuthLayout switchLink, normal theme) — this is what axe caught failing for primaryHover', () => {
    expect(contrastRatio(brand.primaryActive, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on white (LoginForm backLink, light theme) — colors.primary measured ~3.67:1 here', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (LoginForm backLink, normal theme) — colors.primary measured ~3.44:1 here', () => {
    expect(contrastRatio(brand.primaryActive, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on white (Button outline variant, light theme) — colors.primaryHover measured ~4.70:1 here', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (Button outline variant, normal theme) — this is what axe caught failing for primaryHover on the client home page', () => {
    expect(contrastRatio(brand.primaryActive, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('Button secondary variant: colors.secondaryActive against white text (ADS-1326)', () => {
  // The secondary variant's default (rest) state renders white text
  // (text.inverse) directly on the variant's background color — unlike the
  // text-on-page-body pairs above, so it's tested against the token itself
  // rather than a theme body.
  it('meets AA with white button text — colors.secondary measured ~2.49:1 here, the violation axe caught on the home page "Get Started" button', () => {
    expect(contrastRatio(brand.secondaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
