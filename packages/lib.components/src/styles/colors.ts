// Bootstrap-style design tokens.
//
// One hex per semantic color (no 50-950 ramps). State variants (hover, active)
// and tint variants (bg-subtle, border-subtle, text-emphasis) are named
// explicitly. Naming follows Bootstrap 5.3 conventions.

export const brand = {
  // Brand
  primary: '#F43F5E',
  primaryHover: '#E11D48',
  primaryActive: '#BE123C',
  primaryBgSubtle: '#FFE4E6',
  primaryBorderSubtle: '#FECDD3',
  primaryTextEmphasis: '#881337',

  secondary: '#14B8A6',
  secondaryHover: '#0D9488',
  secondaryActive: '#0F766E',
  secondaryBgSubtle: '#CCFBF1',
  secondaryBorderSubtle: '#99F6E4',
  secondaryTextEmphasis: '#134E4A',

  // Semantic
  success: '#22C55E',
  successHover: '#16A34A',
  successActive: '#15803D',
  successBgSubtle: '#DCFCE7',
  successBorderSubtle: '#BBF7D0',
  successTextEmphasis: '#14532D',

  danger: '#EF4444',
  dangerHover: '#DC2626',
  dangerActive: '#B91C1C',
  dangerBgSubtle: '#FEE2E2',
  dangerBorderSubtle: '#FECACA',
  dangerTextEmphasis: '#7F1D1D',

  warning: '#F59E0B',
  warningHover: '#D97706',
  warningActive: '#B45309',
  warningBgSubtle: '#FEF3C7',
  warningBorderSubtle: '#FDE68A',
  warningTextEmphasis: '#78350F',

  info: '#3B82F6',
  infoHover: '#2563EB',
  infoActive: '#1D4ED8',
  infoBgSubtle: '#DBEAFE',
  infoBorderSubtle: '#BFDBFE',
  infoTextEmphasis: '#1E3A8A',

  // Logo accents — used by the multi-color paw decoration and brand gradient
  accentPaw: '#FF6B35',
  accentSky: '#38BDF8',
  accentLeaf: '#22C55E',
};

// Bootstrap-style 9-step gray ramp (100 = lightest, 900 = darkest).
// Not inverted in dark mode — the gray scale is constant; surfaces flip via
// semantic tokens (`text.*`, `background.*`, `border.color.*`) instead.
export const gray = {
  100: '#F8FAFC',
  200: '#F1F5F9',
  300: '#E2E8F0',
  400: '#CBD5E1',
  500: '#94A3B8',
  600: '#64748B',
  700: '#475569',
  800: '#334155',
  900: '#1E293B',
};

export const white = '#FFFFFF';
export const black = '#0F172A';

// Warm cream surface used by the `normal` theme — the cosy default surface
// from the design system's logo lockup ("bg-warm").
export const warmCream = '#FAF7F2';
export const warmCreamMuted = '#F2EBDF';

export const brandGradient = 'linear-gradient(135deg, #38BDF8 0%, #F43F5E 55%, #FF6B35 100%)';
export const primaryGradient = 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)';

export const typography = {
  family: {
    sans: [
      'Inter',
      'ui-sans-serif',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      '"Noto Sans"',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
      '"Noto Color Emoji"',
    ].join(', '),
    serif: [
      'Playfair Display',
      'ui-serif',
      'Georgia',
      'Cambria',
      '"Times New Roman"',
      'Times',
      'serif',
    ].join(', '),
    mono: [
      'JetBrains Mono',
      'ui-monospace',
      'SFMono-Regular',
      '"SF Mono"',
      'Consolas',
      '"Liberation Mono"',
      'Menlo',
      'monospace',
    ].join(', '),
    display: ['Fredoka', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'].join(', '),
  },
  weight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

export const animations = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};
