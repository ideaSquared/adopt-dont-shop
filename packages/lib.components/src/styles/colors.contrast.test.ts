import { describe, expect, it } from 'vitest';
import { brand, warmCream, white } from './colors';
import { darkTheme, lightTheme, normalTheme } from './theme';

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
 * with secondaryActive). It then caught two more on the login page itself:
 * lib.auth's LoginForm forgotPasswordLink (an inline `#667eea`, ~3.66:1 /
 * ~3.43:1) and apps/client's LoginPage signupPrompt link (colors.primary,
 * the same problem as LoginForm backLink above) — both fixed the same way.
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

  it('meets AA on white (LoginForm forgotPasswordLink, light theme) — the inline #667eea measured ~3.66:1 here', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (LoginForm forgotPasswordLink, normal theme) — this is what axe caught failing for #667eea', () => {
    expect(contrastRatio(brand.primaryActive, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on white (LoginPage signupPrompt link, light theme) — colors.primary measured ~3.67:1 here', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (LoginPage signupPrompt link, normal theme) — this is what axe caught failing for colors.primary on /login', () => {
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

describe('Button primary variant: white text on colors.primary in every state', () => {
  // The primary variant renders white text (text.inverse) on colors.primary
  // at rest, primaryHover on hover and primaryActive when pressed.
  it('meets AA at rest — colors.primary #F43F5E measured ~3.67:1 here', () => {
    expect(contrastRatio(brand.primary, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on hover', () => {
    expect(contrastRatio(brand.primaryHover, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA when pressed', () => {
    expect(contrastRatio(brand.primaryActive, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('CookieBanner policy link: colors.primaryHover on the banner body', () => {
  // packages/lib.legal's CookieBanner policyLink paints colors.primaryHover
  // on background.body. #E11D48 measured ~4.40:1 on warm-cream.
  it('meets AA on white (light theme)', () => {
    expect(contrastRatio(brand.primaryHover, white)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it('meets AA on warm-cream (normal theme)', () => {
    expect(contrastRatio(brand.primaryHover, warmCream)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('dark theme primary colours', () => {
  // The dark theme's text.inverse is dark, so the primary button there puts
  // dark text on colors.primary, and primary-coloured links sit on a
  // near-black body. The light-theme rose measured ~3.98:1 as a button and
  // primaryActive ~2.84:1 as link text.
  const { colors, text, background } = darkTheme;

  it.each([
    ['primary', colors.primary],
    ['primaryHover', colors.primaryHover],
    ['primaryActive', colors.primaryActive],
  ])('button text meets AA on colors.%s', (_name, fill) => {
    expect(contrastRatio(text.inverse, fill)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each([
    ['primary', colors.primary],
    ['primaryHover', colors.primaryHover],
    ['primaryActive', colors.primaryActive],
  ])('colors.%s meets AA as text on the body', (_name, ink) => {
    expect(contrastRatio(ink, background.body)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});

describe('dark theme primary pairings used by components', () => {
  // Strong primary tokens sit on the subtle ones (chips, badges, chat
  // bubbles, select options). The dark theme swaps the whole family so these
  // pairs keep working — the light-theme subtle tints under light dark-theme
  // roses measured as low as 1:1.
  const { colors } = darkTheme;

  it.each([
    [
      'primaryActive on primaryBgSubtle (SelectInput chip)',
      colors.primaryActive,
      colors.primaryBgSubtle,
    ],
    [
      'primaryTextEmphasis on primaryBgSubtle (Badge, Stepper)',
      colors.primaryTextEmphasis,
      colors.primaryBgSubtle,
    ],
    [
      'primaryBgSubtle on primaryTextEmphasis (Badge hover)',
      colors.primaryBgSubtle,
      colors.primaryTextEmphasis,
    ],
    ['primaryBgSubtle on primaryHover (chat message)', colors.primaryBgSubtle, colors.primaryHover],
    [
      'primaryHover on primaryBorderSubtle (SelectInput option hover)',
      colors.primaryHover,
      colors.primaryBorderSubtle,
    ],
  ])('%s meets AA', (_pair, ink, paper) => {
    expect(contrastRatio(ink, paper)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
