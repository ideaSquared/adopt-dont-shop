import { describe, expect, it } from 'vitest';

import { highContrastPalette } from './highContrastPalette';

// ADS-137: Compute the WCAG relative-luminance contrast ratio between two
// sRGB hex colours. Implementation follows the formulas in
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance.
const channelLuminance = (channel: number): number => {
  const v = channel / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hex: string): number => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
};

const contrastRatio = (foreground: string, background: string): number => {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const [lighter, darker] = fg > bg ? [fg, bg] : [bg, fg];
  return (lighter + 0.05) / (darker + 0.05);
};

describe('highContrastPalette WCAG contrast ratios', () => {
  const background = highContrastPalette.surface.primary;

  // Acceptance criteria from ADS-137: normal text >= 7:1, large/UI >= 4.5:1.
  // The palette aims for >= 7:1 across all visible foregrounds.
  const normalTextTokens: Array<[string, string]> = [
    ['foreground.primary', highContrastPalette.foreground.primary],
    ['foreground.secondary', highContrastPalette.foreground.secondary],
    ['foreground.tertiary', highContrastPalette.foreground.tertiary],
    ['foreground.quaternary', highContrastPalette.foreground.quaternary],
    ['foreground.disabled', highContrastPalette.foreground.disabled],
    ['foreground.link', highContrastPalette.foreground.link],
    ['foreground.linkHover', highContrastPalette.foreground.linkHover],
    ['semantic.success', highContrastPalette.semantic.success],
    ['semantic.error', highContrastPalette.semantic.error],
    ['semantic.warning', highContrastPalette.semantic.warning],
    ['semantic.info', highContrastPalette.semantic.info],
  ];

  it.each(normalTextTokens)('%s meets 7:1 contrast on the primary surface', (_name, color) => {
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(7);
  });

  it('focus border meets the 3:1 non-text contrast minimum', () => {
    // WCAG 2.1 SC 1.4.11 (Non-text Contrast) requires 3:1 for UI component
    // focus indicators against the adjacent surface.
    expect(contrastRatio(highContrastPalette.border.focus, background)).toBeGreaterThanOrEqual(3);
  });

  it('inverse foreground meets 7:1 on the inverse surface', () => {
    expect(
      contrastRatio(highContrastPalette.foreground.inverse, highContrastPalette.surface.inverse)
    ).toBeGreaterThanOrEqual(7);
  });

  // Semantic foreground on its semantic surface — must still meet AA (4.5:1)
  // so badges/alerts in high-contrast mode remain legible.
  const semanticPairings: Array<[string, string, string]> = [
    ['success', highContrastPalette.semantic.success, highContrastPalette.semanticSurface.success],
    ['error', highContrastPalette.semantic.error, highContrastPalette.semanticSurface.error],
    ['warning', highContrastPalette.semantic.warning, highContrastPalette.semanticSurface.warning],
    ['info', highContrastPalette.semantic.info, highContrastPalette.semanticSurface.info],
  ];

  it.each(semanticPairings)(
    '%s foreground meets 4.5:1 contrast on its semantic surface',
    (_name, fg, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  );
});
