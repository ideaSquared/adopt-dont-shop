import { describe, expect, it } from 'vitest';

/**
 * ADS-1326: axe-core's Playwright smoke gate (e2e/tests/a11y/axe-smoke.spec.ts)
 * caught three text elements in SwipeHero (the client home page's default
 * hero, rendered whenever the `new_hero_design` feature gate is off — e.g.
 * with no Statsig client key configured, as in CI) failing WCAG AA (4.5:1):
 * swipeBadge's gold text, secondaryButton's white text, and primaryButton's
 * white text, all against `heroContainer`'s `#667eea -> #764ba2` gradient
 * background (with a translucent overlay for the first two).
 *
 * These are plain WCAG 2.x relative-luminance / contrast-ratio calculations
 * (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance), checked against
 * BOTH gradient stops since the exact pixel a screen reader user's text
 * sits over depends on layout — small and self-contained here rather than a
 * new shared export, since nothing else in the codebase needs a
 * general-purpose contrast checker yet.
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

/** Alpha-blends a translucent foreground color over an opaque background. */
const blendOverSolid = (fgHex: string, alpha: number, bgHex: string): string => {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  const blend = (f: number, b: number) => Math.round(alpha * f + (1 - alpha) * b);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(blend(fr, br))}${toHex(blend(fg, bg))}${toHex(blend(fb, bb))}`;
};

const AA_NORMAL_TEXT = 4.5;
const HERO_CONTAINER_GRADIENT_STOPS = ['#667eea', '#764ba2'] as const;
const PRIMARY_BUTTON_GRADIENT_STOPS = ['#c2185b', '#880e4f'] as const;

describe('SwipeHero text contrast against heroContainer gradient (ADS-1326)', () => {
  it.each(HERO_CONTAINER_GRADIENT_STOPS)('swipeBadge gold text clears AA over %s', stop => {
    const bg = blendOverSolid('#000000', 0.35, stop);
    expect(contrastRatio('#ffd700', bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each(HERO_CONTAINER_GRADIENT_STOPS)('secondaryButton white text clears AA over %s', stop => {
    const bg = blendOverSolid('#000000', 0.35, stop);
    expect(contrastRatio('#ffffff', bg)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe("SwipeHero's primaryButton text contrast against its own gradient (ADS-1326)", () => {
  it.each(PRIMARY_BUTTON_GRADIENT_STOPS)('white text clears AA over %s', stop => {
    expect(contrastRatio('#ffffff', stop)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
